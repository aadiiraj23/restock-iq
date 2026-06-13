import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, RefreshCw, ThumbsUp, ThumbsDown, BarChart3, Repeat } from 'lucide-react';
import IntentParserPanel from '../components/IntentParserPanel';
import ProductCard from '../components/ProductCard';
import ComparisonDrawer from '../components/ComparisonDrawer';
import { useIntentStore, useCartStore } from '../store';
import { cart as cartApi, feedback, ai } from '../api';

export default function IntentResults() {
  const navigate = useNavigate();
  const { lastIntent } = useIntentStore();
  const { setBulk, addItem } = useCartStore();
  const [compareList, setCompareList] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [building, setBuilding] = useState(false);
  const [substitutions, setSubstitutions] = useState({});
  const [showSignals, setShowSignals] = useState(false);

  if (!lastIntent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">No active mission. Start from the AI Dashboard.</p>
        <button onClick={() => navigate('/ai')} className="amazon-btn-primary">Go to AI Dashboard</button>
      </div>
    );
  }

  const handleCompare = (product) => {
    setCompareList(prev => {
      if (prev.find(p => p._id === product._id)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, product];
    });
    setShowCompare(true);
  };

  const handleAddAll = async () => {
    setBuilding(true);
    try {
      const products = lastIntent.products || [];
      setBulk(products);
      const { data } = await cartApi.build({
        productIds: products.map(p => p._id),
        intentSummary: lastIntent.intent,
        source: 'intent'
      });
      useCartStore.getState().setFromServer(data);
      navigate('/cart');
    } catch {
      setBulk(lastIntent.products);
      navigate('/cart');
    } finally {
      setBuilding(false);
    }
  };

  const loadSubstitutes = async (productId) => {
    try {
      const { data } = await ai.substitute({ productId });
      setSubstitutions(prev => ({ ...prev, [productId]: data.substitutes }));
    } catch {
      // Fallback to cart substitute
      const { data } = await cartApi.substitute(productId);
      setSubstitutions(prev => ({ ...prev, [productId]: data.substitutes }));
    }
  };

  const total = (lastIntent.products || []).reduce((s, p) => s + p.price, 0);
  const products = lastIntent.products || [];

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      {/* Intent Understanding Panel */}
      <IntentParserPanel intent={lastIntent} />

      {/* Parsed Slots Display */}
      {lastIntent.parsedSlots && (
        <div className="mt-3 flex flex-wrap gap-2">
          {lastIntent.parsedSlots.budget && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              💰 {lastIntent.parsedSlots.budget.max ? `Under $${lastIntent.parsedSlots.budget.max}` : lastIntent.parsedSlots.budget.preference}
            </span>
          )}
          {lastIntent.parsedSlots.brandHints?.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              🏷️ {lastIntent.parsedSlots.brandHints.join(', ')}
            </span>
          )}
          {lastIntent.parsedSlots.temporal && lastIntent.parsedSlots.temporal.window !== 'standard' && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              ⏰ {lastIntent.parsedSlots.temporal.window}
            </span>
          )}
          {lastIntent.parsedSlots.substitutionTolerance && lastIntent.parsedSlots.substitutionTolerance !== 'medium' && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              🔄 {lastIntent.parsedSlots.substitutionTolerance === 'high' ? 'Flexible' : 'Exact only'}
            </span>
          )}
          {lastIntent.parsedSlots.categories?.length > 1 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
              📂 {lastIntent.parsedSlots.categories.slice(0, 3).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 mb-4">
        <div>
          <h2 className="text-xl font-bold">Recommended for you</h2>
          <p className="text-sm text-gray-500">
            {products.length} highly relevant items · Est. ${total.toFixed(2)}
            {lastIntent.confidence && ` · ${Math.round(lastIntent.confidence * 100)}% match confidence`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/ai')} className="amazon-btn flex items-center gap-1"><RefreshCw size={14} /> New Mission</button>
          <button onClick={() => setShowSignals(!showSignals)} className="border rounded-sm px-3 py-1.5 text-sm flex items-center gap-1">
            <BarChart3 size={14} /> {showSignals ? 'Hide' : 'Show'} AI Scores
          </button>
          {compareList.length > 0 && (
            <button onClick={() => setShowCompare(true)} className="border rounded-sm px-3 py-1.5 text-sm">Compare ({compareList.length})</button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-24">
        {products.map((p, idx) => (
          <div key={p._id}>
            <ProductCard product={p} onCompare={handleCompare} showRank />

            {/* AI Score Breakdown (collapsible) */}
            {showSignals && p.signals && (
              <div className="mt-2 bg-gray-50 rounded p-2 text-xs">
                <div className="font-medium text-gray-700 mb-1">AI Score: {p.aiScore || p._aiScore}</div>
                <div className="space-y-0.5">
                  {Object.entries(p.signals).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500 capitalize">{key}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amazon-orange rounded-full" style={{ width: `${val}%` }} />
                        </div>
                        <span className="text-gray-600 w-6 text-right">{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Substitution Button */}
            <div className="mt-2">
              <button onClick={() => loadSubstitutes(p._id)} className="text-xs amazon-link flex items-center gap-1">
                <Repeat size={12} /> Find alternatives
              </button>
              {substitutions[p._id]?.map(sub => (
                <button key={sub._id} onClick={() => addItem(sub)} className="block text-xs mt-1 bg-gray-100 px-2 py-1.5 rounded w-full text-left hover:bg-gray-200">
                  <span className="font-medium">↳ {sub.name}</span>
                  <span className="text-gray-500 ml-1">(${sub.price})</span>
                  {sub.reason && <span className="text-green-600 ml-1">· {sub.reason}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
        <div className="max-w-[1500px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg">${total.toFixed(2)}</p>
            <p className="text-xs text-amazon-green">Express delivery available</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => feedback.send({ type: 'intent', accepted: false, intentId: lastIntent.intentId })}
              className="p-2 border rounded-sm text-gray-500 hover:bg-gray-50"
              title="Not helpful — helps AI learn"
            ><ThumbsDown size={18} /></button>
            <button
              onClick={() => feedback.send({ type: 'intent', accepted: true, intentId: lastIntent.intentId })}
              className="p-2 border rounded-sm text-gray-500 hover:bg-gray-50"
              title="Helpful — helps AI learn"
            ><ThumbsUp size={18} /></button>
            <button onClick={handleAddAll} disabled={building} className="amazon-btn-primary flex items-center gap-2 px-6 py-2.5">
              <ShoppingCart size={18} /> {building ? 'Building cart...' : 'Add All & Checkout'}
            </button>
          </div>
        </div>
      </div>

      {showCompare && (
        <ComparisonDrawer
          products={compareList}
          onClose={() => setShowCompare(false)}
          onSelect={p => { addItem(p); setShowCompare(false); }}
        />
      )}
    </div>
  );
}
