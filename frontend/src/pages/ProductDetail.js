import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, ShoppingCart, Zap, Shield, ArrowLeft, Plus, Minus, Package } from 'lucide-react';
import { getProduct, getSubstitutes, addRestockItem } from '../api';
import { useCartStore } from '../store';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [substitutes, setSubstitutes] = useState([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    setLoading(true);
    getProduct(id)
      .then(r => {
        setProduct(r.data);
        return getSubstitutes({ productId: r.data._id });
      })
      .then(r => setSubstitutes(r.data.substitutes || []))
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    addItem(product, qty);
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    addItem(product, qty);
    navigate('/cart');
  };

  const handleTrackRestock = async () => {
    try {
      await addRestockItem({ productId: product._id, quantity: qty });
      toast.success('Added to ReStock tracker!');
    } catch (err) {
      toast.error('Failed to add to tracker');
    }
  };

  if (loading) return <LoadingSpinner text="Loading product..." />;
  if (!product) return <div className="container" style={{ padding: '60px', textAlign: 'center' }}>Product not found</div>;

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="product-detail-page container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="product-detail-layout">
        {/* Image */}
        <div className="pd-image-section">
          <div className="pd-image-main">
            <img src={product.image} alt={product.name} />
            {discount > 0 && <span className="pd-discount">-{discount}% OFF</span>}
          </div>
        </div>

        {/* Info */}
        <div className="pd-info-section">
          <p className="pd-brand">{product.brand}</p>
          <h1 className="pd-name">{product.name}</h1>

          <div className="pd-rating">
            <div className="stars">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill={i < Math.floor(product.rating) ? '#ff9900' : 'none'} stroke="#ff9900" />
              ))}
            </div>
            <span>{product.rating}</span>
            <span className="pd-reviews">({product.reviewCount?.toLocaleString()} reviews)</span>
          </div>

          <div className="pd-pricing">
            <span className="pd-price">${product.price?.toFixed(2)}</span>
            {product.originalPrice && (
              <>
                <span className="pd-original">${product.originalPrice?.toFixed(2)}</span>
                <span className="pd-save">Save ${(product.originalPrice - product.price).toFixed(2)}</span>
              </>
            )}
          </div>

          <p className="pd-description">{product.description}</p>

          <div className="pd-meta">
            <div className="meta-item">
              <Clock size={16} />
              <span>Delivery in <strong>{product.deliveryETA}</strong></span>
            </div>
            {product.isPrime && (
              <div className="meta-item prime">
                <Zap size={16} />
                <span><strong>Prime</strong> eligible</span>
              </div>
            )}
            <div className="meta-item">
              <Shield size={16} />
              <span>In stock ({product.stock} available)</span>
            </div>
          </div>

          {/* Quantity + Actions */}
          <div className="pd-actions">
            <div className="qty-control">
              <button onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16} /></button>
              <span>{qty}</span>
              <button onClick={() => setQty(qty + 1)}><Plus size={16} /></button>
            </div>
            <button className="btn btn-primary btn-lg" onClick={handleAddToCart}>
              <ShoppingCart size={18} /> Add to Cart
            </button>
            <button className="btn btn-dark btn-lg" onClick={handleBuyNow}>
              Buy Now
            </button>
          </div>

          <button className="restock-track-btn" onClick={handleTrackRestock}>
            <Package size={16} /> Track with ReStock AI
          </button>

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="pd-tags">
              {product.tags.map(tag => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Substitutes */}
      {substitutes.length > 0 && (
        <div className="pd-substitutes">
          <h3>Similar Products</h3>
          <div className="substitutes-grid">
            {substitutes.map(s => (
              <div key={s._id} className="substitute-card" onClick={() => navigate(`/product/${s._id}`)}>
                <img src={s.image} alt={s.name} />
                <div>
                  <p className="sub-name">{s.name}</p>
                  <p className="sub-price">${s.price?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
