import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Package, ShoppingBag, Zap, Clock, TrendingUp, Search, Mic, Camera, ArrowRight, Star, Shield } from 'lucide-react';
import { getProducts, getTemplates } from '../api';
import ProductCard from '../components/ProductCard';
import './Home.css';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getProducts({ limit: 8 }).then(r => setProducts(r.data)).catch(() => {});
    getTemplates().then(r => setTemplates(r.data)).catch(() => {});
  }, []);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/agent?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const features = [
    { icon: <Bot size={32} />, title: 'AI Shopping Agent', desc: 'Tell us what you need, get a ready cart', link: '/agent', color: '#ff9900' },
    { icon: <Package size={32} />, title: 'ReStock AI', desc: 'Never run out of essentials again', link: '/restock', color: '#067d62' },
    { icon: <ShoppingBag size={32} />, title: 'Browse Store', desc: 'Explore all categories and deals', link: '/shop', color: '#232f3e' },
    { icon: <Zap size={32} />, title: 'Express Delivery', desc: 'Get items in 10-30 minutes', link: '/shop', color: '#c7511f' },
  ];

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Powered by AI</div>
          <h1>Shop by intent,<br /><span>not by search.</span></h1>
          <p>Tell us what you need in plain language. Our AI builds your cart in seconds.</p>
          <form className="hero-search" onSubmit={handleQuickSearch}>
            <div className="hero-search-inner">
              <Search size={20} />
              <input
                type="text"
                placeholder="Try: Movie night for 4 people, Baby has fever, Guests in 30 minutes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="button" className="hero-mic"><Mic size={18} /></button>
              <button type="button" className="hero-cam"><Camera size={18} /></button>
            </div>
            <button type="submit" className="btn btn-primary btn-lg">
              <Bot size={18} /> Get AI Cart
            </button>
          </form>
        </div>
      </section>

      {/* Feature Icons Grid */}
      <section className="features-section container">
        <div className="features-grid">
          {features.map((f, i) => (
            <Link to={f.link} key={i} className="feature-card" style={{ '--accent': f.color }}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <ArrowRight size={16} className="feature-arrow" />
            </Link>
          ))}
        </div>
      </section>

      {/* Mission Templates */}
      <section className="templates-section container">
        <div className="section-header">
          <h2>Quick Shopping Missions</h2>
          <p>One tap to start an AI-powered shopping session</p>
        </div>
        <div className="templates-grid">
          {templates.map(t => (
            <Link to={`/agent?q=${encodeURIComponent(t.prompt)}`} key={t.id} className="template-chip">
              <span className="template-icon">{getTemplateEmoji(t.id)}</span>
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Products */}
      <section className="products-section container">
        <div className="section-header">
          <h2>Trending Now</h2>
          <Link to="/shop" className="see-all">View All <ArrowRight size={14} /></Link>
        </div>
        <div className="products-grid">
          {products.slice(0, 8).map(p => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="trust-section container">
        <div className="trust-grid">
          <div className="trust-item">
            <Clock size={24} />
            <div>
              <h4>10-Min Delivery</h4>
              <p>Express delivery on essentials</p>
            </div>
          </div>
          <div className="trust-item">
            <Shield size={24} />
            <div>
              <h4>Secure Checkout</h4>
              <p>256-bit SSL encrypted payments</p>
            </div>
          </div>
          <div className="trust-item">
            <Star size={24} />
            <div>
              <h4>Top Brands</h4>
              <p>Curated selection of trusted products</p>
            </div>
          </div>
          <div className="trust-item">
            <TrendingUp size={24} />
            <div>
              <h4>Smart Savings</h4>
              <p>AI finds the best deals for you</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function getTemplateEmoji(id) {
  const map = { party: '🎉', travel: '✈️', dinner: '🍳', baby: '👶', office: '💼', pharmacy: '💊', movie: '🎬', cleaning: '🧹', emergency: '🚨', guests: '👋' };
  return map[id] || '🛒';
}
