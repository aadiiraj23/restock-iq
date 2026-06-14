import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Package, TrendingUp, Pause, Play, Trash2, ChevronLeft, ChevronRight, BarChart3, Clock, RefreshCw } from 'lucide-react';
import { subscriptions as subApi } from '../api';
import toast from 'react-hot-toast';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [expenses, setExpenses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview | calendar | expenses
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [subsRes, calRes, expRes] = await Promise.all([
        subApi.getAll(),
        subApi.getCalendar(),
        subApi.getExpenses()
      ]);
      setSubs(subsRes.data);
      setCalendarEvents(calRes.data);
      setExpenses(expRes.data);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePauseResume(sub) {
    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    try {
      await subApi.update(sub._id, { status: newStatus });
      toast.success(newStatus === 'paused' ? 'Subscription paused' : 'Subscription resumed');
      loadData();
    } catch { toast.error('Failed to update'); }
  }

  async function handleCancel(sub) {
    if (!confirm(`Cancel subscription for ${sub.productName}?`)) return;
    try {
      await subApi.cancel(sub._id);
      toast.success('Subscription cancelled');
      loadData();
    } catch { toast.error('Failed to cancel'); }
  }

  // Calendar helpers
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  function getEventsForDay(day) {
    const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEvents.filter(e => e.date.startsWith(dateStr));
  }

  const activeSubs = subs.filter(s => s.status === 'active');
  const pausedSubs = subs.filter(s => s.status === 'paused');

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <RefreshCw size={32} className="animate-spin mx-auto text-amazon-orange mb-3" />
        <p className="text-gray-600">Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amazon-navy flex items-center gap-2">
            <RefreshCw size={24} className="text-amazon-orange" />
            My Subscriptions
          </h1>
          <p className="text-sm text-gray-600 mt-1">Manage your weekly & monthly product subscriptions</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            {activeSubs.length} Active
          </span>
          {pausedSubs.length > 0 && (
            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
              {pausedSubs.length} Paused
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: Package },
          { id: 'calendar', label: 'Calendar', icon: Calendar },
          { id: 'expenses', label: 'Expenses', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-amazon-navy shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Overview Tab ═══ */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-amazon-navy">{activeSubs.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Monthly Cost</p>
              <p className="text-2xl font-bold text-amazon-navy">₹{expenses?.projectedMonthly?.toFixed(0) || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Spent</p>
              <p className="text-2xl font-bold text-green-600">₹{expenses?.totalSpent?.toFixed(0) || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Deliveries</p>
              <p className="text-2xl font-bold text-amazon-navy">{subs.reduce((s, sub) => s + sub.deliveriesCompleted, 0)}</p>
            </div>
          </div>

          {/* Subscription List */}
          {subs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No subscriptions yet</h3>
              <p className="text-sm text-gray-400 mb-4">Subscribe to products and never run out of essentials</p>
              <Link to="/" className="amazon-btn-primary px-6 py-2 inline-block">Browse Products</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {subs.map(sub => (
                <div key={sub._id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${sub.status === 'cancelled' ? 'opacity-50' : ''}`}>
                  <img src={sub.productImage} alt={sub.productName} className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-amazon-navy truncate">{sub.productName}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        sub.frequency === 'weekly' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {sub.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                      </span>
                      <span className="text-xs text-gray-500">Qty: {sub.quantity}</span>
                      <span className="text-xs text-gray-500">{sub.deliveriesCompleted} deliveries</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {sub.status === 'active' && `Next delivery: ${new Date(sub.nextDeliveryDate).toLocaleDateString()}`}
                      {sub.status === 'paused' && 'Paused'}
                      {sub.status === 'cancelled' && 'Cancelled'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amazon-navy">₹{(sub.productPrice * sub.quantity).toFixed(0)}</p>
                    <p className="text-xs text-gray-400">per {sub.frequency === 'weekly' ? 'week' : 'month'}</p>
                  </div>
                  {sub.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePauseResume(sub)}
                        className={`p-2 rounded-lg border transition-colors ${
                          sub.status === 'active' ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600'
                        }`}
                        title={sub.status === 'active' ? 'Pause' : 'Resume'}
                      >
                        {sub.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button
                        onClick={() => handleCancel(sub)}
                        className="p-2 rounded-lg border hover:bg-red-50 text-red-500 transition-colors"
                        title="Cancel"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Calendar Tab ═══ */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-xl border p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-amazon-navy">
              {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
            </h2>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for start of month offset */}
            {[...Array(startDay)].map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded-lg" />
            ))}
            {/* Day cells */}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const events = getEventsForDay(day);
              const isToday = new Date().getDate() === day && new Date().getMonth() === month.getMonth() && new Date().getFullYear() === month.getFullYear();

              return (
                <div
                  key={day}
                  className={`h-24 rounded-lg border p-1 overflow-hidden ${
                    isToday ? 'border-amazon-orange bg-orange-50' : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-amazon-orange' : 'text-gray-600'}`}>{day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {events.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate ${
                          ev.type === 'upcoming_delivery'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                        title={`${ev.productName} — ₹${ev.amount?.toFixed(0)}`}
                      >
                        {ev.productBrand || ev.productName?.split(' ')[0]}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <span className="text-[10px] text-gray-400">+{events.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 rounded" /> Upcoming</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded" /> Delivered</span>
          </div>
        </div>
      )}

      {/* ═══ Expenses Tab ═══ */}
      {activeTab === 'expenses' && expenses && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-amazon-orange to-orange-600 rounded-xl p-5 text-white">
              <p className="text-sm opacity-80">Total Spent on Subscriptions</p>
              <p className="text-3xl font-bold mt-1">₹{expenses.totalSpent.toFixed(0)}</p>
              <p className="text-xs opacity-70 mt-2">{subs.reduce((s, sub) => s + sub.deliveriesCompleted, 0)} total deliveries</p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
              <p className="text-sm opacity-80">Projected Monthly</p>
              <p className="text-3xl font-bold mt-1">₹{expenses.projectedMonthly.toFixed(0)}</p>
              <p className="text-xs opacity-70 mt-2">{activeSubs.length} active subscriptions</p>
            </div>
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-5 text-white">
              <p className="text-sm opacity-80">Avg Per Delivery</p>
              <p className="text-3xl font-bold mt-1">
                ₹{subs.reduce((s, sub) => s + sub.deliveriesCompleted, 0) > 0
                  ? (expenses.totalSpent / subs.reduce((s, sub) => s + sub.deliveriesCompleted, 0)).toFixed(0)
                  : 0}
              </p>
              <p className="text-xs opacity-70 mt-2">across all products</p>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-bold text-amazon-navy mb-4 flex items-center gap-2">
              <BarChart3 size={18} /> Spending by Category
            </h3>
            <div className="space-y-3">
              {expenses.categoryBreakdown.map(cat => {
                const percent = expenses.totalSpent > 0 ? (cat.total / expenses.totalSpent) * 100 : 0;
                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-sm w-32 truncate text-gray-700">{cat.category}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amazon-orange to-orange-400 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-amazon-navy w-20 text-right">₹{cat.total.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Timeline */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-bold text-amazon-navy mb-4 flex items-center gap-2">
              <Clock size={18} /> Monthly Expense Timeline
            </h3>
            <div className="space-y-3">
              {expenses.monthlyBreakdown.map(m => (
                <div key={m.month} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-amazon-navy">
                      {MONTH_NAMES[parseInt(m.month.split('-')[1]) - 1]} {m.month.split('-')[0]}
                    </span>
                    <span className="font-bold text-amazon-orange">₹{m.total.toFixed(0)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.items.map((item, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                        {item.productName.split(' ').slice(0, 2).join(' ')} · ₹{item.amount.toFixed(0)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {expenses.monthlyBreakdown.length === 0 && (
                <p className="text-gray-400 text-center py-8">No expense data yet. Subscriptions will show up here after first delivery.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
