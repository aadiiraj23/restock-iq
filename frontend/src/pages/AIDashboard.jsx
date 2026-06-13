import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Mic, MicOff, Loader2, ChevronDown, ChevronUp, UploadCloud, Sparkles, Brain, BadgeInfo, ShoppingBag, Flame, ShieldCheck, CircleDollarSign } from 'lucide-react';
import { ai, intent, catalog } from '../api';
import { useAuthStore, useIntentStore } from '../store';

const QUICK_MISSIONS = [
  { label: 'Movie Night 🍿', prompt: 'Movie night snacks for 4 people under $20', category: 'snacks', icon: '🍿' },
  { label: 'Weekend Trip ✈️', prompt: 'Weekend trip toiletries and travel essentials', category: 'travel', icon: '✈️' },
  { label: 'Baby Care 🍼', prompt: 'Baby care essentials with diapers wipes and formula', category: 'baby', icon: '🍼' },
  { label: 'Deep Clean 🧼', prompt: 'Deep cleaning supplies for kitchen and bathroom', category: 'cleaning', icon: '🧼' },
  { label: 'Pantry Restock ☕', prompt: 'Pantry restock with coffee tea pasta and snacks', category: 'pantry', icon: '☕' },
  { label: 'Office Sprint 📎', prompt: 'Office supplies notebooks printer paper and pens', category: 'office', icon: '📎' }
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

function ResultCard({ product, isOpen, onToggle }) {
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
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
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
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [openProductId, setOpenProductId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [templates, setTemplates] = useState([]);

  const { user, householdProfile } = useAuthStore();
  const { recentMissions, currentSlots, aiResults, actions } = useIntentStore();
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    let alive = true;

    intent.getTemplates().then(({ data }) => {
      if (!alive) return;
      setTemplates(Array.isArray(data) ? data : data?.templates || []);
    }).catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const hasSpeech = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceSupported(Boolean(hasSpeech));
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
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        if (listening) {
          try { recognitionRef.current.stop(); } catch (_) {}
        }
      }
    };
  }, [listening]);

  const missionTemplates = useMemo(() => {
    const serverTemplates = Array.isArray(templates) ? templates : [];
    return serverTemplates.length > 0 ? serverTemplates : QUICK_MISSIONS;
  }, [templates]);

  const currentUserId = user?.id || user?._id || householdProfile?.id || null;

  const performSearch = async (text) => {
    const user_prompt = String(text || query).trim();
    if (!user_prompt || loading) return;

    setLoading(true);
    setSuggestions([]);

    try {
      const { data } = await ai.shop({ user_prompt, userId: currentUserId });
      const nextResults = Array.isArray(data.products) ? data.products : [];

      actions.trackMission({
        intentId: data.intentId || `${Date.now()}`,
        intent: data.intentSummary?.parsedIntent || user_prompt,
        prompt: user_prompt,
        parsedSlots: data.parsedSlots || data.intentSummary || {},
        products: nextResults,
        urgency: data.intentSummary?.urgency || 'medium'
      });

      actions.setCurrentSlots(data.intentSummary || data.parsedSlots || {});
      actions.setAiResults(nextResults);
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

  const handleMicToggle = () => {
    if (!voiceSupported) return;

    if (listening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setQuery(transcript);
        performSearch(transcript);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
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

  const activeMission = recentMissions[0] || null;

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[radial-gradient(circle_at_top,_rgba(255,153,0,0.10),_transparent_32%),linear-gradient(180deg,#fefefe_0%,#f7f7f7_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
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
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Search size={16} className="text-amazon-orange" /> Conversational Input Bar
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="relative">
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && performSearch(query)}
                    placeholder="Movie night snacks for 4 people under $20"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 pr-36 text-base text-slate-900 outline-none transition focus:border-amazon-orange focus:bg-white"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                    <button
                      onClick={handleMicToggle}
                      disabled={!voiceSupported}
                      className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-white shadow-sm transition ${listening ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-800'} disabled:cursor-not-allowed disabled:opacity-40`}
                      title={voiceSupported ? 'Use voice dictation' : 'Voice not supported in this browser'}
                    >
                      {listening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <button
                      onClick={() => performSearch(query)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-xl bg-amazon-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amazon-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      Search
                    </button>
                  </div>
                </div>

                {suggestions.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.text}-${index}`}
                        onClick={() => {
                          const structured = suggestion.type === 'category'
                            ? `I need ${suggestion.text} products`
                            : suggestion.type === 'mission'
                              ? suggestion.text
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

                <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
                    onDragLeave={() => setDropActive(false)}
                    onDrop={handleDrop}
                    className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${dropActive ? 'border-amazon-orange bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-amazon-orange hover:bg-amber-50/60'}`}
                  >
                    <UploadCloud className="mb-2 text-amazon-orange" size={28} />
                    <p className="font-semibold text-slate-900">Drop a product photo here</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Mimics the upload zone. Drop a file to generate a shopping prompt.</p>
                  </div>

                  <div className="rounded-2xl bg-[linear-gradient(180deg,#fff7e6,#ffffff)] p-5 ring-1 ring-amber-100">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Brain size={15} className="text-amazon-orange" /> Intent Parser Status
                    </h3>
                    <div className="mt-4 grid gap-3 text-sm">
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                        <span className="text-slate-500">Mission</span>
                        <span className="font-semibold text-slate-900">{currentSlots?.parsedIntent || activeMission?.intent || 'Waiting for input'}</span>
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
                          <span className="text-slate-500">Target brands</span>
                          <span className="text-xs text-slate-400">{(currentSlots?.brandHints || []).length || 0}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(currentSlots?.brandHints?.length ? currentSlots.brandHints : ['No filters']).map((brand) => (
                            <span key={brand} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {brand}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Slots</span>
                          <span className="text-xs text-slate-400">Live</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <span>Quantity: {currentSlots?.quantity?.value || currentSlots?.quantity || 1}</span>
                          <span>Occasion: {currentSlots?.occasion || 'general'}</span>
                          <span>Confidence: {Math.round((currentSlots?.confidence || 0) * 100)}%</span>
                          <span>Categories: {(currentSlots?.categories || []).join(', ') || 'none'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShoppingBag size={16} className="text-amazon-orange" /> AI-Ranked Results Grid
              </div>

              {loading ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="animate-spin text-amazon-orange" size={34} />
                  <div className="text-sm font-medium">Ranking products and generating substitutions…</div>
                </div>
              ) : aiResults.length > 0 ? (
                <div className="mt-4 grid gap-4">
                  {aiResults.map((product) => (
                    <ResultCard
                      key={product._id}
                      product={product}
                      isOpen={openProductId === product._id}
                      onToggle={() => setOpenProductId(openProductId === product._id ? null : product._id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Search something to populate ranked results.
                </div>
              )}
            </div>

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
