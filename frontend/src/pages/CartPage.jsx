import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, XCircle } from 'lucide-react';
import { useCartStore } from '../store';

export default function CartPage() {
  const { items, total, eta, intentSummary, updateQty, removeItem, clearCart } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
        <p className="text-gray-500 mb-6">Try our AI Shopping Agent to build a cart instantly.</p>
        <Link to="/ai" className="amazon-btn-primary inline-block px-6 py-2.5">Open AI Dashboard</Link>
      </div>
    );
  }

  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Shopping Cart ({itemCount} items)</h1>
            <button
              onClick={clearCart}
              className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
            >
              <XCircle size={14} /> Empty Cart
            </button>
          </div>

          {intentSummary && (
            <div className="bg-amazon-orange/10 border border-amazon-orange/30 rounded-lg px-4 py-2 mb-4 text-sm">
              🤖 AI Mission: <strong>{intentSummary}</strong>
            </div>
          )}

          <div className="bg-white rounded-lg border divide-y">
            {items.map(item => (
              <div key={item._id} className="flex gap-4 p-4">
                <div className="w-24 h-24 shrink-0 bg-slate-100 rounded-lg border flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-3xl">📦</span>'; }} />
                  ) : (
                    <span className="text-3xl">📦</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 line-clamp-2">{item.name}</p>
                  {item.brand && <p className="text-xs text-slate-500 mt-0.5">{item.brand}</p>}
                  <p className="text-xs text-amazon-green mt-1">✓ In Stock · Delivery: {item.deliveryETA || eta}</p>
                  {item.rankReason && <span className="inline-block mt-1 text-[10px] bg-amber-50 text-amber-700 rounded px-1.5 py-0.5">{item.rankReason}</span>}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border rounded">
                      <button onClick={() => updateQty(item._id, Math.max(1, (item.quantity || 1) - 1))} className="px-2 py-1 hover:bg-gray-100"><Minus size={14} /></button>
                      <span className="px-3 text-sm font-medium">{item.quantity || 1}</span>
                      <button onClick={() => updateQty(item._id, (item.quantity || 1) + 1)} className="px-2 py-1 hover:bg-gray-100"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeItem(item._id)} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={14} /> Remove</button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
                  {(item.quantity || 1) > 1 && <p className="text-xs text-gray-500">${(item.price || 0).toFixed(2)} each</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="bg-white border rounded-lg p-5 sticky top-32">
            <Link to="/checkout" className="amazon-btn-primary block text-center w-full py-2.5 mb-4 font-bold">
              Proceed to Checkout
            </Link>
            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between"><span>Subtotal ({itemCount} items)</span><span className="font-medium">${total.toFixed(2)}</span></div>
              <div className="flex justify-between text-amazon-green"><span>Express Delivery</span><span className="font-medium">FREE</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-3 mt-2"><span>Order Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">⚡ Estimated delivery: <strong>{eta}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
