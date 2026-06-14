import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Mic, MicOff, Loader2, ChevronDown, ChevronUp, UploadCloud, Sparkles, Brain, BadgeInfo, ShoppingBag, Flame, ShieldCheck, CircleDollarSign, Filter, SlidersHorizontal, X, AlertCircle } from 'lucide-react';
import { ai, intent, catalog } from '../api';
import { useAuthStore, useIntentStore, useCartStore } from '../store';

const QUICK_MISSIONS = [
  { label: 'Movie Night 🍿', prompt: 'Movie night snacks for 4 people under $20', category: 'snacks', icon: '🍿' },
  { label: 'Weekend Trip ✈️', prompt: 'Weekend trip toiletries and travel essentials', category: 'travel', icon: '✈️' },
  { label: 'Baby Care 🍼', prompt: 'Baby care essentials with diapers wipes and formula', category: 'baby', icon: '🍼' },
  { label: 'Deep Clean 🧼', prompt: 'Deep cleaning supplies for kitchen and bathroom', category: 'cleaning', icon: '🧼' },
  { label: 'Pantry Restock ☕', prompt: 'Pantry restock with coffee tea pasta and snacks', category: 'pantry', icon: '☕' },
  { label: 'Office Sprint 📎', prompt: 'Office supplies notebooks printer paper and pens', category: 'office', icon: '📎' },
  { label: 'Gym Fuel 💪', prompt: 'Protein bars energy drinks and post-workout snacks', category: 'health', icon: '💪' },
  { label: 'Pet Supplies 🐕', prompt: 'Dog food treats and grooming essentials', category: 'pets', icon: '🐕' }
];

const CATEGORIES = ['all', 'snacks', 'medicine', 'cleaning', 'personal_care', 'groceries', 'household', 'baby', 'health'];
const SORT_OPTIONS = [
  { value: 'relevance', label: 'AI Relevance' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'delivery', label: 'Fastest Delivery' }
];

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 100) / 100));
}

function buildStructuredPrompt(template) {
  return `${template.prompt}. Show ranked products with budget-aware substitutions and explain why each item fits.`;
}

function parseBudgetLabel(budget) {
  if (!budget) return 'No explicit budget';
  if (budget.max) return `Under $${budget.max}`;
  if (budget.preference) return budget.preference;
  return 'Budget captured';
}

