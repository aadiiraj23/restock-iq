import { useState } from 'react';
import { ShoppingCart, X, Sparkles, Heart } from 'lucide-react';
import { useCartStore, useRestockStore } from '../store';

// ═══════════════════════════════════════════════════════════════════════════════
// TAMAGOTCHI HOUSE — The Living Inventory
// Emotional UX: Items become animated characters whose expressions
// shift based on real-time depletion state.
// ═══════════════════════════════════════════════════════════════════════════════

// Category → emoji/avatar character mapping
const CATEGORY_AVATARS = {
  face_wash: { icon: '🧴', name: 'Cleany' },
  toothpaste: { icon: '🪥', name: 'Brushy' },
  shampoo: { icon: '🧴', name: 'Sudsy' },
  dish_soap: { icon: '🫧', name: 'Bubbles' },
  body_lotion: { icon: '🧴', name: 'Silky' },
  protein_powder: { icon: '💪', name: 'Beefy' },
  detergent: { icon: '🫧', name: 'Spinny' },
  default: { icon: '📦', name: 'Boxy' },
};

// Get expression based on depletion state
function getExpression(urgencyTier, depletionPercent) {
  if (urgencyTier === 'CRITICAL') {
    return {
      face: '😵',
      mood: 'exhausted',
      color: 'from-red-100 to-red-200',
      border: 'border-red-300',
      glow: 'shadow-red-200',
      animation: 'animate-[wiggle_0.5s_ease-in-out_infinite]',
      message: 'Feed me! I\'m empty!',
      bubbleColor: 'bg-red-500 text-white',
      particleColor: 'bg-red-400',
    };
  }
  if (urgencyTier === 'WARNING') {
    return {
      face: '😟',
      mood: 'worried',
      color: 'from-amber-50 to-amber-100',
      border: 'border-amber-300',
      glow: 'shadow-amber-100',
      animation: 'animate-[sway_2s_ease-in-out_infinite]',
      message: 'Getting low... restock soon?',
      bubbleColor: 'bg-amber-500 text-white',
      particleColor: 'bg-amber-300',
    };
  }
  // SAFE
  if (depletionPercent < 20) {
    return {
      face: '😄',
      mood: 'thriving',
      color: 'from-emerald-50 to-teal-100',
      border: 'border-emerald-300',
      glow: 'shadow-emerald-100',
      animation: 'animate-[bounce-gentle_2s_ease-in-out_infinite]',
      message: 'Feeling great! Full & happy!',
      bubbleColor: 'bg-emerald-500 text-white',
      particleColor: 'bg-emerald-300',
    };
  }
  return {
    face: '🙂',
    mood: 'content',
    color: 'from-green-50 to-emerald-50',
    border: 'border-green-200',
    glow: 'shadow-green-100',
    animation: 'animate-[float_3s_ease-in-out_infinite]',
    message: 'Doing okay!',
    bubbleColor: 'bg-green-500 text-white',
    particleColor: 'bg-green-200',
  };
}

