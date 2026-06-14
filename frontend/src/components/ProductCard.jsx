import { useState } from 'react';
import { Star, Truck, Zap, Tag } from 'lucide-react';
import { useCartStore } from '../store';
import BuyNowOverlay from './BuyNowOverlay';

export default function ProductCard({ product, onCompare, showRank, compact, recommendationReason }) {
  const addItem = useCartStore(s => s.addItem);
  const [showBuyNow, setShowBuyNow] = useState(false);
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  return (
    <>
      <div className={`product-card flex flex-col h-full ${compact ? 'p-3' : ''}`}>
        {/* Recommendation reason badge */}
        {recommendationReason && (
          <div className="flex items-start gap-1 mb-2 px-1">
            <Tag size={11} className="text-emerald-600 mt-0.5 shrink-0" />
            <span className="text-[11px] text-emerald-700 font-medium leading-tight line-clamp-2">
              {recommendationReason}
            </span>
          </div>
        )}

        <div className="relative mb-3">
          <img src={product.image} alt={product.name} className={`w-full object-contain bg-white mx-auto ${compact ? 'h-32' : 'h-44'}`} loading="lazy" />
          {showRank && product.rankReason && (
            <span className="absolute top-0 left-0 bg-amazon-green text-white text-xs px-2 py-0.5 rounded-br font-medium">
              {product.rankReason}
            </span>
          )}
          {discount > 0 && (
            <span className="absolute top-0 right-0 bg-red-600 text-white text-xs px-2 py-0.5 rounded-bl font-bold">
              -{discount}%
            </span>
          )}
        </div>

        <h3 className="text-sm text-amazon-navy line-clamp-2 mb-1 flex-1">{product.name}</h3>

        <div className="flex items-center gap-1 mb-1">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} className={i < Math.floor(product.rating) ? 'fill-amazon-orange text-amazon-orange' : 'text-gray-300'} />
            ))}
          </div>
          <span className="text-xs text-amazon-blue">{product.reviewCount?.toLocaleString()}</span>
        </div>

        <div className="mb-2">
          <span className="text-lg font-medium">₹{product.price?.toFixed(2)}</span>
          {product.originalPrice && (
            <span className="text-xs text-gray-500 line-through ml-1">₹{product.originalPrice.toFixed(2)}</span>
          )}
        </div>

        {product.isPrime && (
          <div className="flex items-center gap-1 text-xs text-amazon-blue mb-2">
            <Truck size={12} />
            <span className="font-bold text-amazon-orange">prime</span>
            <span>Get it in {product.deliveryETA}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-auto">
          {/* Buy Now — separate instant purchase */}
          <button
            onClick={() => setShowBuyNow(true)}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.97] transition-all"
          >
            <Zap size={14} /> Buy Now
          </button>

          <div className="flex gap-2">
            <button onClick={() => addItem(product)} className="amazon-btn-primary flex-1 text-center">
              Add to Cart
            </button>
            {onCompare && (
              <button onClick={() => onCompare(product)} className="text-xs amazon-link border border-gray-300 px-2 py-2 rounded-sm">
                Compare
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Buy Now Overlay */}
      {showBuyNow && (
        <BuyNowOverlay product={product} onClose={() => setShowBuyNow(false)} />
      )}
    </>
  );
}
