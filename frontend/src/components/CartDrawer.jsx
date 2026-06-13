import { X, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store';

export default function CartDrawer({ open, onClose }) {
  const { items, total, eta, updateQty, removeItem } = useCartStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-amazon-navy text-white">
          <h2 className="font-bold flex items-center gap-2"><ShoppingCart size={20} /> Your Cart</h2>
          <button onClick={onClose}><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-12">Your cart is empty</p>
          ) : items.map(item => (
            <div key={item._id} className="flex gap-3 py-3 border-b">
              <img src={item.image} alt="" className="w-16 h-16 object-contain" />
              <div className="flex-1">
                <p className="text-sm line-clamp-2">{item.name}</p>
                <p className="font-bold text-sm mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQty(item._id, Math.max(1, item.quantity - 1))} className="border rounded p-0.5"><Minus size={14} /></button>
                  <span className="text-sm w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item._id, item.quantity + 1)} className="border rounded p-0.5"><Plus size={14} /></button>
                  <button onClick={() => removeItem(item._id)} className="text-xs amazon-link ml-2">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex justify-between mb-1 text-sm"><span>Subtotal ({items.length} items)</span><span className="font-bold">${total.toFixed(2)}</span></div>
            <p className="text-xs text-amazon-green mb-3">Express delivery: {eta}</p>
            <Link to="/checkout" onClick={onClose} className="amazon-btn-primary block text-center w-full py-2.5">
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
