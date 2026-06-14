import { useNavigate } from 'react-router-dom';
import { X, Zap, Clock, CreditCard, MapPin, Package, Shield, ArrowRight } from 'lucide-react';
import { useAuthStore, useBuyNowStore } from '../store';

// ═══════════════════════════════════════════════════════════════════════════════
// BUY NOW OVERLAY — Separate product checkout
// Sets the item in the Buy Now store and navigates to checkout.
// The checkout page handles it as a separate single-item cart.
// Main cart remains untouched.
// ═══════════════════════════════════════════════════════════════════════════════

export default function BuyNowOverlay({ product, onClose }) {
  const navigate = useNavigate();
  const { user, householdProfile } = useAuthStore();
  const setBuyNowItem = useBuyNowStore(s => s.setBuyNowItem);

  const address = householdProfile?.addresses?.[0] || user?.addresses?.[0] || { label: 'Home', street: '123 Main St', city: 'Seattle', state: 'WA', zip: '98101' };
  const eta = product.deliveryETA || '15 mins';
  const total = product.price || 0;

  const handleBuyNow = () => {
    // Set this item in the Buy Now store (separate from main cart)
    setBuyNowItem(product);
    onClose();
    // Navigate to checkout with source=buynow
    navigate('/checkout?source=buynow');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-3xl bg-white shadow-2xl overflow-hidden animate-[slide-up_0.3s_ease-out]">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} />
            <span className="font-bold text-sm">Buy Now — Separate Checkout</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20"><X size={16} /></button>
        </div>

        {/* Product */}
        <div className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-slate-100 border flex items-center justify-center overflow-hidden shrink-0">
              {product.image ? (
                <img src={product.image} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <Package size={24} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{product.name || product.productName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{product.brand} {product.size || product.volume ? `· ${product.size || product.volume}` : ''}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-lg font-bold text-slate-900">${total.toFixed(2)}</p>
              <p className="text-[9px] text-slate-500 flex items-center justify-center gap-0.5 mt-0.5"><CreditCard size={8} /> Price</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-lg font-bold text-emerald-700">{eta}</p>
              <p className="text-[9px] text-emerald-600 flex items-center justify-center gap-0.5 mt-0.5"><Clock size={8} /> ETA</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-sm font-bold text-blue-700 truncate">{address.label || 'Home'}</p>
              <p className="text-[9px] text-blue-500 flex items-center justify-center gap-0.5 mt-0.5"><MapPin size={8} /> Deliver to</p>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 mb-4">
            <span className="flex items-center gap-1"><Shield size={9} /> Secure checkout</span>
            <span>·</span>
            <span>Free delivery</span>
            <span>·</span>
            <span>Main cart untouched</span>
          </div>

          {/* Proceed to Checkout Button */}
          <button
            onClick={handleBuyNow}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
          >
            <Zap size={18} /> Proceed to Checkout — ${total.toFixed(2)} <ArrowRight size={16} />
          </button>

          <p className="text-center text-[10px] text-slate-400 mt-2">
            Separate checkout for this item only · Your cart stays as-is
          </p>
        </div>
      </div>
      <style>{`@keyframes slide-up { 0%{transform:translateY(20px);opacity:0} 100%{transform:translateY(0);opacity:1} }`}</style>
    </div>
  );
}
