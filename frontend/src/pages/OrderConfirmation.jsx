import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, Truck, Home, RotateCcw, Clock, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import { checkout } from '../api';

const STEP_ICONS = [Package, Truck, Home, CheckCircle];

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (id && !id.startsWith('demo') && !id.startsWith('local')) {
      checkout.getOrderStatus(id)
        .then(r => setOrder(r.data))
        .catch(() => buildFromLocal());
    } else {
      buildFromLocal();
    }
  }, [id]);

  const buildFromLocal = () => {
    // Read from lastOrder snapshot saved at checkout
    let items = [];
    let address = { street: '410 Terry Ave N', city: 'Seattle', state: 'WA', zip: '98109' };
    let eta = '25 mins';
    let placedAt = new Date().toISOString();
    let total = 0;

    try {
      const saved = JSON.parse(localStorage.getItem('lastOrder') || 'null');
      if (saved?.items?.length) {
        items = saved.items.map(i => ({
          name: i.name || 'Product',
          brand: i.brand || '',
          price: i.price || i.unitPrice || 0,
          quantity: i.quantity || 1,
          image: i.image || null,
          deliveryETA: i.deliveryETA || '25 mins',
          rankReason: i.rankReason || null
        }));
        total = saved.total || items.reduce((s, i) => s + i.price * i.quantity, 0);
        if (saved.address) address = saved.address;
        if (saved.eta) eta = saved.eta;
        if (saved.placedAt) placedAt = saved.placedAt;
      } else {
        // Fallback demo
        items = [
          { name: 'Whole Milk 1 Gallon', brand: 'Organic Valley', price: 5.49, quantity: 1, deliveryETA: '10 mins' },
          { name: 'Sourdough Bread', brand: "Dave's Killer", price: 6.29, quantity: 1, deliveryETA: '10 mins' },
          { name: 'Large Eggs 12pk', brand: 'Happy Eggs', price: 4.79, quantity: 1, deliveryETA: '10 mins' },
        ];
        total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      }
    } catch {
      items = [{ name: 'Order items', brand: '', price: 0, quantity: 1, deliveryETA: '25 mins' }];
    }

    const fastest = items.reduce((min, i) => Math.min(min, parseInt(i.deliveryETA) || 25), 60);

    setOrder({
      _id: id,
      status: 'processing',
      eta: eta || `${fastest} mins`,
      total,
      items,
      address,
      paymentMethod: 'Visa ending in 4242',
      placedAt,
      trackingSteps: [
        { label: 'Order placed', completed: true, time: placedAt },
        { label: 'Preparing your items', completed: true, time: new Date(Date.now() + 60000).toISOString() },
        { label: 'Out for delivery', completed: false },
        { label: 'Delivered', completed: false }
      ]
    });
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amazon-orange border-t-transparent" />
      </div>
    );
  }

  const orderTotal = order.total || (order.items || []).reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const itemCount = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* ─── Success Header ──────────────────────────────────────── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
          <CheckCircle size={48} className="text-amazon-green" />
        </div>
        <h1 className="text-2xl font-bold text-amazon-green">Order Confirmed!</h1>
        <p className="text-gray-600 mt-2">Order #{(id || '').slice(-8)} · {new Date(order.placedAt || Date.now()).toLocaleString()}</p>
        <div className="inline-flex items-center gap-1 mt-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 text-sm text-green-700 font-semibold">
          <Clock size={14} /> Arriving in {order.eta || '25 mins'}
        </div>
      </div>

      {/* ─── Delivery Tracking ────────────────────────────────────── */}
      <div className="bg-white border rounded-xl p-6 mb-6">
        <h2 className="font-bold mb-5 flex items-center gap-2 text-lg"><Truck size={20} /> Delivery Progress</h2>
        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
          <div className="space-y-6">
            {(order.trackingSteps || []).map((step, i) => {
              const Icon = STEP_ICONS[i] || Package;
              return (
                <div key={i} className="flex items-center gap-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${step.completed ? 'bg-amazon-green text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${step.completed ? 'text-slate-900' : 'text-gray-400'}`}>{step.label}</p>
                    {step.time && step.completed && <p className="text-xs text-gray-500">{new Date(step.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                  {step.completed && <CheckCircle size={16} className="text-amazon-green shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Order Items (Full Details) ───────────────────────────── */}
      <div className="bg-white border rounded-xl p-6 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2 text-lg"><ShoppingBag size={20} /> Items Ordered ({itemCount})</h2>
        <div className="divide-y">
          {(order.items || []).map((item, i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-lg bg-slate-100 border flex items-center justify-center shrink-0 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.brand && `${item.brand} · `}Qty: {item.quantity || 1}
                  {item.deliveryETA && ` · ETA: ${item.deliveryETA}`}
                </p>
                {item.rankReason && <span className="inline-block mt-1 text-[10px] bg-amber-50 text-amber-700 rounded px-1.5 py-0.5">{item.rankReason}</span>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
                {(item.quantity || 1) > 1 && <p className="text-xs text-gray-500">${(item.price || 0).toFixed(2)} each</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Order total */}
        <div className="border-t mt-4 pt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">Subtotal ({itemCount} items)</span><span>${orderTotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-amazon-green"><span>Express Delivery</span><span>FREE</span></div>
          <div className="flex justify-between font-bold text-xl border-t pt-3 mt-2"><span>Total Paid</span><span>${orderTotal.toFixed(2)}</span></div>
        </div>
      </div>

      {/* ─── Delivery & Payment Details ───────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><MapPin size={16} className="text-slate-500" /> Delivery Address</h3>
          <div className="text-sm text-slate-600 space-y-0.5">
            <p>{order.address?.street || '410 Terry Ave N'}</p>
            <p>{order.address?.city || 'Seattle'}, {order.address?.state || 'WA'} {order.address?.zip || '98109'}</p>
          </div>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><CreditCard size={16} className="text-slate-500" /> Payment</h3>
          <p className="text-sm text-slate-600">{order.paymentMethod || 'Visa ending in 4242'}</p>
          <p className="text-xs text-amazon-green mt-1 font-medium">✓ Payment confirmed</p>
        </div>
      </div>

      {/* ─── Actions ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/orders" className="amazon-btn px-5 py-2">View All Orders</Link>
        <Link to="/ai" className="amazon-btn-primary flex items-center gap-1 px-5 py-2"><RotateCcw size={14} /> New AI Mission</Link>
        <Link to="/" className="text-sm text-amazon-orange hover:underline py-2">Continue Shopping</Link>
      </div>
    </div>
  );
}
