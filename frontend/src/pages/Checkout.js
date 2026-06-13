import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, Clock, Shield, CheckCircle } from 'lucide-react';
import { prepareCheckout, buildCart } from '../api';
import { useCartStore, useAuthStore } from '../store';
import toast from 'react-hot-toast';
import './Checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    street: user?.addresses?.[0]?.street || '123 Main Street',
    city: user?.addresses?.[0]?.city || 'Seattle',
    state: user?.addresses?.[0]?.state || 'WA',
    zip: user?.addresses?.[0]?.zip || '98101'
  });
  const [deliverySlot, setDeliverySlot] = useState('express');
  const [paymentMethod, setPaymentMethod] = useState('card');

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      // Build cart on server first
      const cartRes = await buildCart({
        productIds: items.map(i => i._id),
        source: 'manual',
        intentSummary: 'Manual checkout'
      });

      // Now checkout
      const res = await prepareCheckout({
        cartId: cartRes.data._id,
        address,
        deliverySlot,
        paymentMethod
      });

      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order/${res.data.orderId}`);
    } catch (err) {
      toast.error('Checkout failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="checkout-page container">
      <h1>Checkout</h1>

      <div className="checkout-layout">
        <div className="checkout-forms">
          {/* Delivery Address */}
          <div className="checkout-section card">
            <h3><MapPin size={18} /> Delivery Address</h3>
            <div className="form-grid">
              <div className="form-group full">
                <label>Street Address</label>
                <input value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} />
              </div>
              <div className="form-group">
                <label>City</label>
                <input value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
              </div>
              <div className="form-group">
                <label>State</label>
                <input value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} />
              </div>
              <div className="form-group">
                <label>ZIP Code</label>
                <input value={address.zip} onChange={e => setAddress({ ...address, zip: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Delivery Slot */}
          <div className="checkout-section card">
            <h3><Clock size={18} /> Delivery Slot</h3>
            <div className="slot-options">
              {[
                { id: 'express', label: 'Express', desc: '10-30 minutes', badge: 'Fastest' },
                { id: 'today', label: 'Today', desc: 'Within 2 hours', badge: '' },
                { id: 'scheduled', label: 'Tomorrow', desc: 'Morning 9-12 AM', badge: '' }
              ].map(slot => (
                <label key={slot.id} className={`slot-option ${deliverySlot === slot.id ? 'active' : ''}`}>
                  <input type="radio" name="slot" checked={deliverySlot === slot.id} onChange={() => setDeliverySlot(slot.id)} />
                  <div>
                    <strong>{slot.label}</strong>
                    <span>{slot.desc}</span>
                  </div>
                  {slot.badge && <span className="badge badge-success">{slot.badge}</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="checkout-section card">
            <h3><CreditCard size={18} /> Payment Method</h3>
            <div className="payment-options">
              {[
                { id: 'card', label: 'Credit/Debit Card', desc: '**** **** **** 4242' },
                { id: 'upi', label: 'UPI', desc: 'Pay via UPI' },
                { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when delivered' }
              ].map(pm => (
                <label key={pm.id} className={`payment-option ${paymentMethod === pm.id ? 'active' : ''}`}>
                  <input type="radio" name="payment" checked={paymentMethod === pm.id} onChange={() => setPaymentMethod(pm.id)} />
                  <div>
                    <strong>{pm.label}</strong>
                    <span>{pm.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="checkout-summary card">
          <h3>Order Summary</h3>
          <div className="checkout-items">
            {items.map(item => (
              <div key={item._id} className="checkout-item">
                <img src={item.image} alt={item.name} />
                <div>
                  <p>{item.name}</p>
                  <span>Qty: {item.quantity}</span>
                </div>
                <span className="checkout-item-price">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="summary-rows">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span className="free-delivery">FREE</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handlePlaceOrder} disabled={loading}>
            {loading ? 'Processing...' : (
              <><CheckCircle size={18} /> Place Order - ${total.toFixed(2)}</>
            )}
          </button>

          <div className="checkout-secure">
            <Shield size={14} />
            <span>Secure checkout powered by 256-bit SSL encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
