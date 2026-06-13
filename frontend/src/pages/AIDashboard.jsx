import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, History, Sparkles, Brain, Zap } from 'lucide-react';
import QuickActionChips from '../components/QuickActionChips';
import VoiceInput from '../components/VoiceInput';
import ImageUploadDropzone from '../components/ImageUploadDropzone';
import { intent, ai } from '../api';
import { useIntentStore } from '../store';

export default function AIDashboard() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const { recentIntents, setIntent } = useIntentStore();

  useEffect(() => {
    intent.getTemplates().then(r => setTemplates(r.data));
  }, []);

  // Real-time autocomplete suggestions
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(() => {
      ai.suggest({ partial: query }).then(r => setSuggestions(r.data.suggestions || [])).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = async (text) => {
    const input = text || query;
    if (!input.trim()) return;
    setLoading(true);
    setSuggestions([]);
    try {
      const { data } = await intent.parse({ text: input });
      setIntent(data);
      navigate('/intent-results');
    } catch (err) {
      alert('Failed to parse intent. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (t) => {
    setSelected(t);
    setQuery(t.prompt);
  };

  const selectSuggestion = (s) => {
    if (s.type === 'product') {
      setQuery(s.text);
      handleSubmit(s.text);
    } else if (s.type === 'category') {
      setQuery(`I need ${s.text} products`);
      handleSubmit(`I need ${s.text} products`);
    } else if (s.type === 'mission') {
      setQuery(s.text);
      handleSubmit(s.text);
    }
    setSuggestions([]);
  };

  return (
    <div className="bg-gradient-to-b from-amazon-light to-white min-h-[calc(100vh-120px)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amazon-orange/10 text-amazon-orange px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles size={16} /> AI Shopping Agent
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-amazon-navy mb-2">What do you need right now?</h1>
          <p className="text-gray-600">Type, speak, or upload a photo. Our AI understands context, urgency, budget, and occasion.</p>
        </div>

        {/* Main Input */}
        <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="e.g. Movie night snacks for 4 people under $20, or I need Colgate toothpaste urgently..."
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 pr-12 text-amazon-navy focus:border-amazon-orange focus:ring-0 outline-none"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-amazon-orange text-white p-2 rounded-md hover:bg-amazon-orange-dark disabled:opacity-50"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
              </button>

              {/* Autocomplete dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg z-50 overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-amazon-light flex items-center gap-3 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">{s.type}</span>
                      <span className="text-sm text-amazon-navy">{s.text}</span>
                      {s.category && <span className="text-xs text-gray-400 ml-auto">{s.category}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <VoiceInput onTranscript={t => { setQuery(t); handleSubmit(t); }} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <ImageUploadDropzone onDetect={meta => { setQuery(meta.detectedItem); handleSubmit(meta.detectedItem); }} />
            <div className="bg-amazon-light rounded-lg p-4">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-1"><Brain size={14} /> How AI understands you</h3>
              <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
                <li>NLP extracts intent, urgency, budget & occasion</li>
                <li>Multi-signal scoring ranks real products</li>
                <li>Personalization from your purchase history</li>
                <li>Feedback learning improves over time</li>
              </ol>
            </div>
          </div>
        </div>

        {/* AI Capabilities */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: '🎯', label: 'Intent Parsing', desc: 'Understands what you mean' },
            { icon: '⚡', label: 'Urgency Detection', desc: 'Prioritizes speed when needed' },
            { icon: '💰', label: 'Budget Awareness', desc: 'Respects your spending limits' },
            { icon: '🔄', label: 'Smart Substitutes', desc: 'Finds alternatives when needed' }
          ].map(cap => (
            <div key={cap.label} className="bg-white border rounded-lg p-3 text-center">
              <span className="text-2xl block mb-1">{cap.icon}</span>
              <p className="text-xs font-bold text-amazon-navy">{cap.label}</p>
              <p className="text-xs text-gray-500">{cap.desc}</p>
            </div>
          ))}
        </div>

        {/* Mission Templates */}
        <div className="mb-8">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2"><Zap size={18} /> Mission Templates</h2>
          <p className="text-sm text-gray-500 mb-3">Quick shortcuts — one tap to launch a shopping mission</p>
          <QuickActionChips templates={templates} onSelect={selectTemplate} selected={selected} />
          {selected && (
            <button onClick={() => handleSubmit(selected.prompt)} className="amazon-btn-primary mt-4 w-full md:w-auto">
              Launch "{selected.label}" Mission
            </button>
          )}
        </div>

        {/* Recent Intents */}
        {recentIntents.length > 0 && (
          <div>
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2"><History size={18} /> Recent Missions</h2>
            <div className="space-y-2">
              {recentIntents.map((ri, i) => (
                <button
                  key={i}
                  onClick={() => { setIntent(ri); navigate('/intent-results'); }}
                  className="w-full text-left bg-white border rounded-lg px-4 py-3 hover:shadow-sm transition-shadow flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium">{ri.intent}</span>
                    {ri.parsedSlots?.budget && (
                      <span className="ml-2 text-xs text-green-600">💰 {ri.parsedSlots.budget.preference || `$${ri.parsedSlots.budget.max}`}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{ri.products?.length} items</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ri.urgency === 'high' ? 'bg-red-100 text-red-600' : ri.urgency === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                      {ri.urgency}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
