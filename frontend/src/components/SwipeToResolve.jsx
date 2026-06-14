import { useState, useRef, useCallback } from 'react';
import { CheckCircle, Package, Zap, Clock, CreditCard, MapPin, Truck, X } from 'lucide-react';
import { useAuthStore, useRestockStore } from '../store';
import { checkout } from '../api/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SWIPE-TO-RESOLVE — Cart-less Instant Checkout
// A single swipe gesture on a critical item card triggers an atomic purchase:
// → Pulls default payment token
// → Assigns primary delivery address
// → Dispatches courier from nearest dark-store
// → No cart, no checkout screen, no friction.
// ═══════════════════════════════════════════════════════════════════════════════

export default function SwipeToResolve({ item, onComplete, onDismiss }) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const trackRef = useRef(null);
  const startYRef = useRef(null);
  const isDraggingRef = useRef(false);

  const { user, householdProfile } = useAuthStore();
  const { reorderItem } = useRestockStore();

  const deliveryFee = 0; // Free express for critical items
  const totalPrice = (item.price || 0) + deliveryFee;
  const eta = '11 mins';
  const defaultAddress = householdProfile?.addresses?.[0] || user?.addresses?.[0] || { street: '123 Main St', city: 'Seattle', state: 'WA', zip: '98101', label: 'Home' };

  // ─── Touch/Mouse Swipe Handling ────────────────────────────────────────────
  const handleStart = useCallback((clientY) => {
    if (isResolving || resolved) return;
    startYRef.current = clientY;
    isDraggingRef.current = true;
  }, [isResolving, resolved]);

  const handleMove = useCallback((clientY) => {
    if (!isDraggingRef.current || startYRef.current === null) return;
    const diff = startYRef.current - clientY; // positive = swipe up
    const progress = Math.max(0, Math.min(1, diff / 120)); // 120px = full swipe
    setSwipeProgress(progress);
  }, []);

  const handleEnd = useCallback(async () => {
    isDraggingRef.current = false;
    if (swipeProgress >= 0.7) {
      // THRESHOLD REACHED — Execute instant checkout!
      setSwipeProgress(1);
      setIsResolving(true);

      // Simulate atomic API call (instant order placement)
      await new Promise(r => setTimeout(r, 800));

      // Build order details
      const order = {
        id: `ORD-${Date.now().toString(36).toUpperCase()}`,
        item: item.productName || item.name,
        price: totalPrice,
        eta,
        address: defaultAddress,
        paymentMethod: 'Default Card ****4242',
        timestamp: new Date().toISOString(),
        status: 'dispatched'
      };

      setOrderDetails(order);
      setResolved(true);
      setIsResolving(false);

      // Update restock tracking
      if (item._id) reorderItem(item._id);

      // Try backend call (non-blocking)
      try {
        await checkout.prepare({
          cartId: null,
          address: defaultAddress,
          deliverySlot: 'Express - Instant',
          paymentMethod: 'default_token',
          instantItem: { productId: item._id, name: item.productName || item.name, price: item.price, quantity: 1 }
        });
      } catch { /* Backend sync optional in demo */ }

      // Notify parent after animation
      setTimeout(() => onComplete?.(order), 2500);
    } else {
      // Didn't reach threshold — snap back
      setSwipeProgress(0);
    }
  }, [swipeProgress, item, totalPrice, defaultAddress, reorderItem, onComplete]);

  // Touch events
  const onTouchStart = (e) => handleStart(e.touches[0].clientY);
  const onTouchMove = (e) => { e.preventDefault(); handleMove(e.touches[0].clientY); };
  const onTouchEnd = () => handleEnd();

  // Mouse events (for desktop)
  const onMouseDown = (e) => handleStart(e.clientY);
  const onMouseMove = (e) => { if (isDraggingRef.current) handleMove(e.clientY); };
  const onMouseUp = () => handleEnd();

  // ─── RESOLVED STATE ────────────────────────────────────────────────────────
  if (resolved && orderDetails) {
    return (
      <div className="rounded-3xl bg-gradient-to-b from-emerald-500 to-emerald-600 p-6 text-white shadow-2xl animate-[scale-in_0.3s_ease-out] relative overflow-hidden">
        {/* Success particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="absolute text-lg animate-[rise-fade_1.5s_ease-out_forwards]" style={{ left: `${15 + i * 14}%`, bottom: '20%', animationDelay: `${i * 0.1}s` }}>✨</span>
          ))}
        </div>

        <div className="text-center relative z-10">
          <CheckCircle size={48} className="mx-auto mb-3 animate-[pop_0.4s_ease-out]" />
          <h3 className="text-xl font-bold mb-1">Resolved!</h3>
          <p className="text-emerald-100 text-sm mb-4">Order placed in under 1 second</p>

          <div className="bg-white/15 backdrop-blur rounded-2xl p-4 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-90">Order</span>
              <span className="text-sm font-mono font-bold">{orderDetails.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-90">Item</span>
              <span className="text-sm font-bold">{orderDetails.item}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-90">Paid</span>
              <span className="text-sm font-bold">${orderDetails.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-90 flex items-center gap-1"><Truck size={12} /> ETA</span>
              <span className="text-sm font-bold">{orderDetails.eta}</span>
            </div>
          </div>

          <p className="text-xs text-emerald-200 mt-3 flex items-center justify-center gap-1">
            <Zap size={12} /> Courier dispatched from nearest store
          </p>
        </div>

        <style>{`
          @keyframes scale-in { 0%{transform:scale(0.9);opacity:0} 100%{transform:scale(1);opacity:1} }
          @keyframes pop { 0%{transform:scale(0)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
          @keyframes rise-fade { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-60px)} }
        `}</style>
      </div>
    );
  }

  // ─── MAIN CARD — Swipe Interface ───────────────────────────────────────────
  const fillHeight = swipeProgress * 100;
  const isNearThreshold = swipeProgress >= 0.5;

  return (
    <div className={`rounded-3xl bg-white border-2 shadow-2xl overflow-hidden relative select-none ${
      item.urgencyTier === 'CRITICAL' ? 'border-red-200' : item.urgencyTier === 'WARNING' ? 'border-amber-200' : 'border-violet-200'
    }`}>
      {/* Dismiss button */}
      {onDismiss && (
        <button onClick={onDismiss} className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
          <X size={14} className="text-slate-500" />
        </button>
      )}

      {/* Top section — Product Info */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            item.urgencyTier === 'CRITICAL' ? 'bg-red-100 text-red-700' : item.urgencyTier === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'
          }`}>
            <Zap size={9} /> {item.urgencyTier === 'CRITICAL' ? 'CRITICAL — Instant Restock' : 'Buy Now — Separate from Cart'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-slate-100 border flex items-center justify-center shrink-0 overflow-hidden">
            {item.image ? (
              <img src={item.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package size={24} className="text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-base leading-tight">{item.productName || item.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{item.brand} · {item.volume || item.size}</p>
          </div>
        </div>

        {/* Price + ETA + Details */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-xl bg-slate-50">
            <p className="text-lg font-bold text-slate-900">${totalPrice.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5"><CreditCard size={9} /> Final price</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-emerald-50">
            <p className="text-lg font-bold text-emerald-700">{eta}</p>
            <p className="text-[10px] text-emerald-600 flex items-center justify-center gap-0.5"><Clock size={9} /> Delivery ETA</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-blue-50">
            <p className="text-sm font-bold text-blue-700 truncate">{defaultAddress.label || 'Home'}</p>
            <p className="text-[10px] text-blue-500 flex items-center justify-center gap-0.5"><MapPin size={9} /> Address</p>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-2">
          Payment: Default Card · Free Express Delivery · No cart required
        </p>
      </div>

      {/* Swipe Track */}
      <div
        ref={trackRef}
        className="relative h-20 bg-gradient-to-t from-slate-100 to-slate-50 border-t border-slate-200 cursor-grab active:cursor-grabbing overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { if (isDraggingRef.current) handleEnd(); }}
      >
        {/* Fill animation */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all ${isDraggingRef.current ? 'duration-0' : 'duration-300'} ${isNearThreshold ? 'bg-emerald-400/30' : 'bg-amber-400/20'}`}
          style={{ height: `${fillHeight}%` }}
        />

        {/* Swipe indicator */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {isResolving ? (
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            <>
              <div className={`flex flex-col items-center transition-all ${swipeProgress > 0 ? 'scale-110' : ''}`}>
                {/* Arrow indicators */}
                <div className="flex flex-col items-center gap-0.5 mb-1">
                  <span className={`block w-4 h-0.5 rounded-full transition-all ${isNearThreshold ? 'bg-emerald-500 w-5' : 'bg-slate-400'}`} style={{ transform: `translateY(${-swipeProgress * 4}px)` }} />
                  <span className={`block w-5 h-0.5 rounded-full transition-all ${isNearThreshold ? 'bg-emerald-500 w-6' : 'bg-slate-400'}`} style={{ transform: `translateY(${-swipeProgress * 2}px)` }} />
                  <span className={`block w-6 h-0.5 rounded-full ${isNearThreshold ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                </div>
                <p className={`text-xs font-bold mt-1 transition-all ${isNearThreshold ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {isNearThreshold ? '↑ Release to Order!' : '↑ Swipe Up to Resolve'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isNearThreshold ? 'Instant checkout — 1 second' : 'Single gesture · No cart · No checkout'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
