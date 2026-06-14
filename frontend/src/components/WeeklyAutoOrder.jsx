import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ShoppingCart, Brain, CheckCircle, X, Sparkles, TrendingUp, Minus, Plus, RefreshCw } from 'lucide-react';
import { useCartStore, useAuthStore } from '../store';

/**
 * "Order for Me" — Fully Autonomous Weekly Shopping
 * AI builds a full week's grocery cart automatically based on preferences.
 * Shows as a notification banner + expandable card.
 * Learns from past behavior: removes items user didn't finish, adds frequent buys.
 */

const WEEKLY_CART_TEMPLATE = [
  { _id: 'wk1', name: 'Whole Milk 1 Gallon', brand: 'Organic Valley', price: 5.49, qty: 1, category: 'groceries', reason: 'Buy every week', learned: false, deliveryETA: '10 mins' },
  { _id: 'wk2', name: 'Sourdough Bread Loaf', brand: "Dave's Killer", price: 6.29, qty: 1, category: 'groceries', reason: 'Weekly staple', learned: false, deliveryETA: '10 mins' },
  { _id: 'wk3', name: 'Large Eggs 12pk', brand: 'Happy Eggs', price: 4.79, qty: 1, category: 'groceries', reason: 'Ordered 8 of last 10 weeks', learned: false, deliveryETA: '10 mins' },
  { _id: 'wk4', name: 'Organic Bananas 2lb', brand: 'Fresh', price: 1.99, qty: 2, category: 'groceries', reason: 'High consumption rate detected', learned: true, deliveryETA: '15 mins' },
  { _id: 'wk5', name: 'Starbucks Pike Place Coffee', brand: 'Starbucks', price: 9.97, qty: 1, category: 'pantry', reason: 'Runs out every 3 weeks', learned: true, deliveryETA: '25 mins' },
  { _id: 'wk6', name: 'Greek Yogurt 32oz', brand: 'Chobani', price: 5.29, qty: 2, category: 'groceries', reason: '2x per week usage pattern', learned: true, deliveryETA: '15 mins' },
  { _id: 'wk7', name: 'Barilla Spaghetti Pasta', brand: 'Barilla', price: 1.49, qty: 2, category: 'groceries', reason: 'Dinner staple — twice a week', learned: false, deliveryETA: '20 mins' },
  { _id: 'wk8', name: "Rao's Marinara Sauce", brand: "Rao's", price: 7.99, qty: 1, category: 'groceries', reason: 'Pairs with pasta orders', learned: true, deliveryETA: '20 mins' },
  { _id: 'wk9', name: 'Bounty Paper Towels 6pk', brand: 'Bounty', price: 8.49, qty: 1, category: 'household', reason: 'Depletion predicted this week', learned: true, deliveryETA: '25 mins' },
  { _id: 'wk10', name: 'Dawn Dish Soap', brand: 'Dawn', price: 3.97, qty: 1, category: 'cleaning', reason: '70% depleted per restock tracker', learned: true, deliveryETA: '25 mins' },
];

const REMOVED_ITEMS = [
  { name: 'Baby Spinach 5oz', reason: "You didn't finish it last 2 weeks" },
  { name: 'Almond Milk 64oz', reason: "Expired unused last order" },
];

export default function WeeklyAutoOrder({ show, onClose }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(WEEKLY_CART_TEMPLATE.map(i => ({ ...i, included: true })));
  const [confirmed, setConfirmed] = useState(false);
  const replaceCart = useCartStore(s => s.replaceCart);

  const includedItems = items.filter(i => i.included);
  const weeklyTotal = includedItems.reduce((s, i) => s + i.price * i.qty, 0);

  const toggleItem = (id) => setItems(prev => prev.map(i => i._id === id ? { ...i, included: !i.included } : i));
  const updateQty = (id, delta) => setItems(prev => prev.map(i => i._id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));

  const handleConfirm = () => {
    replaceCart(includedItems.map(i => ({ ...i, quantity: i.qty, rankReason: '📅 Weekly auto-order' })), 'Weekly AI Shopping — auto-built');
    setConfirmed(true);
    setTimeout(() => { onClose(); navigate('/checkout'); }, 1500);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 p-5 border-b bg-gradient-to-r from-amazon-orange to-amber-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h2 className="font-bold text-lg">Your Weekly Groceries Are Ready</h2>
                <p className="text-sm opacity-90">AI-built based on your habits · Every Monday</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white"><X size={20} /></button>
          </div>
        </div>

        {confirmed ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle size={64} className="text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">Order Confirmed!</h3>
            <p className="text-sm text-slate-500 mt-2">Redirecting to checkout...</p>
          </div>
        ) : (
          <>
            {/* AI Learning Banner */}
            <div className="shrink-0 px-5 py-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
              <Brain size={14} className="text-purple-600" />
              <p className="text-xs text-purple-700">
                <strong>AI learned this week:</strong> Removed {REMOVED_ITEMS.length} items you didn't use. Added 2 items based on depletion prediction.
              </p>
            </div>

            {/* Removed items info */}
            {REMOVED_ITEMS.length > 0 && (
              <div className="shrink-0 px-5 py-2 bg-slate-50 border-b">
                <p className="text-xs text-slate-500 font-medium mb-1">🚫 Removed this week:</p>
                {REMOVED_ITEMS.map((item, i) => (
                  <p key={i} className="text-xs text-slate-400">• {item.name} — {item.reason}</p>
                ))}
              </div>
            )}

            {/* Items list */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item._id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${item.included ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
                    <input type="checkbox" checked={item.included} onChange={() => toggleItem(item._id)} className="h-4 w-4 rounded accent-amazon-orange shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{item.brand}</span>
                        {item.learned && <span className="text-[9px] bg-purple-100 text-purple-700 rounded px-1 py-0.5 font-semibold">🧠 AI learned</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.reason}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateQty(item._id, -1)} className="rounded border p-0.5 hover:bg-slate-100"><Minus size={10} /></button>
                      <span className="text-xs font-medium w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item._id, 1)} className="rounded border p-0.5 hover:bg-slate-100"><Plus size={10} /></button>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-14 text-right shrink-0">${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">{includedItems.length} items · Weekly budget</p>
                  <p className="text-2xl font-bold text-slate-900">${weeklyTotal.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-600 font-medium">🟢 Within your budget</p>
                  <p className="text-xs text-slate-400">Free express delivery</p>
                </div>
              </div>
              <button onClick={handleConfirm} className="w-full rounded-2xl bg-amazon-orange text-white font-bold py-3.5 text-base hover:bg-amazon-orange-dark transition flex items-center justify-center gap-2 shadow-md">
                <ShoppingCart size={18} /> Confirm Weekly Order — ${weeklyTotal.toFixed(2)}
              </button>
              <button onClick={onClose} className="w-full text-center text-sm text-slate-500 hover:text-slate-700">Edit preferences or skip this week</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
