import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store';

export default function CartPage() {
  const { items, total, eta, intentSummary, updateQty, removeItem } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your Amazon Now Cart is empty</h1>
        <p className="text-gray-500 mb-6">Try our AI Shopping Agent to build a cart instantly.</p>
        <Link to="/ai" className="amazon-btn-primary inline-block">Open AI Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold mb-4">Shopping Cart</h1>
          {intentSummary && (
            <div className="bg-amazon-orange/10 border border-amazon-orange/30 rounded-lg px-4 py-2 mb-4 text-sm">
              AI Mission: <strong>{intentSummary}</strong>
            </div>
          )}
          <div className="bg-white rounded-lg border divide-y">
            {items.map(item => (
              <div key={item._id} className="flex gap-4 p-4">
                <img src={item.image} alt="" className="w-24 h-24 object-contain" />
                <div className="flex-1">
                  <Link to={`/search?q=${encodeURIComponent(item.name)}`} className="amazon-link text-sm font-medium">{item.name}</Link>
                  <p className="text-xs text-amazon-green mt-1">In Stock · Delivery {item.deliveryETA || eta}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border rounded">
                      <button onClick={() => updateQty(item._id, Math.max(1, item.quantity - 1))} className="px-2 py-1 hover:bg-gray-100"><Minus size={14} /></button>
                      <span className="px-3 text-sm">{item.quantity}</span>
                      <button onClick={() => updateQty(item._id, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-100"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeItem(item._id)} className="text-sm amazon-link flex items-center gap-1"><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                  {item.quantity > 1 && <p className="text-xs text-gray-500">${item.price.toFixed(2)} each</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="bg-white border rounded-lg p-5 sticky top-32">
            <button className="amazon-btn-primary w-full py-2.5 mb-4">
              <Link to="/checkout" className="block">Proceed to checkout</Link>
            </button>
            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between"><span>Subtotal ({items.length} items)</span><span>${total.toFixed(2)}</span></div>
              <div className="flex justify-between text-amazon-green"><span>Express Delivery</span><span>FREE</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Order total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Estimated delivery: {eta}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
