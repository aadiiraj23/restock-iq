import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, ShoppingBag } from 'lucide-react';
import { checkout } from '../api';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const { data } = await checkout.getOrders();
        if (data?.length) {
          setOrders(data);
        } else {
          loadLocalOrders();
        }
      } catch {
        loadLocalOrders();
      } finally {
        setLoading(false);
      }
    };

    const loadLocalOrders = () => {
      // Build order history from localStorage
      const localOrders = [];
      try {
        const lastOrder = JSON.parse(localStorage.getItem('lastOrder') || 'null');
        if (lastOrder?.items?.length) {
          localOrders.push({
            _id: `local-${Date.parse(lastOrder.placedAt) || Date.now()}`,
            items: lastOrder.items,
            total: lastOrder.total || lastOrder.items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0),
            eta: lastOrder.eta || '25 mins',
            address: lastOrder.address,
            createdAt: lastOrder.placedAt || new Date().toISOString(),
            fulfillmentStatus: 'processing'
          });
        }
      } catch {}
      setOrders(localOrders);
    };

    loadOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-amazon-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Your Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-lg">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No orders yet</p>
          <Link to="/ai" className="amazon-btn-primary inline-block px-6 py-2.5">Start AI Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => {
            const orderTotal = o.total || (o.items || []).reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
            const itemCount = (o.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
            const isDelivered = o.fulfillmentStatus === 'delivered';

            return (
              <Link key={o._id} to={`/order/${o._id}`} className="block bg-white border rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-900">Order #{(o._id || '').slice(-8)}</p>
                    <p className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleDateString()} · {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${isDelivered ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isDelivered ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {o.fulfillmentStatus || 'processing'}
                  </span>
                </div>

                {/* Order items preview */}
                <div className="flex items-center gap-2 mb-3">
                  {(o.items || []).slice(0, 4).map((item, idx) => (
                    <div key={idx} className="w-10 h-10 rounded bg-slate-100 border flex items-center justify-center overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <span className="text-sm">📦</span>
                      )}
                    </div>
                  ))}
                  {(o.items || []).length > 4 && (
                    <span className="text-xs text-slate-500">+{o.items.length - 4} more</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex items-center gap-1">
                    <ShoppingBag size={14} /> {itemCount} items
                  </span>
                  <span className="font-bold text-slate-900">${orderTotal.toFixed(2)}</span>
                </div>

                {/* Item names */}
                <p className="text-xs text-slate-500 mt-2 truncate">
                  {(o.items || []).map(i => i.name).join(', ')}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
