import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Bot, Send, Mic, Camera, ShoppingCart, Sparkles, Clock, ArrowRight, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { parseIntent, buildCart, getSubstitutes, getTemplates, submitFeedback, aiShop } from '../api';
import { useCartStore } from '../store';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import './ShoppingAgent.css';

export default function ShoppingAgent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    getTemplates().then(r => setTemplates(r.data)).catch(() => {});
    const q = searchParams.get('q');
    if (q) {
      setInput(q);
      handleSubmit(q);
    }
  }, []); // eslint-disable-line

  const handleSubmit = async (text) => {
    const query = text || input;
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      // Primary flow: Use AI Agent endpoint (prompt → DB + AI → product IDs)
      const res = await aiShop({ prompt: query });
      const data = res.data;
      setResult({
        intentId: data.intentId,
        summary: data.analysis.reasoning,
        category: data.analysis.categories?.[0] || 'general',
        urgency: data.analysis.urgency,
        confidence: data.analysis.confidence,
        quantity: data.analysis.quantity,
        products: data.products,
        meta: data.meta
      });
      setSelectedProducts(data.products?.map(p => p._id) || []);
      setHistory(prev => [{ query, result: data, time: new Date() }, ...prev].slice(0, 10));
    } catch (err) {
      // Fallback to intent parser
      try {
        const res = await parseIntent({ text: query });
        setResult(res.data);
        setSelectedProducts(res.data.products?.map(p => p._id) || []);
      } catch (e) {
        toast.error('Failed to process request. Try again.');
      }
    }
    setLoading(false);
  };

  const handleAddAllToCart = async () => {
    if (!selectedProducts.length) return;
    const products = result.products.filter(p => selectedProducts.includes(p._id));
    products.forEach(p => addItem(p));
    toast.success(`${products.length} items added to cart!`);
  };

  const handleBuildCart = async () => {
    if (!selectedProducts.length) return;
    try {
      const res = await buildCart({
        productIds: selectedProducts,
        intentSummary: result?.summary,
        source: 'intent'
      });
      const items = res.data.items?.map(i => ({
        ...i.productId,
        quantity: i.quantity
      })) || [];
      items.forEach(item => addItem(item));
      toast.success('Cart built! Proceeding to checkout...');
      navigate('/cart');
    } catch (err) {
      toast.error('Failed to build cart');
    }
  };

  const toggleProduct = (id) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleFeedback = async (accepted) => {
    try {
      await submitFeedback({
        type: 'intent',
        accepted,
        intentId: result?.intentId,
        reason: accepted ? 'good_match' : 'not_relevant'
      });
      toast.success(accepted ? 'Thanks! We\'ll improve from this.' : 'Got it, we\'ll do better next time.');
    } catch (err) {}
  };

  const handleTemplateClick = (template) => {
    setInput(template.prompt);
    handleSubmit(template.prompt);
  };

  return (
    <div className="agent-page">
      {/* Header */}
      <div className="agent-header">
        <div className="container">
          <div className="agent-title">
            <Bot size={28} />
            <div>
              <h1>AI Shopping Agent</h1>
              <p>Tell me what you need — I'll build your cart instantly</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container agent-layout">
        {/* Input Area */}
        <div className="agent-input-section card">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="agent-input-wrap">
              <Sparkles size={20} className="input-icon" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What do you need? e.g., 'Movie night for 4 people' or 'Baby has fever'"
                className="agent-input"
              />
              <button type="button" className="input-action-btn"><Mic size={18} /></button>
              <button type="button" className="input-action-btn"><Camera size={18} /></button>
              <button type="submit" className="send-btn" disabled={loading || !input.trim()}>
                <Send size={18} />
              </button>
            </div>
          </form>

          {/* Quick Templates */}
          {!result && !loading && (
            <div className="quick-templates">
              <p className="templates-label">Quick missions:</p>
              <div className="templates-wrap">
                {templates.map(t => (
                  <button key={t.id} className="template-btn" onClick={() => handleTemplateClick(t)}>
                    {getEmoji(t.id)} {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="agent-loading card">
            <div className="loading-pulse">
              <Bot size={32} />
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
            <p>Analyzing your request and finding the best products...</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="agent-results fade-in">
            {/* Intent Summary */}
            <div className="intent-summary card">
              <div className="intent-header">
                <Bot size={20} />
                <span>AI Analysis</span>
                <span className={`badge badge-${result.urgency === 'high' ? 'danger' : result.urgency === 'medium' ? 'warning' : 'success'}`}>
                  {result.urgency} urgency
                </span>
              </div>
              <p className="intent-text">{result.summary}</p>
              <div className="intent-meta">
                <span>Category: <strong>{result.category}</strong></span>
                <span>Confidence: <strong>{Math.round((result.confidence || 0.9) * 100)}%</strong></span>
                {result.quantity && <span>Quantity: <strong>{result.quantity}</strong></span>}
              </div>
            </div>

            {/* Products */}
            <div className="results-header">
              <h3>Top Picks for You ({result.products?.length || 0})</h3>
              <div className="results-actions">
                <button className="btn btn-outline btn-sm" onClick={() => { setResult(null); setInput(''); }}>
                  <RefreshCw size={14} /> New Search
                </button>
              </div>
            </div>

            <div className="agent-products-grid">
              {result.products?.map(product => (
                <div key={product._id} className={`agent-product-card ${selectedProducts.includes(product._id) ? 'selected' : ''}`}>
                  <label className="product-select-check">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product._id)}
                      onChange={() => toggleProduct(product._id)}
                    />
                  </label>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {/* Cart Actions */}
            <div className="agent-cart-bar card">
              <div className="cart-bar-info">
                <ShoppingCart size={20} />
                <span><strong>{selectedProducts.length}</strong> items selected</span>
                <span className="cart-bar-total">
                  ${result.products?.filter(p => selectedProducts.includes(p._id)).reduce((s, p) => s + p.price, 0).toFixed(2)}
                </span>
              </div>
              <div className="cart-bar-actions">
                <button className="btn btn-outline btn-sm" onClick={() => handleFeedback(true)}>
                  <ThumbsUp size={14} /> Helpful
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => handleFeedback(false)}>
                  <ThumbsDown size={14} />
                </button>
                <button className="btn btn-primary" onClick={handleAddAllToCart}>
                  <ShoppingCart size={16} /> Add to Cart
                </button>
                <button className="btn btn-dark" onClick={handleBuildCart}>
                  <ArrowRight size={16} /> Buy Now
                </button>
              </div>
            </div>

            {/* Feedback */}
            <div className="agent-feedback">
              <p>Not what you expected? Try being more specific or adjust your selection above.</p>
            </div>
          </div>
        )}

        {/* History Sidebar */}
        {history.length > 0 && !loading && (
          <div className="agent-history card">
            <h4>Recent Searches</h4>
            {history.map((h, i) => (
              <button key={i} className="history-item" onClick={() => { setInput(h.query); handleSubmit(h.query); }}>
                <Clock size={14} />
                <span>{h.query}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getEmoji(id) {
  const map = { party: '🎉', travel: '✈️', dinner: '🍳', baby: '👶', office: '💼', pharmacy: '💊', movie: '🎬', cleaning: '🧹', emergency: '🚨', guests: '👋' };
  return map[id] || '🛒';
}
