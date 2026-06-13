import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, ShoppingCart, Zap } from 'lucide-react';
import { useCartStore } from '../store';
import toast from 'react-hot-toast';
import './ProductCard.css';

export default function ProductCard({ product, compact = false }) {
  const addItem = useCartStore(s => s.addItem);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <Link to={`/product/${product._id}`} className={`product-card ${compact ? 'compact' : ''}`}>
      <div className="product-img-wrap">
        <img src={product.image} alt={product.name} loading="lazy" />
        {discount > 0 && <span className="discount-badge">-{discount}%</span>}
        {product.isPrime && <span className="prime-tag"><Zap size={10} /> Prime</span>}
      </div>
      <div className="product-info">
        <p className="product-brand">{product.brand}</p>
        <h4 className="product-name">{product.name}</h4>
        <div className="product-rating">
          <Star size={13} fill="#ff9900" stroke="#ff9900" />
          <span>{product.rating}</span>
          <span className="review-count">({product.reviewCount?.toLocaleString()})</span>
        </div>
        <div className="product-pricing">
          <span className="price">${product.price?.toFixed(2)}</span>
          {product.originalPrice && (
            <span className="original-price">${product.originalPrice?.toFixed(2)}</span>
          )}
        </div>
        <div className="product-eta">
          <Clock size={12} />
          <span>{product.deliveryETA}</span>
        </div>
        {product.rankReason && (
          <span className="rank-reason">{product.rankReason}</span>
        )}
      </div>
      <button className="add-cart-btn" onClick={handleAdd}>
        <ShoppingCart size={14} />
        Add
      </button>
    </Link>
  );
}
