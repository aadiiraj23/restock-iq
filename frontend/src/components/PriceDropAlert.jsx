import { useEffect, useState, useRef } from 'react';
import { Zap, X, ShoppingCart, TrendingDown } from 'lucide-react';
import { useCartStore } from '../store';

/**
 * Live Price Drop Alert — AI monitors prices in background.
 * A toast pops up when a price drops on a product the user has viewed or has in cart.
 * Simulated with setTimeout for hackathon demo.
 */

const PRICE_DROP_PRODUCTS = [
  { _id: 'pd1', name: 'Colgate Total Toothpaste', brand: 'Colgate', oldPrice: 4.99, newPrice: 3.72, image: null, category: 'personal_care', deliveryETA: '15 mins' },
  { _id: 'pd2', name: 'Tide Liquid Detergent', brand: 'Tide', oldPrice: 12.97, newPrice: 9.99, image: null, category: 'cleaning', deliveryETA: '25 mins' },
  { _id: 'pd3', name: 'Doritos Nacho Cheese', brand: 'Doritos', oldPrice: 4.29, newPrice: 2.99, image: null, category: 'snacks', deliveryETA: '15 mins' },
  { _id: 'pd4', name: 'Head & Shoulders Shampoo', brand: 'Head & Shoulders', oldPrice: 6.97, newPrice: 4.99, image: null, category: 'personal_care', deliveryETA: '20 mins' },
  { _id: 'pd5', name: 'Starbucks Pike Place Coffee', brand: 'Starbucks', oldPrice: 9.97, newPrice: 7.49, image: null, category: 'pantry', deliveryETA: '25 mins' },
  { _id: 'pd6', name: 'Nature Valley Granola Bars', brand: 'Nature Valley', oldPrice: 4.97, newPrice: 3.49, image: null, category: 'snacks', deliveryETA: '20 mins' },
];

export default function PriceDropAlert() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const addItem = useCartStore(s => s.addItem);
  const timerRef = useRef(null);
  const indexRef = useRef(0);

  useEffect(() => {
    // First alert after 30 seconds, then every 45 seconds
    const scheduleNext = (delay) => {
      timerRef.current = setTimeout(() => {
        const product = PRICE_DROP_PRODUCTS[indexRef.current % PRICE_DROP_PRODUCTS.length];
        indexRef.current++;

        setAlerts(prev => {
          if (prev.length >= 2) return prev; // Max 2 alerts at once
          return [...prev, { ...product, id: `${product._id}-${Date.now()}`, timestamp: Date.now() }];
        });

        scheduleNext(45000); // Next one in 45s
      }, delay);
    };

    scheduleNext(30000); // First one at 30s

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(prev => prev.filter(a => Date.now() - a.timestamp < 15000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAdd = (alert) => {
    addItem({ _id: alert._id, name: alert.name, brand: alert.brand, price: alert.newPrice, image: alert.image, category: alert.category, deliveryETA: alert.deliveryETA, rankReason: '💰 Price drop!' });
    setAlerts(prev => prev.filter(a => a.id !== alert.id));
    setDismissed(prev => new Set([...prev, alert._id]));
  };

  const handleDismiss = (alertId) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 space-y-3 max-w-sm">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className="bg-white border border-emerald-200 rounded-2xl shadow-xl p-4 animate-[slide-up_0.3s_ease-out] flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <TrendingDown size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                <Zap size={13} className="text-amazon-orange" /> Price just dropped!
              </p>
              <p className="text-sm text-slate-700 mt-0.5 font-medium truncate">{alert.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-400 line-through">${alert.oldPrice.toFixed(2)}</span>
                <span className="text-base font-bold text-emerald-600">${alert.newPrice.toFixed(2)}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-bold">
                  -{Math.round(((alert.oldPrice - alert.newPrice) / alert.oldPrice) * 100)}%
                </span>
              </div>
            </div>
            <button onClick={() => handleDismiss(alert.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X size={16} />
            </button>
          </div>
          <button
            onClick={() => handleAdd(alert)}
            className="w-full rounded-xl bg-amazon-orange text-white text-sm font-bold py-2.5 hover:bg-amazon-orange-dark transition flex items-center justify-center gap-2"
          >
            <ShoppingCart size={15} /> Add to Cart — Save ${(alert.oldPrice - alert.newPrice).toFixed(2)}
          </button>
        </div>
      ))}
    </div>
  );
}
