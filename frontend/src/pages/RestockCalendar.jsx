import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingCart, Clock, Sparkles, CalendarDays } from 'lucide-react';
import { useCartStore, useRestockStore } from '../store';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIME_DAY_START = 21;
const PRIME_DAY_END = 27;
const PRIME_DAY_MONTH = 5;

export default function RestockCalendar() {
  const { items } = useRestockStore();
  const addItem = useCartStore(s => s.addItem);
  const [month, setMonth] = useState(new Date());

  const handleReorder = (item) => {
    addItem({ _id: item._id, name: item.productName, brand: item.brand, price: item.price, category: item.category, deliveryETA: '20 mins', rankReason: '📅 Calendar restock' });
  };

  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' });
  const today = new Date();
  const isCurrentMonth = today.getMonth() === monthIdx && today.getFullYear() === year;
  const isPrimeDayMonth = monthIdx === PRIME_DAY_MONTH;

  // Map items to expiry date cells
  const eventsByDay = {};
  items.forEach(item => {
    const expiryDate = new Date(item.predictedExpiryDate);
    if (expiryDate.getMonth() === monthIdx && expiryDate.getFullYear() === year) {
      const d = expiryDate.getDate();
      if (!eventsByDay[d]) eventsByDay[d] = [];
      eventsByDay[d].push(item);
    }
  });

  const thisWeekItems = items.filter(i => i.remainingDays <= 7 && i.remainingDays > 0);
  const primeDayEligible = isPrimeDayMonth ? items.filter(i => i.remainingDays <= 14 + (PRIME_DAY_END - today.getDate())) : [];

  const handleRestockAllDue = () => { thisWeekItems.forEach(handleReorder); };

  const getUrgencyDot = (item) => {
    if (item.remainingDays < 5) return 'bg-red-500';
    if (item.remainingDays <= 14) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getCellStyle = (day) => {
    const events = eventsByDay[day] || [];
    if (events.length === 0) return 'border-slate-200 hover:bg-slate-50';
    if (events.some(e => e.remainingDays < 5)) return 'border-red-300 bg-red-50';
    const dayDate = new Date(year, monthIdx, day);
    const diff = Math.round((dayDate - today) / 86400000);
    if (diff >= 0 && diff <= 7) return 'border-amber-300 bg-amber-50';
    return 'border-emerald-200 bg-emerald-50';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link to="/restock" className="text-sm text-amazon-orange hover:underline flex items-center gap-1 mb-4"><ChevronLeft size={14} /> Back to Dashboard</Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays size={24} className="text-amazon-orange" /> Restock Calendar</h1>
        {thisWeekItems.length > 0 && (
          <button onClick={handleRestockAllDue} className="inline-flex items-center gap-2 rounded-xl bg-amazon-orange px-4 py-2.5 text-sm font-bold text-white hover:bg-amazon-orange-dark shadow">
            <ShoppingCart size={15} /> Restock All Due This Week ({thisWeekItems.length})
          </button>
        )}
      </div>

      {isPrimeDayMonth && (
        <div className="mb-4 rounded-xl bg-gradient-to-r from-amazon-orange to-amber-500 text-white p-4 flex items-center gap-3 shadow-md">
          <Sparkles size={24} />
          <div><p className="font-bold text-lg">🎉 Prime Day Week — June {PRIME_DAY_START}–{PRIME_DAY_END}</p><p className="text-sm opacity-90">{primeDayEligible.length} items due near Prime Day — order early and save 20%!</p></div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonth(new Date(year, monthIdx - 1))} className="rounded-lg border px-3 py-1.5 hover:bg-slate-50"><ChevronLeft size={16} /></button>
          <h2 className="font-bold text-lg">{monthName}</h2>
          <button onClick={() => setMonth(new Date(year, monthIdx + 1))} className="rounded-lg border px-3 py-1.5 hover:bg-slate-50"><ChevronRight size={16} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 mb-2">
          {DAY_NAMES.map(d => <div key={d} className="py-2">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {[...Array(firstDay)].map((_, i) => <div key={`b${i}`} className="min-h-[80px]" />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const events = eventsByDay[day] || [];
            const isToday = isCurrentMonth && day === today.getDate();
            const isPrimeDay = isPrimeDayMonth && day >= PRIME_DAY_START && day <= PRIME_DAY_END;

            return (
              <div key={day} className={`min-h-[80px] border rounded-lg p-1.5 transition ${isToday ? 'ring-2 ring-amazon-orange border-amazon-orange bg-orange-50' : getCellStyle(day)} ${isPrimeDay ? 'ring-1 ring-amber-400' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isToday ? 'text-amazon-orange' : 'text-slate-700'}`}>{day}</span>
                  {isPrimeDay && <span className="text-[8px] bg-amazon-orange text-white rounded px-1">PRIME</span>}
                </div>
                <div className="mt-1 space-y-0.5">
                  {events.slice(0, 3).map((e, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getUrgencyDot(e)}`} />
                      <span className="text-[9px] truncate text-slate-600">{e.productName?.split(' ')[0]}</span>
                    </div>
                  ))}
                  {events.length > 3 && <span className="text-[9px] text-slate-400">+{events.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Critical</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Due this week</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Safe</span>
        </div>
      </div>

      {/* Upcoming List */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={16} className="text-amazon-orange" /> Upcoming Restocks</h3>
        <div className="space-y-2">
          {[...items].sort((a, b) => a.remainingDays - b.remainingDays).map(item => {
            const color = item.remainingDays < 5 ? 'border-red-200 bg-red-50' : item.remainingDays <= 14 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50';
            const nearPrime = isPrimeDayMonth && item.remainingDays <= 14;
            return (
              <div key={item._id} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${color}`}>
                <span className={`w-3 h-3 rounded-full shrink-0 ${getUrgencyDot(item)}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.productName}</p>
                  <p className="text-xs text-slate-500">{new Date(item.predictedExpiryDate).toLocaleDateString()} · {item.remainingDays} day{item.remainingDays !== 1 ? 's' : ''}</p>
                  {nearPrime && <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-amazon-orange/10 text-amazon-orange rounded-full px-2 py-0.5 font-semibold"><Sparkles size={9} /> Prime Day — save 20%!</span>}
                </div>
                <span className="text-sm font-semibold">${item.price?.toFixed(2)}</span>
                <button onClick={() => handleReorder(item)} className="shrink-0 rounded-lg bg-amazon-orange text-white text-xs font-bold px-3 py-1.5 hover:bg-amazon-orange-dark">Reorder</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
