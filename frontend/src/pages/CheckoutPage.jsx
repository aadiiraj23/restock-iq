import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { CreditCard, MapPin, Clock, Zap, Sparkles, Plus, Brain, ShoppingBag } from 'lucide-react';
import { useCartStore, useAiCartStore, useRestockStore, useBuyNowStore } from '../store';
import { checkout } from '../api';

// ─── AI pre-checkout suggestions (shown BEFORE placing order) ─────────────────
const PRE_ORDER_SUGGESTIONS = [
  { _id: 'sug1', name: 'Starbucks Pike Place Coffee 12oz', brand: 'Starbucks', price: 9.97, emoji: '☕', reason: 'You usually buy coffee with grocery orders', deliveryETA: '25 mins' },
  { _id: 'sug2', name: 'Organic Bananas 2lb', brand: 'Fresh', price: 1.99, emoji: '🍌', reason: 'Added in 4 of your last 5 orders', deliveryETA: '15 mins' },
  { _id: 'sug3', name: 'Bounty Paper Towels 6pk', brand: 'Bounty', price: 8.49, emoji: '🧻', reason: 'Running low based on usage pattern', deliveryETA: '20 mins' },
  { _id: 'sug4', name: 'Dove Body Wash 22oz', brand: 'Dove', price: 6.97, emoji: '🧴', reason: 'Your bottle is likely running low', deliveryETA: '20 mins' },
  { _id: 'sug5', name: 'Greek Yogurt 32oz', brand: 'Chobani', price: 5.29, emoji: '🥛', reason: 'You buy this every 10 days — due now', deliveryETA: '15 mins' },
  { _id: 'sug6', name: 'Colgate Total Toothpaste', brand: 'Colgate', price: 4.99, emoji: '🪥', reason: 'Restock predicted this week', deliveryETA: '15 mins' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isAiCart = params.get('source') === 'ai';
  const isBuyNow = params.get('source') === 'buynow';

  // Use the correct cart based on source
  const regularCart = useCartStore();
  const aiCart = useAiCartStore();
  const buyNowStore = useBuyNowStore();

  // Build items/total/eta depending on source
  let items, total, eta, intentSummary;
  if (isBuyNow && buyNowStore.item) {
    items = [buyNowStore.item];
    total = buyNowStore.total;
    eta = buyNowStore.eta;
    intentSummary = 'Buy Now — Single Item';
  } else if (isAiCart) {
    items = aiCart.items || [];
    total = aiCart.total || 0;
    eta = aiCart.eta || '25 mins';
    intentSummary = aiCart.intentSummary;
  } else {
    items = regularCart.items || [];
    total = regularCart.total || 0;
    eta = regularCart.eta || '25 mins';
    intentSummary = regularCart.intentSummary;
  }

  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({ street: '410 Terry Ave N', city: 'Seattle', state: 'WA', zip: '98109' });
  const [suggestions, setSuggestions] = useState([]);
  const [addedSuggestions, setAddedSuggestions] = useState(new Set());

  // Pick 2 random suggestions on mount
  useEffect(() => {
    const shuffled = [...PRE_ORDER_SUGGESTIONS].sort(() => Math.random() - 0.5);
    setSuggestions(shuffled.slice(0, 2));
  }, []);

  const handleAddSuggestion = (item) => {
    if (isAiCart) {
      useAiCartStore.getState().addItem(item);
    } else {
      useCartStore.getState().addItem(item);
    }
    setAddedSuggestions(prev => new Set([...prev, item._id]));
  };

  const handleCheckout = async () => {
    setLoading(true);
    const orderItems = items.map(i => ({ productId: i._id, name: i.name, brand: i.brand, quantity: i.quantity, price: i.price || i.unitPrice || 0, image: i.image, deliveryETA: i.deliveryETA, rankReason: i.rankReason }));
    const orderTotal = items.reduce((s, i) => s + ((i.price || i.unitPrice || 0) * (i.quantity || 1)), 0);

    // After successful order, reset restock timers for items that were reordered
    const resetRestockItems = () => {
      const restockStore = useRestockStore.getState();
      items.forEach(cartItem => {
        const id = cartItem._id || cartItem.productId;
        if (id && restockStore.items.some(ri => ri._id === id)) {
          restockStore.reorderItem(id);
        }
      });
    };

    try {
      const { data } = await checkout.prepare({
        cartId: regularCart.cartId,
        items: orderItems,
        address,
        deliverySlot: 'Express - Today',
        paymentMethod: 'card'
      });
      localStorage.setItem('lastOrder', JSON.stringify({ items: orderItems, total: orderTotal, eta, address, placedAt: new Date().toISOString(), source: isAiCart ? 'ai' : isBuyNow ? 'buynow' : 'manual' }));
      resetRestockItems();
      if (isBuyNow) useBuyNowStore.getState().clearBuyNow();
      else if (isAiCart) useAiCartStore.getState().clearAiCart();
      else useCartStore.getState().clearCart();
      navigate(`/order/${data.orderId}`);
    } catch {
      localStorage.setItem('lastOrder', JSON.stringify({ items: orderItems, total: orderTotal, eta, address, placedAt: new Date().toISOString(), source: isAiCart ? 'ai' : isBuyNow ? 'buynow' : 'manual' }));
      resetRestockItems();
      if (isBuyNow) useBuyNowStore.getState().clearBuyNow();
      else if (isAiCart) useAiCartStore.getState().clearAiCart();
      else useCartStore.getState().clearCart();
      navigate(`/order/demo-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingBag size={56} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">This cart is empty. Add items first.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/ai" className="amazon-btn-primary inline-block px-5 py-2">AI Shopping</Link>
          <Link to="/cart" className="amazon-btn inline-block px-5 py-2">View Regular Cart</Link>
        </div>
      </div>
    );
  }

  const itemCount = items.reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Checkout</h1>
        {isAiCart && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amazon-orange px-3 py-1 text-xs font-bold">
            <Sparkles size={12} /> AI Cart
          </span>
        )}
        {isBuyNow && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 px-3 py-1 text-xs font-bold">
            <Zap size={12} /> Buy Now — Single Item
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* AI Intent Summary */}
          {(isAiCart || isBuyNow) && intentSummary && (
            <div className={`border rounded-lg px-4 py-3 flex items-center gap-2 ${isBuyNow ? 'bg-violet-50 border-violet-200' : 'bg-amber-50 border-amber-200'}`}>
              <Brain size={16} className={isBuyNow ? 'text-violet-600 shrink-0' : 'text-amazon-orange shrink-0'} />
              <p className="text-sm text-slate-700"><strong>{isBuyNow ? 'Buy Now:' : 'AI Mission:'}</strong> {intentSummary}</p>
            </div>
          )}

          {/* Pre-Order AI Suggestions (BEFORE placing order) */}
          <div className="bg-white border rounded-lg p-5">
            <h2 className="font-bold flex items-center gap-2 mb-3 text-sm">
              <Sparkles size={16} className="text-amazon-orange" /> AI suggests adding (saves a separate delivery)
            </h2>
            <div className="space-y-2">
              {suggestions.map(item => (
                <div key={item._id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <span className="text-2xl shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.reason}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">${item.price.toFixed(2)}</span>
                  {addedSuggestions.has(item._id) ? (
                    <span className="text-xs text-emerald-600 font-semibold shrink-0">✓ Added</span>
                  ) : (
                    <button onClick={() => handleAddSuggestion(item)} className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amazon-orange text-white px-3 py-1.5 text-xs font-bold hover:bg-amazon-orange-dark transition">
                      <Plus size={12} /> Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

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

        {/* Order Summary Sidebar */}
        <div>
          <div className="bg-white border rounded-lg p-5 sticky top-32">
            <h2 className="font-bold mb-4">Order Summary ({itemCount} items)</h2>
            <div className="max-h-64 overflow-auto space-y-1">
              {items.map((i, idx) => (
                <div key={i._id || idx} className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                  <div className="flex-1 min-w-0 mr-2">
                    <span className="truncate block">{i.name}</span>
                    <span className="text-xs text-slate-400">x{i.quantity || 1}</span>
                  </div>
                  <span className="shrink-0 font-medium">${((i.price || i.unitPrice || 0) * (i.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-3 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
              <div className="flex justify-between text-amazon-green"><span>Delivery</span><span>FREE</span></div>
              <div className="flex justify-between font-bold text-xl border-t pt-3 mt-2"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <button onClick={handleCheckout} disabled={loading} className="amazon-btn-primary w-full mt-4 py-3 text-base font-bold">
              {loading ? 'Placing order...' : 'Place your order'}
            </button>
            <p className="text-xs text-center text-slate-400 mt-2">⚡ Arriving in {eta}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
