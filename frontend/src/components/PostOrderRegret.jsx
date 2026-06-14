import { useEffect, useState, useRef } from 'react';
import { Clock, Plus, X, Coffee, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store';

/**
 * Post-Order Regret Prevention
 * After checkout, shows: "Before we dispatch — you usually buy X with this order. Add it?"
 * 30 second window. One tap adds it. Massive AOV increase.
 */

const REGRET_SUGGESTIONS = [
  { _id: 'rg1', name: 'Starbucks Pike Place Coffee 12oz', brand: 'Starbucks', price: 9.97, reason: 'You usually buy coffee with grocery orders', emoji: '☕', deliveryETA: '25 mins' },
  { _id: 'rg2', name: 'Organic Bananas 2lb', brand: 'Fresh', price: 1.99, reason: 'Added in 4 of your last 5 orders', emoji: '🍌', deliveryETA: '15 mins' },
  { _id: 'rg3', name: 'Bounty Paper Towels 6pk', brand: 'Bounty', price: 8.49, reason: 'Running low based on your usage pattern', emoji: '🧻', deliveryETA: '20 mins' },
  { _id: 'rg4', name: 'Greek Yogurt 32oz', brand: 'Chobani', price: 5.29, reason: 'You buy this every 10 days — due now', emoji: '🥛', deliveryETA: '15 mins' },
  { _id: 'rg5', name: 'Dove Body Wash 22oz', brand: 'Dove', price: 6.97, reason: 'Your bottle should be running low by now', emoji: '🧴', deliveryETA: '20 mins' },
];

export default function PostOrderRegret({ show, onClose }) {
  const [countdown, setCountdown] = useState(30);
  const [added, setAdded] = useState(false);
  const [suggestion] = useState(() => REGRET_SUGGESTIONS[Math.floor(Math.random() * REGRET_SUGGESTIONS.length)]);
  const addItem = useCartStore(s => s.addItem);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    setCountdown(30);
    setAdded(false);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimeout(() => onClose(), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [show, onClose]);

  const handleAdd = () => {
    addItem({ ...suggestion, category: 'groceries', rankReason: '🧠 AI suggested post-order' });
    setAdded(true);
    clearInterval(timerRef.current);
    setTimeout(() => onClose(), 2000);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-[slide-up_0.3s_ease-out]">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <ShoppingBag size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Before we dispatch...</p>
              <p className="text-xs text-slate-500">Saves a separate delivery later</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {added ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-bold text-emerald-700">Added to your order!</p>
            <p className="text-sm text-slate-500 mt-1">Delivering together — no extra charge</p>
          </div>
        ) : (
          <>
            {/* Suggestion */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{suggestion.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{suggestion.name}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{suggestion.reason}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-bold text-lg text-slate-900">${suggestion.price.toFixed(2)}</span>
                    <span className="text-xs text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">Free delivery with order</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Countdown + CTA */}
            <div className="flex items-center gap-2 mb-3 text-center justify-center">
              <Clock size={14} className="text-slate-400" />
              <span className="text-sm text-slate-500">Window closes in <strong className="text-red-600">{countdown}s</strong></span>
            </div>

            <button
              onClick={handleAdd}
              className="w-full rounded-2xl bg-amazon-orange text-white font-bold py-3.5 text-base hover:bg-amazon-orange-dark transition flex items-center justify-center gap-2 shadow-md"
            >
              <Plus size={18} /> Add to This Order — ${suggestion.price.toFixed(2)}
            </button>

            <button onClick={onClose} className="w-full text-center text-sm text-slate-500 hover:text-slate-700 mt-3">
              No thanks, just deliver what I have
            </button>
          </>
        )}

        {/* Progress bar */}
        {!added && (
          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amazon-orange rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 30) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
