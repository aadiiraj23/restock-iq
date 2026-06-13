import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShoppingCart } from 'lucide-react';
import { useCartStore, useAuthStore } from '../store';
import './CartPage.css';

export default function CartPage() {
  const { items, removeItem, updateQty, clearCart } = useCartStore();
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const savings = items.reduce((sum, i) => sum + ((i.originalPrice || i.price) - i.price) * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="cart-page container">
        <div className="empty-cart">
          <ShoppingCart size={64} />
          <h2>Your cart is empty</h2>
          <p>Add items from the AI Shopping Agent or browse our store</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/agent" className="btn btn-primary btn-lg">AI Shopping Agent</Link>
            <Link to="/shop" className="btn btn-outline btn-lg">Browse Store</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page container">
      <div className="cart-header">
        <h1><ShoppingBag size={24} /> Shopping Cart</h1>
        <button className="btn btn-outline btn-sm" onClick={clearCart}>Clear Cart</button>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {items.map(item => (
            <div key={item._id} className="cart-item card">
              <img src={item.image} alt={item.name} className="cart-item-img" />
              <div className="cart-item-info">
                <h4>{item.name}</h4>
                <p className="cart-item-brand">{item.brand} · {item.size}</p>
                {item.deliveryETA && (
                  <p className="cart-item-eta">Delivery: {item.deliveryETA}</p>
                )}
              </div>
              <div className="cart-item-actions">
                <div className="qty-control">
                  <button onClick={() => updateQty(item._id, item.quantity - 1)}><Minus size={14} /></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQty(item._id, item.quantity + 1)}><Plus size={14} /></button>
                </div>
                <div className="cart-item-price">
                  <span className="item-total">${(item.price * item.quantity).toFixed(2)}</span>
                  {item.originalPrice && (
                    <span className="item-original">${(item.originalPrice * item.quantity).toFixed(2)}</span>
                  )}
                </div>
                <button className="remove-btn" onClick={() => removeItem(item._id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="cart-summary card">
          <h3>Order Summary</h3>
          <div className="summary-rows">
            <div className="summary-row">
              <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span>${total.toFixed(2)}</span>
            </div>
            {savings > 0 && (
              <div className="summary-row savings">
                <span>Your Savings</span>
                <span>-${savings.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Delivery</span>
              <span className="free-delivery">FREE</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {user ? (
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => navigate('/checkout')}>
              Proceed to Checkout <ArrowRight size={16} />
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              Sign in to Checkout
            </Link>
          )}

          <p className="cart-note">Express delivery available on most items</p>
        </div>
      </div>
    </div>
  );
}