function ScoreBar({ label, value, tone = 'orange' }) {
  const width = `${clampScore(value)}%`;
  const toneClass = tone === 'amber' ? 'bg-amber-500' : tone === 'blue' ? 'bg-sky-500' : tone === 'green' ? 'bg-emerald-500' : 'bg-amazon-orange';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{Math.round(clampScore(value))}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${toneClass}`} style={{ width }} />
      </div>
    </div>
  );
}

function ResultCard({ product, isOpen, onToggle, onAddToCart }) {
  const signals = product.signals || {};
  const textSignal = signals.relevance ?? signals.textSimilarity ?? product.aiScore ?? 0;
  const ratingSignal = signals.quality ?? (product.rating ? product.rating * 20 : 0);
  const budgetSignal = signals.priceFit ?? signals.budget ?? 0;
  const brandSignal = signals.preference ?? signals.brandAffinity ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
      <div className="p-4 flex gap-4">
        <div className="h-24 w-24 shrink-0 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={(e) => { e.target.src = '/placeholder.png'; }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">No image</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amazon-orange px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                  <Sparkles size={12} /> AI {Math.round(product.aiScore || 0)}
                </span>
                {product.budgetSubstituted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    <CircleDollarSign size={12} /> Substituted
                  </span>
                )}
              </div>
              <h3 className="truncate text-base font-semibold text-slate-900">{product.name}</h3>
              <p className="truncate text-sm text-slate-500">{product.brand} · {product.category}</p>
            </div>

            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <BadgeInfo size={14} />
              Score
              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900">${Number(product.price || 0).toFixed(2)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-slate-400 line-through">${Number(product.originalPrice).toFixed(2)}</span>
            )}
            <span className="text-slate-500">{product.deliveryETA || 'Fast delivery'}</span>
            <span className="text-slate-500">Rating {Number(product.rating || 0).toFixed(1)}</span>
          </div>

          <p className="mt-2 text-sm text-slate-600 line-clamp-2">{product.rankReason || product.description || 'AI-ranked recommendation.'}</p>

          <button
            onClick={() => onAddToCart && onAddToCart(product)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amazon-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-amazon-orange-dark transition"
          >
            <ShoppingBag size={13} /> Add to Cart
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <ScoreBar label="Text Similarity (TF-IDF)" value={textSignal} tone="orange" />
            <ScoreBar label="Rating Fit" value={ratingSignal} tone="blue" />
            <ScoreBar label="Budget / Price Alignment" value={budgetSignal} tone="green" />
            <ScoreBar label="Brand Affinity" value={brandSignal} tone="amber" />
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 mb-1">AI Signal Breakdown</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>Availability: {Math.round(signals.availability ?? 0)}</div>
              <div>Context: {Math.round(signals.context ?? 0)}</div>
              <div>Quality: {Math.round(signals.quality ?? 0)}</div>
              <div>Preference: {Math.round(signals.preference ?? 0)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIDashboard() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const [openProductId, setOpenProductId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    sortBy: 'relevance',
    priceMin: '',
    priceMax: '',
    primeOnly: false
  });

  const { user, householdProfile } = useAuthStore();
  const { recentMissions, currentSlots, aiResults, trackMission, setCurrentSlots, setAiResults } = useIntentStore();
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    let alive = true;
    intent.getTemplates().then(({ data }) => {
      if (!alive) return;
      setTemplates(Array.isArray(data) ? data : data?.templates || []);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const SpeechAPI = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;
    setVoiceSupported(Boolean(SpeechAPI));
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      ai.suggest({ partial: query })
        .then(({ data }) => setSuggestions(data.suggestions || []))
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const missionTemplates = useMemo(() => {
    const serverTemplates = Array.isArray(templates) ? templates : [];
    return serverTemplates.length > 0 ? serverTemplates : QUICK_MISSIONS;
  }, [templates]);

  const currentUserId = user?.id || user?._id || householdProfile?.id || null;

  // --- Filter and sort results ---
  const filteredResults = useMemo(() => {
    let results = [...aiResults];

    // Category filter
    if (filters.category !== 'all') {
      results = results.filter(p => p.category === filters.category);
    }

    // Price range filter
    const minPrice = Number(filters.priceMin) || 0;
    const maxPrice = Number(filters.priceMax) || Infinity;
    if (minPrice > 0 || maxPrice < Infinity) {
      results = results.filter(p => {
        const price = Number(p.price || 0);
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Prime only
    if (filters.primeOnly) {
      results = results.filter(p => p.isPrime);
    }

    // Sort
    switch (filters.sortBy) {
      case 'price_low':
        results.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high':
        results.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'delivery':
        results.sort((a, b) => (parseInt(a.deliveryETA) || 99) - (parseInt(b.deliveryETA) || 99));
        break;
      default:
        // relevance — keep AI order
        break;
    }

    return results;
  }, [aiResults, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.sortBy !== 'relevance') count++;
    if (filters.priceMin) count++;
    if (filters.priceMax) count++;
    if (filters.primeOnly) count++;
    return count;
  }, [filters]);

  const performSearch = async (text) => {
    const user_prompt = String(text || query).trim();
    if (!user_prompt || loading) return;

    setLoading(true);
    setSuggestions([]);
    setVoiceError('');

    try {
      const { data } = await ai.shop({ user_prompt, userId: currentUserId });
      const nextResults = Array.isArray(data.products) ? data.products : [];

      trackMission({
        intentId: data.intentId || `${Date.now()}`,
        intent: data.intentSummary?.parsedIntent || user_prompt,
        prompt: user_prompt,
        parsedSlots: data.parsedSlots || data.intentSummary || {},
        products: nextResults,
        urgency: data.intentSummary?.urgency || 'medium'
      });

      setCurrentSlots(data.intentSummary || data.parsedSlots || {});
      setAiResults(nextResults);
      setOpenProductId(nextResults[0]?._id || null);
    } catch (error) {
      console.error('AI search failed', error);
    } finally {
      setLoading(false);
    }
  };

  const selectMission = (mission) => {
    const prompt = buildStructuredPrompt(mission);
    setQuery(prompt);
    inputRef.current?.focus();
    performSearch(prompt);
  };

  // --- Microphone: Web Speech API with network fallback ---
  const handleMicToggle = () => {
    if (!voiceSupported) {
      setVoiceError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    // If already listening, stop
    if (listening && recognitionRef.current) {
      recognitionRef.current._manualStop = true;
      try { recognitionRef.current.stop(); } catch (_) {}
      setListening(false);
      setInterimText('');
      if (query.trim()) {
        performSearch(query);
      }
      return;
    }

    setVoiceError('');
    setInterimText('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Use non-continuous mode — more reliable, avoids network errors on many setups
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition._manualStop = false;
    recognition._retryCount = 0;

    recognition.onstart = () => {
      setListening(true);
      setVoiceError('');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        const trimmed = finalTranscript.trim();
        setQuery(trimmed);
        setInterimText('');
        // Auto-search after getting final result
        setListening(false);
        performSearch(trimmed);
      } else if (interimTranscript) {
        setInterimText(interimTranscript);
        // Show interim in the input field for real-time feedback
        setQuery(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      setInterimText('');

      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setListening(false);
        setVoiceError('Microphone permission denied. Go to browser Settings > Privacy > Microphone and allow this site.');
      } else if (event.error === 'no-speech') {
        // No speech detected — auto-retry silently
        if (!recognition._manualStop && recognition._retryCount < 3) {
          recognition._retryCount++;
          try { recognition.start(); } catch (_) {}
          return;
        }
        setListening(false);
        setVoiceError('No speech detected. Click the mic and speak clearly.');
      } else if (event.error === 'network') {
        // Network error — the browser can't reach Google's speech servers.
        // Retry once, then show helpful message
        if (!recognition._manualStop && recognition._retryCount < 1) {
          recognition._retryCount++;
          setTimeout(() => {
            try { recognition.start(); } catch (_) {
              setListening(false);
              setVoiceError('Speech recognition unavailable. Check your internet connection and try again.');
            }
          }, 500);
          return;
        }
        setListening(false);
        setVoiceError('Speech recognition needs internet access. Check your connection, disable VPN/proxy, or try typing instead.');
      } else if (event.error === 'aborted') {
        setListening(false);
      } else {
        setListening(false);
        setVoiceError(`Voice error: ${event.error}. Try again or type your request.`);
      }
    };

    recognition.onend = () => {
      // If not manually stopped and we're still in listening mode, restart
      // This handles the case where continuous=false ends after silence
      if (!recognition._manualStop && listening) {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setVoiceError('Could not start voice input. Make sure no other app is using the microphone.');
      setListening(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDropActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const fileName = file.name.replace(/\.[^.]+$/, '').replace(/[._-]/g, ' ');
    const prompt = `I uploaded a photo of ${fileName}`;
    setQuery(prompt);
    performSearch(prompt);
  };

  const handleAddToCart = (product) => {
    useCartStore.getState().addItem(product);
  };

  const resetFilters = () => {
    setFilters({ category: 'all', sortBy: 'relevance', priceMin: '', priceMax: '', primeOnly: false });
  };

  const activeMission = recentMissions[0] || null;

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[radial-gradient(circle_at_top,_rgba(255,153,0,0.10),_transparent_32%),linear-gradient(180deg,#fefefe_0%,#f7f7f7_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-1.5 text-sm font-semibold text-amazon-orange shadow-sm backdrop-blur">
            <Sparkles size={15} /> Conversational Shopping Dashboard
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">Tell the store what you need.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Search by voice, photo, or a mission chip. The AI parses your request, ranks products, and explains every score.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          {/* Left Column */}
          <section className="space-y-6">
            {/* Search Input Card */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Search size={16} className="text-amazon-orange" /> Conversational Input Bar
                </div>
              </div>

              <div className="space-y-4 p-5">
                {/* Input + Mic + Search */}
                <div className="relative">
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && performSearch(query)}
                    placeholder="Movie night snacks for 4 people under $20"
                    className={`w-full rounded-2xl border-2 bg-slate-50 px-5 py-4 pr-40 text-base text-slate-900 outline-none transition focus:bg-white ${listening ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 focus:border-amazon-orange'}`}
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                    <button
                      onClick={handleMicToggle}
                      disabled={!voiceSupported}
                      className={`relative inline-flex items-center justify-center rounded-xl px-3 py-2 text-white shadow-sm transition ${listening ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-800'} disabled:cursor-not-allowed disabled:opacity-40`}
                      title={voiceSupported ? (listening ? 'Click to stop recording' : 'Click to start voice input') : 'Voice not supported in this browser'}
                    >
                      {listening ? <MicOff size={18} /> : <Mic size={18} />}
                      {listening && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => performSearch(query)}
                      disabled={loading || !query.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-amazon-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amazon-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      Search
                    </button>
                  </div>
                </div>

                {/* Voice interim text indicator */}
                {listening && (
                  <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse delay-75" />
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse delay-150" />
                    </div>
                    <span className="text-sm text-red-700 font-medium">
                      {interimText ? `"${interimText}"` : 'Listening... speak now'}
                    </span>
                    <button
                      onClick={handleMicToggle}
                      className="ml-auto text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Stop & Search
                    </button>
                  </div>
                )}

                {/* Voice error message */}
                {voiceError && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm text-amber-700">{voiceError}</span>
                      {voiceError.includes('internet') || voiceError.includes('network') || voiceError.includes('unavailable') ? (
                        <p className="text-xs text-amber-600 mt-1">
                          Tip: Chrome sends voice to Google servers for processing. Make sure you have a working internet connection and no VPN/firewall blocking it. You can also just type your request in the box above.
                        </p>
                      ) : null}
                    </div>
                    <button onClick={() => setVoiceError('')} className="shrink-0"><X size={14} className="text-amber-600" /></button>
                  </div>
                )}

                {/* Suggestions dropdown */}
                {suggestions.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.text}-${index}`}
                        onClick={() => {
                          const structured = suggestion.type === 'category'
                            ? `I need ${suggestion.text} products`
                            : suggestion.text;
                          setQuery(structured);
                          performSearch(structured);
                        }}
                        className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                      >
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {suggestion.type}
                        </span>
                        <span className="text-sm text-slate-800">{suggestion.text}</span>
                        {suggestion.category && <span className="ml-auto text-xs text-slate-400">{suggestion.category}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Drop zone + Intent Parser */}
                <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
                    onDragLeave={() => setDropActive(false)}
                    onDrop={handleDrop}
                    className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${dropActive ? 'border-amazon-orange bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-amazon-orange hover:bg-amber-50/60'}`}
                  >
                    <UploadCloud className="mb-2 text-amazon-orange" size={28} />
                    <p className="font-semibold text-slate-900">Drop a product photo here</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Upload an image to generate a shopping prompt automatically.</p>
                  </div>

                  <div className="rounded-2xl bg-[linear-gradient(180deg,#fff7e6,#ffffff)] p-5 ring-1 ring-amber-100">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Brain size={15} className="text-amazon-orange" /> Intent Parser Status
                    </h3>
                    <div className="mt-4 grid gap-3 text-sm">
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                        <span className="text-slate-500">Mission</span>
                        <span className="font-semibold text-slate-900 truncate ml-2 max-w-[180px]">{currentSlots?.parsedIntent || activeMission?.intent || 'Waiting for input'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                        <span className="text-slate-500">Budget</span>
                        <span className="font-semibold text-slate-900">{parseBudgetLabel(currentSlots?.budget)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                        <span className="text-slate-500">Urgency</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                          <Flame size={12} /> {currentSlots?.urgency || activeMission?.urgency || 'unknown'}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Slots</span>
                          <span className="text-xs text-slate-400">Live</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <span>Qty: {currentSlots?.quantity?.value || currentSlots?.quantity || 1}</span>
                          <span>Occasion: {currentSlots?.occasion || 'general'}</span>
                          <span>Confidence: {Math.round((currentSlots?.confidence || 0) * 100)}%</span>
                          <span>Categories: {(currentSlots?.categories || []).join(', ') || 'any'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Mission Chips */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Sparkles size={16} className="text-amazon-orange" /> Quick-Action Mission Chips
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">One tap launches a structured shopping mission and AI search.</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {missionTemplates.map((mission) => (
                  <button
                    key={mission.label}
                    onClick={() => selectMission(mission)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-amazon-orange hover:bg-amber-50 hover:text-slate-950"
                  >
                    {mission.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Right Column */}
          <aside className="space-y-6">
            {/* Filter Panel */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <SlidersHorizontal size={16} className="text-amazon-orange" /> Filters & Sort
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-amazon-orange text-white text-[10px] font-bold px-1.5 py-0.5">{activeFilterCount}</span>
                  )}
                </div>
                {showFilters ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>

              {showFilters && (
                <div className="mt-4 space-y-4">
                  {/* Category */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">Category</label>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setFilters(f => ({ ...f, category: cat }))}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${filters.category === cat ? 'bg-amazon-orange text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          {cat === 'all' ? 'All' : cat.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amazon-orange"
                    >
                      {SORT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">Price Range</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.priceMin}
                        onChange={(e) => setFilters(f => ({ ...f, priceMin: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amazon-orange"
                      />
                      <span className="text-slate-400">—</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.priceMax}
                        onChange={(e) => setFilters(f => ({ ...f, priceMax: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amazon-orange"
                      />
                    </div>
                  </div>

                  {/* Prime Only */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.primeOnly}
                      onChange={(e) => setFilters(f => ({ ...f, primeOnly: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-amazon-orange focus:ring-amazon-orange"
                    />
                    <span className="text-sm text-slate-700 font-medium">Prime eligible only</span>
                  </label>

                  {/* Reset */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="text-xs text-amazon-orange hover:underline font-medium"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Results Grid */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShoppingBag size={16} className="text-amazon-orange" /> AI-Ranked Results
                </div>
                {filteredResults.length > 0 && (
                  <span className="text-xs text-slate-500">{filteredResults.length} items</span>
                )}
              </div>

              {loading ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="animate-spin text-amazon-orange" size={34} />
                  <div className="text-sm font-medium">Ranking products and generating substitutions…</div>
                </div>
              ) : filteredResults.length > 0 ? (
                <div className="mt-4 grid gap-4">
                  {filteredResults.map((product) => (
                    <ResultCard
                      key={product._id}
                      product={product}
                      isOpen={openProductId === product._id}
                      onToggle={() => setOpenProductId(openProductId === product._id ? null : product._id)}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              ) : aiResults.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  <Filter size={20} className="mx-auto mb-2 text-slate-400" />
                  No results match your filters.
                  <button onClick={resetFilters} className="block mx-auto mt-2 text-amazon-orange hover:underline text-xs font-medium">
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Search something to populate ranked results.
                </div>
              )}
            </div>

            {/* Shopping Context */}
            <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#fff,_#fff8ef)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck size={16} className="text-emerald-600" /> Shopping Context
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                  <span>Recent missions</span>
                  <span className="font-semibold text-slate-900">{recentMissions.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                  <span>Authenticated user</span>
                  <span className="font-semibold text-slate-900">{user?.name || householdProfile?.name || 'Guest'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                  <span>Household size</span>
                  <span className="font-semibold text-slate-900">{householdProfile?.household?.size || user?.household?.size || 1}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
