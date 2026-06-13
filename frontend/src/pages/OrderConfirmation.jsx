import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, Truck, Home, RotateCcw } from 'lucide-react';
import { checkout } from '../api';

const STEP_ICONS = [Package, Truck, Home, CheckCircle];

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (id && !id.startsWith('demo')) {
      const poll = () => checkout.getOrderStatus(id).then(r => setOrder(r.data)).catch(() => {});
      poll();
      const interval = setInterval(poll, 5000);
      return () => clearInterval(interval);
    } else {
      setOrder({
        status: 'processing',
        eta: '30 mins',
        trackingSteps: [
          { label: 'Order placed', completed: true },
          { label: 'Packing items', completed: false },
          { label: 'Out for delivery', completed: false },
          { label: 'Delivered', completed: false }
        ]
      });
    }
  }, [id]);

  if (!order) return <div className="text-center py-16">Loading order...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <CheckCircle size={64} className="mx-auto text-amazon-green mb-4" />
        <h1 className="text-2xl font-bold text-amazon-green">Order Placed!</h1>
        <p className="text-gray-600 mt-2">Thank you. Your order #{id?.slice(-8)} is confirmed.</p>
        <p className="text-sm text-amazon-green font-medium mt-1">Estimated delivery: {order.eta}</p>
      </div>

      {/* Tracking */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-bold mb-6">Delivery Progress</h2>
        <div className="space-y-4">
          {(order.trackingSteps || []).map((step, i) => {
            const Icon = STEP_ICONS[i] || Package;
            return (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.completed ? 'bg-amazon-green text-white' : 'bg-gray-100 text-gray-400'}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${step.completed ? 'text-amazon-navy' : 'text-gray-400'}`}>{step.label}</p>
                  {step.time && <p className="text-xs text-gray-500">{new Date(step.time).toLocaleTimeString()}</p>}
                </div>
                {step.completed && <CheckCircle size={16} className="text-amazon-green" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/orders" className="amazon-btn">View Orders</Link>
        <Link to="/ai" className="amazon-btn-primary flex items-center gap-1"><RotateCcw size={14} /> New AI Mission</Link>
        <Link to="/" className="amazon-link text-sm py-2">Continue Shopping</Link>
      </div>
    </div>
  );
}
