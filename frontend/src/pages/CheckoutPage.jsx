import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, MapPin, Clock, Zap } from 'lucide-react';
import { useCartStore } from '../store';
import { checkout } from '../api';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, eta, cartId } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({ street: '410 Terry Ave N', city: 'Seattle', state: 'WA', zip: '98109' });

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data } = await checkout.prepare({
        cartId,
        address,
        deliverySlot: 'Express - Today',
        paymentMethod: 'card'
      });
      useCartStore.getState().clear();
      navigate(`/order/${data.orderId}`);
    } catch {
      navigate(`/order/demo-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty. Add items first.</p>
        <Link to="/ai" className="amazon-btn-primary inline-block">AI Shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Address */}
          <div className="bg-white border rounded-lg p-5">
            <h2 className="font-bold flex items-center gap-2 mb-4"><MapPin size={18} /> Delivery Address</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} className="border rounded px-3 py-2 text-sm sm:col-span-2" placeholder="Street" />
              <input value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="City" />
              <input value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="State" />
              <input value={address.zip} onChange={e => setAddress({ ...address, zip: e.target.value })} className="border rounded px-3 py-2 text-sm" placeholder="ZIP" />
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white border rounded-lg p-5">
            <h2 className="font-bold flex items-center gap-2 mb-4"><Clock size={18} /> Delivery Speed</h2>
            <label className="flex items-center gap-3 p-3 border-2 border-amazon-orange rounded-lg bg-amazon-orange/5 cursor-pointer">
              <input type="radio" defaultChecked className="accent-amazon-orange" />
              <div className="flex-1">
                <p className="font-bold flex items-center gap-1"><Zap size={14} className="text-amazon-orange" /> Express Delivery</p>
                <p className="text-sm text-gray-600">Get it in {eta}</p>
              </div>
              <span className="text-amazon-green font-bold text-sm">FREE</span>
            </label>
          </div>

          {/* Payment */}
          <div className="bg-white border rounded-lg p-5">
            <h2 className="font-bold flex items-center gap-2 mb-4"><CreditCard size={18} /> Payment Method</h2>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CreditCard size={20} className="text-gray-400" />
              <div>
                <p className="font-medium text-sm">Visa ending in 4242</p>
                <p className="text-xs text-gray-500">Saved payment method</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white border rounded-lg p-5 sticky top-32">
            <h2 className="font-bold mb-4">Order Summary</h2>
            {items.map(i => (
              <div key={i._id} className="flex justify-between text-sm py-1">
                <span className="truncate mr-2">{i.name} x{i.quantity}</span>
                <span>${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
              <div className="flex justify-between text-amazon-green"><span>Delivery</span><span>FREE</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <button onClick={handleCheckout} disabled={loading} className="amazon-btn-primary w-full mt-4 py-3 text-base">
              {loading ? 'Placing order...' : 'Place your order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
