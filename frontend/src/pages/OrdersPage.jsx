import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { checkout } from '../api';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    checkout.getOrders().then(r => setOrders(r.data)).catch(() => setOrders([]));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Your Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-lg">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No orders yet</p>
          <Link to="/ai" className="amazon-btn-primary inline-block">Start AI Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <Link key={o._id} to={`/order/${o._id}`} className="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">Order #{o._id.slice(-8)}</p>
                  <p className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  o.fulfillmentStatus === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>{o.fulfillmentStatus}</span>
              </div>
              <p className="text-sm mt-2">{o.items?.length} items · ${o.total?.toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
