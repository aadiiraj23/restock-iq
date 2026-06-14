import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Zap, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { catalog } from '../api';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    catalog.getAll({ limit: 12 }).then(r => setProducts(r.data));
    catalog.getCategories().then(r => setCategories(r.data));
    catalog.getRecommended({ limit: 12 }).then(r => setRecommended(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-amazon-navy via-amazon-dark to-amazon-navy text-white overflow-hidden">
        <div className="max-w-[1500px] mx-auto px-4 py-12 md:py-16 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1 bg-amazon-orange/20 text-amazon-yellow px-3 py-1 rounded-full text-sm mb-4">
              <Zap size={14} /> AI-Powered Quick Commerce
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
              We don't make you search faster.<br />
              <span className="text-amazon-orange">We remove search.</span>
            </h1>
            <p className="text-gray-300 mb-6 max-w-lg">Tell us what you need. Our AI builds your cart in seconds. Express delivery to your door.</p>
            <Link to="/ai" className="amazon-btn-primary inline-flex items-center gap-2 text-base px-6 py-3">
              Open AI Prompt Dashboard <ChevronRight size={18} />
            </Link>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 max-w-md">
            {['Movie Night', 'Travel Essentials', 'Baby Care', 'Party Snacks'].map(label => (
              <Link key={label} to="/ai" className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-colors text-center">
                <span className="text-2xl block mb-1">{label === 'Movie Night' ? '🎬' : label === 'Travel Essentials' ? '✈️' : label === 'Baby Care' ? '👶' : '🎉'}</span>
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ReStock Banner */}
      <div className="bg-white border-b">
        <div className="max-w-[1500px] mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-amazon-navy">ReStock AI</h2>
            <p className="text-sm text-gray-600">Never run out of essentials. Predictive replenishment for your household.</p>
          </div>
          <Link to="/restock" className="amazon-link text-sm font-medium flex items-center gap-1">
            View Dashboard <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-[1500px] mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">Shop by Category</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {categories.map(cat => (
            <Link key={cat} to={`/category/${cat}`} className="bg-white border rounded-lg p-3 text-center hover:shadow-md transition-shadow">
              <span className="text-2xl block mb-1">
                {cat === 'snacks' ? '🍿' : cat === 'medicine' ? '💊' : cat === 'cleaning' ? '🧹' : cat === 'personal_care' ? '🧴' : cat === 'groceries' ? '🥗' : cat === 'household' ? '🏠' : '📦'}
              </span>
              <span className="text-xs capitalize">{cat.replace('_', ' ')}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recommended for You */}
      <div className="max-w-[1500px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-amazon-orange" />
            <h2 className="text-xl font-bold">Recommended for You</h2>
          </div>
          <Link to="/search" className="amazon-link text-sm">See all</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(recommended.length > 0 ? recommended : products).slice(0, 12).map(p => (
            <ProductCard key={p._id} product={p} recommendationReason={p.recommendationReason} />
          ))}
        </div>
      </div>

      {/* Prime delivery strip */}
      <div className="bg-amazon-dark text-white">
        <div className="max-w-[1500px] mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Express Delivery in 10-45 minutes</h2>
          <p className="text-gray-300 mb-4">Prime members get free express delivery on thousands of items</p>
          <Link to="/ai" className="amazon-btn">Try AI Shopping Now</Link>
        </div>
      </div>
    </div>
  );
}
