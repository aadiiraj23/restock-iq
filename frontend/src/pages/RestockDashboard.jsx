import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, CalendarDays, CheckCircle2, Flame, Loader2, Package, RefreshCw, ShieldAlert, ShoppingCart, Sparkles, Clock, TrendingDown, Plus, X, Home, Zap } from 'lucide-react';
import { useCartStore, useRestockStore, useBuyNowStore } from '../store';
import TamagotchiHomeView from '../components/TamagotchiHomeView';
import SwipeToResolve from '../components/SwipeToResolve';

const URGENCY_COLORS = {
  CRITICAL: { bg: 'bg-red-50', border: 'border-red-300', bar: 'bg-red-500', chip: 'bg-red-100 text-red-700', text: 'text-red-700' },
  WARNING: { bg: 'bg-amber-50', border: 'border-amber-300', bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800', text: 'text-amber-700' },
  SAFE: { bg: 'bg-emerald-50', border: 'border-emerald-300', bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700' }
};

export default function RestockDashboard() {
  const navigate = useNavigate();
  const { items, feedbackItem, addTrackedItem, removeTrackedItem, reorderItem, updateHousehold, householdSize, budget, getMetrics, getAlerts } = useRestockStore();
  const addItem = useCartStore(s => s.addItem);
  const setBuyNowItem = useBuyNowStore(s => s.setBuyNowItem);
  const [feedbackLoading, setFeedbackLoading] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ productName: '', category: '', brand: '', volume: '', price: '' });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'tamagotchi'
  const [swipeResolveItem, setSwipeResolveItem] = useState(null); // item for instant checkout

  const metrics = getMetrics();
  const alerts = getAlerts();
  const sortedItems = [...items].sort((a, b) => a.remainingDays - b.remainingDays);

  const handleFeedback = (itemId, type) => {
    setFeedbackLoading(itemId);
    feedbackItem(itemId, type);
    setTimeout(() => setFeedbackLoading(''), 400);
  };

  const handleReorder = (item) => {
    addItem({ _id: item._id, name: item.productName, brand: item.brand, price: item.price, image: item.image, category: item.category, deliveryETA: '20 mins', rankReason: '🔄 Restock' });
  };

  const handleBuyNow = (item) => {
    setBuyNowItem({ _id: item._id, name: item.productName, brand: item.brand, price: item.price, image: item.image, category: item.category, deliveryETA: '15 mins', size: item.volume });
    navigate('/checkout?source=buynow');
  };

  const handleAddItem = () => {
    if (!newItem.productName) return;
    addTrackedItem({ ...newItem, price: Number(newItem.price) || 0, totalLifespan: 30 });
    setNewItem({ productName: '', category: '', brand: '', volume: '', price: '' });
    setShowAddForm(false);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Critical Alert Banner */}
        {alerts.hasCriticalAlert && (
          <div className="mb-4 rounded-xl bg-red-600 text-white p-4 flex items-center gap-3 shadow-lg animate-glow-pulse animate-fade-in-down">
            <ShieldAlert size={24} className="shrink-0 animate-float" />
            <div className="flex-1">
              <p className="font-bold">⚠️ Low Stock Alert — {alerts.criticalAlertItems.length} item{alerts.criticalAlertItems.length > 1 ? 's' : ''} critically low!</p>
              <p className="text-sm opacity-90">{alerts.criticalAlertItems.join(', ')}</p>
            </div>
            <button onClick={() => items.filter(i => i.remainingDays < 5).forEach(handleReorder)} className="shrink-0 bg-white text-red-600 rounded-lg px-4 py-2 text-sm font-bold hover:bg-red-50">Reorder All</button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2"><Sparkles size={24} className="text-amazon-orange" /> ReStock IQ Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">AI-powered consumption tracking · Household size: {householdSize}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'tamagotchi' : 'grid')} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold transition ${viewMode === 'tamagotchi' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'border bg-white text-slate-600 hover:bg-amber-50'}`}>
              <Home size={14} /> {viewMode === 'tamagotchi' ? 'Living Home ✨' : 'Living Home'}
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center gap-1 rounded-lg bg-amazon-orange text-white px-3 py-2 text-sm font-bold hover:bg-amazon-orange-dark"><Plus size={14} /> Track Item</button>
            <Link to="/restock/calendar" className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"><CalendarDays size={14} /> Calendar</Link>
            <Link to="/restock/analytics" className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"><BarChart3 size={14} /> Analytics</Link>
          </div>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Track a new consumable</h3>
              <button onClick={() => setShowAddForm(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="grid sm:grid-cols-5 gap-2">
              <input value={newItem.productName} onChange={e => setNewItem(p => ({...p, productName: e.target.value}))} placeholder="Product name*" className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
              <input value={newItem.brand} onChange={e => setNewItem(p => ({...p, brand: e.target.value}))} placeholder="Brand" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={newItem.volume} onChange={e => setNewItem(p => ({...p, volume: e.target.value}))} placeholder="Size (200ml)" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={newItem.price} onChange={e => setNewItem(p => ({...p, price: e.target.value}))} placeholder="Price" type="number" className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={handleAddItem} className="mt-2 rounded-lg bg-amazon-orange text-white text-sm font-bold px-4 py-2 hover:bg-amazon-orange-dark">Add to Tracking</button>
          </div>
        )}

        {/* Household Size Control */}
        <div className="mb-4 flex items-center gap-3 bg-white border rounded-xl px-4 py-3">
          <span className="text-sm text-slate-600">Household:</span>
          {[1, 2, 3, 4].map(size => (
            <button key={size} onClick={() => updateHousehold(size)} className={`rounded-full px-3 py-1 text-xs font-bold transition ${householdSize === size ? 'bg-amazon-orange text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {size} {size === 1 ? 'person' : 'people'}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">Changing recalculates all predictions</span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger-children">
          <div className="rounded-2xl bg-white border border-red-200 p-4 text-center shadow-sm hover-lift animate-fade-in-up">
            <p className="text-3xl font-bold text-red-600 number-pop">{metrics.critical}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mt-1">Critical</p>
            <p className="text-[10px] text-slate-400">{'< 5 days left'}</p>
          </div>
          <div className="rounded-2xl bg-white border border-amber-200 p-4 text-center shadow-sm hover-lift animate-fade-in-up">
            <p className="text-3xl font-bold text-amber-600 number-pop">{metrics.warning}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-500 mt-1">Warning</p>
            <p className="text-[10px] text-slate-400">5–14 days left</p>
          </div>
          <div className="rounded-2xl bg-white border border-emerald-200 p-4 text-center shadow-sm hover-lift animate-fade-in-up">
            <p className="text-3xl font-bold text-emerald-600 number-pop">{metrics.safe}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500 mt-1">Safe</p>
            <p className="text-[10px] text-slate-400">{'> 14 days left'}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center shadow-sm hover-lift animate-fade-in-up">
            <p className="text-3xl font-bold text-slate-800 number-pop">{metrics.avgDaysLeft}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-1">Avg. Days Left</p>
            <p className="text-[10px] text-slate-400">Across {metrics.totalTracked} items</p>
          </div>
        </div>

        {/* Product Cards */}
        {viewMode === 'tamagotchi' ? (
          <TamagotchiHomeView />
        ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {sortedItems.map(item => {
            const colors = URGENCY_COLORS[item.urgencyTier] || URGENCY_COLORS.SAFE;
            const isBusy = feedbackLoading === item._id;
            return (
              <div key={item._id} className={`rounded-2xl border ${colors.border} ${colors.bg} p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in-up card-glow`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-white border flex items-center justify-center overflow-hidden shrink-0">
                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <Package size={24} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{item.productName}</p>
                    <p className="text-xs text-slate-500">{item.brand} · {item.volume}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${colors.chip}`}>{item.urgencyTier}</span>
                  </div>
                  <button onClick={() => removeTrackedItem(item._id)} className="text-slate-300 hover:text-red-500"><X size={14} /></button>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{Math.round(item.depletionPercent || 0)}% used</span>
                    <span className={`font-bold ${colors.text}`}>{item.remainingDays} days left</span>
                  </div>
                  <div className="h-3 rounded-full bg-white border overflow-hidden">
                    <div className={`h-full rounded-full ${colors.bar} animate-progress-fill progress-bar-animated`} style={{ width: `${Math.min(100, item.depletionPercent || 0)}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><Clock size={11} /> {new Date(item.purchaseDate).toLocaleDateString()}</span>
                  <span>{Math.round((item.confidence || 0.7) * 100)}% confidence</span>
                </div>

                {/* ML Model Info — only visible in expanded/debug mode */}
                {item.mlMetadata && (
                  <details className="mb-3">
                    <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-amazon-orange">🤖 View AI prediction details</summary>
                    <div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-[10px] text-slate-500 space-y-0.5">
                      <div className="flex justify-between"><span>Model:</span><span className="font-mono">{item.mlMetadata.model}</span></div>
                      <div className="flex justify-between"><span>Season:</span><span>{item.mlMetadata.season} (×{item.mlMetadata.seasonalFactor})</span></div>
                      <div className="flex justify-between"><span>Household scale:</span><span>×{item.mlMetadata.householdScale}</span></div>
                      <div className="flex justify-between"><span>Learned rate:</span><span>{item.mlMetadata.learnedRate}</span></div>
                      <div className="flex justify-between"><span>Feedback loops:</span><span>{item.mlMetadata.feedbackCount}</span></div>
                    </div>
                  </details>
                )}

                {/* Actions */}
                <button onClick={() => handleBuyNow(item)} className={`btn-ripple w-full mb-2 rounded-xl text-white text-xs font-bold py-3 active:scale-95 flex items-center justify-center gap-1.5 shadow-md transition-all duration-200 ${item.urgencyTier === 'CRITICAL' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700'}`}>
                  <Zap size={13} /> {item.urgencyTier === 'CRITICAL' ? 'Buy Now — Urgent' : 'Buy Now — Skip Cart'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleReorder(item)} className="btn-ripple rounded-xl bg-amazon-orange text-white text-xs font-bold py-2.5 hover:bg-amazon-orange-dark hover:shadow-lg active:scale-95 flex items-center justify-center gap-1 transition-all duration-200">
                    <ShoppingCart size={13} /> Add to Cart
                  </button>
                  <button onClick={() => handleFeedback(item._id, 'finished_early')} disabled={isBusy} className="btn-ripple rounded-xl border border-slate-300 bg-white text-xs font-medium py-2.5 hover:bg-red-50 hover:border-red-300 active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50 transition-all duration-200">
                    {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Flame size={13} className="text-red-500" />} Finished Early
                  </button>
                </div>
                <button onClick={() => handleFeedback(item._id, 'still_plenty')} disabled={isBusy} className="btn-ripple w-full mt-2 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-medium py-2 hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 text-emerald-700 flex items-center justify-center gap-1 disabled:opacity-50 transition-all duration-200">
                  <CheckCircle2 size={13} /> Still Have Plenty
                </button>
              </div>
            );
          })}
        </div>
        )}

        {/* Quick Restock Footer */}
        {(metrics.critical + metrics.warning) > 0 && (
          <div className="mt-8 rounded-2xl border bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900">Restock all due items in one click</p>
              <p className="text-sm text-slate-500">{metrics.critical + metrics.warning} items due · ~${alerts.projectedSpend.toFixed(2)}</p>
            </div>
            <button onClick={() => items.filter(i => i.remainingDays <= 14).forEach(handleReorder)} className="inline-flex items-center gap-2 rounded-xl bg-amazon-orange px-6 py-3 text-sm font-bold text-white hover:bg-amazon-orange-dark shadow">
              <ShoppingCart size={16} /> Add All Due to Cart
            </button>
          </div>
        )}
      </div>

      {/* ─── Swipe-to-Resolve Overlay ───────────────────────────────── */}
      {swipeResolveItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSwipeResolveItem(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 mb-4 sm:mb-0">
            <SwipeToResolve
              item={swipeResolveItem}
              onComplete={() => { setSwipeResolveItem(null); }}
              onDismiss={() => setSwipeResolveItem(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
