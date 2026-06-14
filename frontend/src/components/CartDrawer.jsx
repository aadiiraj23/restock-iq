import { X, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store';

export default function CartDrawer({ open, onClose }) {
  const { items, total, eta, updateQty, removeItem, clearCart } = useCartStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-amazon-navy text-white">
          <h2 className="font-bold flex items-center gap-2"><ShoppingCart size={20} /> Your Cart ({items.length})</h2>
          <button onClick={onClose}><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">Your cart is empty</p>
              <Link to="/ai" onClick={onClose} className="text-sm text-amazon-orange hover:underline font-medium">
                Go to AI Shopping →
              </Link>
            </div>
          ) : (
            <>
              {/* Empty Cart button */}
              <div className="flex justify-end mb-3">
                <button
                  onClick={clearCart}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 rounded px-2 py-1 hover:bg-red-50"
                >
                  <Trash2 size={12} /> Empty Cart
                </button>
              </div>

              {items.map(item => (
                <div key={item._id} className="flex gap-3 py-3 border-b">
                  <div className="w-16 h-16 shrink-0 bg-slate-100 rounded border flex items-center justify-center overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span className="text-2xl">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2 font-medium">{item.name}</p>
                    {item.brand && <p className="text-xs text-gray-500">{item.brand}</p>}
                    <p className="font-bold text-sm mt-1">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQty(item._id, Math.max(1, (item.quantity || 1) - 1))} className="border rounded p-0.5 hover:bg-gray-100"><Minus size={14} /></button>
                      <span className="text-sm w-6 text-center">{item.quantity || 1}</span>
                      <button onClick={() => updateQty(item._id, (item.quantity || 1) + 1)} className="border rounded p-0.5 hover:bg-gray-100"><Plus size={14} /></button>
                      <button onClick={() => removeItem(item._id)} className="text-xs text-red-500 hover:text-red-700 ml-2">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex justify-between mb-1 text-sm">
              <span>Subtotal ({items.reduce((s, i) => s + (i.quantity || 1), 0)} items)</span>
              <span className="font-bold">${total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-amazon-green mb-3">⚡ Express delivery: {eta}</p>
            <Link to="/checkout" onClick={onClose} className="amazon-btn-primary block text-center w-full py-2.5 font-bold">
              Proceed to Checkout
            </Link>
            <Link to="/cart" onClick={onClose} className="block text-center text-xs text-amazon-orange hover:underline mt-2">
              View Full Cart Page →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