// Individual Tamagotchi Character
function TamagotchiCharacter({ item, onReorder }) {
  const [tapped, setTapped] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [hearts, setHearts] = useState([]);

  const avatar = CATEGORY_AVATARS[item.category] || CATEGORY_AVATARS.default;
  const expr = getExpression(item.urgencyTier, item.depletionPercent);

  const handleTap = () => {
    setTapped(true);
    setShowBubble(true);

    // Spawn hearts/particles
    const newHearts = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      x: 30 + Math.random() * 40,
      delay: i * 0.15,
    }));
    setHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => setHearts(prev => prev.filter(h => !newHearts.find(n => n.id === h.id))), 1500);

    setTimeout(() => setTapped(false), 600);
    // Keep bubble visible until dismissed
  };

  const handleReorder = (e) => {
    e.stopPropagation();
    onReorder(item);
    setShowBubble(false);
  };

  return (
    <div className="relative flex flex-col items-center" onClick={handleTap}>
      {/* Floating particles */}
      {hearts.map(h => (
        <div
          key={h.id}
          className="absolute pointer-events-none z-20"
          style={{ left: `${h.x}%`, bottom: '60%', animationDelay: `${h.delay}s` }}
        >
          <span className="inline-block text-lg animate-[rise_1.2s_ease-out_forwards] opacity-0">
            {item.urgencyTier === 'CRITICAL' ? '💔' : item.urgencyTier === 'WARNING' ? '⚠️' : '✨'}
          </span>
        </div>
      ))}

      {/* Speech Bubble */}
      {showBubble && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 animate-[pop-in_0.3s_ease-out]">
          <div className={`relative ${expr.bubbleColor} rounded-2xl px-3 py-2 text-xs font-bold whitespace-nowrap shadow-lg`}>
            {item.urgencyTier === 'CRITICAL' ? (
              <button onClick={handleReorder} className="flex items-center gap-1.5 hover:scale-105 transition">
                <ShoppingCart size={12} /> Feed me! (Reorder)
              </button>
            ) : item.urgencyTier === 'WARNING' ? (
              <button onClick={handleReorder} className="flex items-center gap-1.5 hover:scale-105 transition">
                <ShoppingCart size={12} /> {expr.message}
              </button>
            ) : (
              <span className="flex items-center gap-1.5">
                <Heart size={12} /> {expr.message}
              </span>
            )}
            {/* Bubble tail */}
            <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 ${item.urgencyTier === 'CRITICAL' ? 'bg-red-500' : item.urgencyTier === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'} rotate-45 rounded-sm`} />
          </div>
          <button onClick={(e) => { e.stopPropagation(); setShowBubble(false); }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-600 text-white flex items-center justify-center text-[8px] hover:bg-slate-800">
            <X size={8} />
          </button>
        </div>
      )}

      {/* Character Body */}
      <div
        className={`relative cursor-pointer select-none transition-all duration-300 ${tapped ? 'scale-110' : 'hover:scale-105'}`}
      >
        {/* Glow ring for critical items */}
        {item.urgencyTier === 'CRITICAL' && (
          <div className="absolute inset-0 rounded-2xl bg-red-400/20 animate-ping" />
        )}

        <div className={`relative w-20 h-24 rounded-2xl bg-gradient-to-b ${expr.color} border-2 ${expr.border} ${expr.glow} shadow-lg flex flex-col items-center justify-center gap-0.5 ${expr.animation}`}>
          {/* Category icon */}
          <span className="text-2xl leading-none">{avatar.icon}</span>
          {/* Expression face */}
          <span className="text-xl leading-none">{expr.face}</span>
          {/* Depletion bar inside character */}
          <div className="absolute bottom-1.5 left-2 right-2 h-1.5 rounded-full bg-white/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                item.urgencyTier === 'CRITICAL' ? 'bg-red-500' : item.urgencyTier === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${100 - Math.min(100, item.depletionPercent || 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Name Label */}
      <div className="mt-2 text-center max-w-[90px]">
        <p className="text-[10px] font-bold text-slate-700 truncate">{item.productName?.split(' ').slice(0, 2).join(' ')}</p>
        <p className={`text-[9px] font-semibold ${
          item.urgencyTier === 'CRITICAL' ? 'text-red-600' : item.urgencyTier === 'WARNING' ? 'text-amber-600' : 'text-emerald-600'
        }`}>
          {item.remainingDays}d left
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — The Living Home View
// ═══════════════════════════════════════════════════════════════════════════════

export default function TamagotchiHomeView() {
  const { items, reorderItem } = useRestockStore();
  const addItem = useCartStore(s => s.addItem);

  const sortedItems = [...items].sort((a, b) => a.remainingDays - b.remainingDays);
  const criticalItems = sortedItems.filter(i => i.urgencyTier === 'CRITICAL');
  const warningItems = sortedItems.filter(i => i.urgencyTier === 'WARNING');
  const safeItems = sortedItems.filter(i => i.urgencyTier === 'SAFE');

  const handleReorder = (item) => {
    addItem({
      _id: item._id,
      name: item.productName,
      brand: item.brand,
      price: item.price,
      image: item.image,
      category: item.category,
      deliveryETA: '20 mins',
      rankReason: '🔄 Restock'
    });
    reorderItem(item._id);
  };

  return (
    <div className="relative">
      {/* Custom CSS animations */}
      <style>{`
        @keyframes wiggle { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
        @keyframes sway { 0%,100%{transform:translateX(-2px)} 50%{transform:translateX(2px)} }
        @keyframes bounce-gentle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes rise { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-40px)} }
        @keyframes pop-in { 0%{opacity:0;transform:translate(-50%,8px) scale(0.8)} 100%{opacity:1;transform:translate(-50%,0) scale(1)} }
      `}</style>

      {/* Living Room Background */}
      <div className="rounded-3xl bg-gradient-to-b from-sky-50 via-blue-50/30 to-amber-50/50 border border-sky-200/60 p-6 shadow-inner relative overflow-hidden">
        {/* Decorative elements — room feel */}
        <div className="absolute top-4 right-6 text-4xl opacity-20">🏠</div>
        <div className="absolute bottom-4 left-6 text-3xl opacity-15">🪴</div>
        <div className="absolute top-6 left-10 text-2xl opacity-10">☁️</div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={18} className="text-amber-500" />
          <h2 className="font-bold text-slate-800 text-base">My Living Home</h2>
          <span className="text-xs text-slate-400 ml-2">Tap characters to interact</span>
        </div>

        {/* Critical Zone (Red Room) */}
        {criticalItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Hungry! — Need restocking</p>
            </div>
            <div className="flex flex-wrap gap-5 pl-2">
              {criticalItems.map(item => (
                <TamagotchiCharacter key={item._id} item={item} onReorder={handleReorder} />
              ))}
            </div>
          </div>
        )}

        {/* Warning Zone (Amber Room) */}
        {warningItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Getting low — Watch these</p>
            </div>
            <div className="flex flex-wrap gap-5 pl-2">
              {warningItems.map(item => (
                <TamagotchiCharacter key={item._id} item={item} onReorder={handleReorder} />
              ))}
            </div>
          </div>
        )}

        {/* Safe Zone (Green Room) */}
        {safeItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Happy & Full</p>
            </div>
            <div className="flex flex-wrap gap-5 pl-2">
              {safeItems.map(item => (
                <TamagotchiCharacter key={item._id} item={item} onReorder={handleReorder} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-10">
            <span className="text-4xl">🏡</span>
            <p className="text-sm text-slate-500 mt-2">Your home is empty! Add items to bring it to life.</p>
          </div>
        )}
      </div>
    </div>
  );
}
