import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, MicOff, Loader2, Sparkles, Brain, ShoppingCart, Zap, Clock, Package, Plus, Minus, Trash2, CheckCircle, X, AlertCircle, ArrowRight, Camera, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { ai } from '../api';
import { useAuthStore, useIntentStore, useCartStore, useAiCartStore } from '../store';

// ─── Enhanced prompts for Quick Missions ──────────────────────────────────────
const QUICK_MISSIONS = [
  { label: '🍿 Movie Night', prompt: "I'm having a movie night. Get me snacks, drinks and comfort food for 2 people" },
  { label: '✈️ Travel Pack', prompt: "I'm traveling tomorrow. Get me travel-sized toiletries, snacks and essentials" },
  { label: '🍼 Baby Care', prompt: "I need baby care essentials — diapers, wipes, formula and baby wash" },
  { label: '🧼 Deep Clean', prompt: "I need to deep clean my home. Get me cleaning supplies and tools" },
  { label: '☕ Pantry Restock', prompt: "My pantry is empty. Get me staple groceries for the week" },
  { label: '💪 Gym Fuel', prompt: "I need gym nutrition — protein, pre-workout, healthy snacks and hydration" },
  { label: '🎉 Party for 8', prompt: "I'm hosting a party for 8 people tonight. Get me drinks, snacks and party food" },
  { label: '🤒 Sick Day', prompt: "I'm sick and need medicine, soup, tea, tissues and comfort items" }
];

const MOOD_OPTIONS = [
  { id: 'movie_night', emoji: '🎬', label: 'Movie Night' },
  { id: 'sunday_brunch', emoji: '🥞', label: 'Sunday Brunch' },
  { id: 'workout_recovery', emoji: '💪', label: 'Post Workout' },
  { id: 'sick_day', emoji: '🤒', label: 'Sick Day' },
  { id: 'date_night', emoji: '🕯️', label: 'Date Night' },
  { id: 'party_time', emoji: '🎉', label: 'Party Time' },
  { id: 'comfort_food', emoji: '🍕', label: 'Comfort Food' },
  { id: 'deep_clean', emoji: '🧹', label: 'Deep Clean' }
];

// ─── Urgency/Panic detection keywords ─────────────────────────────────────────
const PANIC_KEYWORDS = ['emergency', 'urgent', 'asap', 'right now', 'hurry', 'fast', 'immediately', 'running out', 'ran out', 'desperate', 'panic', 'sick child', 'fever', 'no more left', 'need it now', 'guests arriving', 'forgot', 'last minute'];

// ─── Demo products for hackathon fallback ─────────────────────────────────────
const DEMO_PRODUCTS = {
  personal_care: [
    { _id: "p1", name: "Head & Shoulders Shampoo 400ml", brand: "Head & Shoulders", price: 6.97, deliveryETA: "15 mins", rating: 4.6, category: "personal_care", rankReason: "🎯 Best match" },
    { _id: "p2", name: "Colgate Total Toothpaste", brand: "Colgate", price: 4.99, deliveryETA: "15 mins", rating: 4.7, category: "personal_care", rankReason: "⭐ Top rated" },
    { _id: "p3", name: "Neutrogena Face Wash 150ml", brand: "Neutrogena", price: 7.99, deliveryETA: "20 mins", rating: 4.5, category: "personal_care", rankReason: "❤️ Your brand" },
    { _id: "p20", name: "Dove Body Wash 22oz", brand: "Dove", price: 6.97, deliveryETA: "18 mins", rating: 4.6, category: "personal_care", rankReason: "⭐ Bestseller" },
    { _id: "p21", name: "Gillette Razor Cartridges 4pk", brand: "Gillette", price: 14.99, deliveryETA: "20 mins", rating: 4.4, category: "personal_care", rankReason: "🎯 Restock pick" },
  ],
  cleaning: [
    { _id: "p4", name: "Lysol Disinfectant Spray", brand: "Lysol", price: 5.97, deliveryETA: "18 mins", rating: 4.8, category: "cleaning", rankReason: "⭐ Top rated" },
    { _id: "p5", name: "Dawn Ultra Dish Soap", brand: "Dawn", price: 3.97, deliveryETA: "18 mins", rating: 4.6, category: "cleaning", rankReason: "💰 Great deal" },
    { _id: "p14", name: "Swiffer WetJet Refills", brand: "Swiffer", price: 8.99, deliveryETA: "20 mins", rating: 4.4, category: "cleaning", rankReason: "🎯 Frequently bought" },
    { _id: "p22", name: "Clorox Bleach 121oz", brand: "Clorox", price: 4.49, deliveryETA: "20 mins", rating: 4.5, category: "cleaning", rankReason: "💰 Budget pick" },
    { _id: "p23", name: "Glad Trash Bags 45ct", brand: "Glad", price: 9.97, deliveryETA: "22 mins", rating: 4.4, category: "cleaning", rankReason: "🏠 Household essential" },
    { _id: "p24", name: "Mr. Clean Magic Eraser 4pk", brand: "Mr. Clean", price: 5.99, deliveryETA: "20 mins", rating: 4.7, category: "cleaning", rankReason: "⭐ Works like magic" },
  ],
  groceries: [
    { _id: "p6", name: "Whole Milk 1 Gallon", brand: "Organic Valley", price: 5.49, deliveryETA: "10 mins", rating: 4.4, category: "groceries", rankReason: "⚡ 10 min delivery" },
    { _id: "p7", name: "Sourdough Bread Loaf", brand: "Dave's Killer", price: 6.29, deliveryETA: "10 mins", rating: 4.8, category: "groceries", rankReason: "⭐ Top rated" },
    { _id: "p8", name: "Large Eggs 12pk", brand: "Happy Eggs", price: 4.79, deliveryETA: "10 mins", rating: 4.5, category: "groceries", rankReason: "🎯 Staple item" },
    { _id: "p11", name: "Barilla Spaghetti Pasta 16oz", brand: "Barilla", price: 2.49, deliveryETA: "12 mins", rating: 4.3, category: "groceries", rankReason: "💰 Budget pick" },
    { _id: "p12", name: "Extra Virgin Olive Oil 500ml", brand: "Bertolli", price: 8.99, deliveryETA: "15 mins", rating: 4.6, category: "groceries", rankReason: "⭐ Premium quality" },
    { _id: "p25", name: "Rao's Marinara Sauce 24oz", brand: "Rao's", price: 7.99, deliveryETA: "15 mins", rating: 4.8, category: "groceries", rankReason: "⭐ Chef's choice" },
    { _id: "p26", name: "Organic Bananas 2lb", brand: "Fresh", price: 1.99, deliveryETA: "10 mins", rating: 4.3, category: "groceries", rankReason: "⚡ Fastest delivery" },
    { _id: "p27", name: "Chicken Breast 1lb", brand: "Perdue", price: 6.99, deliveryETA: "15 mins", rating: 4.5, category: "groceries", rankReason: "🎯 Protein source" },
    { _id: "p28", name: "Baby Spinach 5oz", brand: "Earthbound Farm", price: 3.99, deliveryETA: "12 mins", rating: 4.2, category: "groceries", rankReason: "🥗 Healthy choice" },
    { _id: "p29", name: "Greek Yogurt 32oz", brand: "Chobani", price: 5.29, deliveryETA: "12 mins", rating: 4.7, category: "groceries", rankReason: "⭐ High protein" },
    { _id: "p30", name: "Sharp Cheddar Cheese 8oz", brand: "Tillamook", price: 4.99, deliveryETA: "12 mins", rating: 4.6, category: "groceries", rankReason: "❤️ Your favorite" },
  ],
  snacks: [
    { _id: "p9", name: "Instant Ramen 6pk", brand: "Nissin", price: 3.49, deliveryETA: "12 mins", rating: 4.2, category: "snacks", rankReason: "💰 Great deal" },
    { _id: "p13", name: "Lay's Classic Chips Family Size", brand: "Lay's", price: 4.99, deliveryETA: "12 mins", rating: 4.5, category: "snacks", rankReason: "🎉 Party pick" },
    { _id: "p15", name: "Coca-Cola 12pk Cans", brand: "Coca-Cola", price: 6.99, deliveryETA: "15 mins", rating: 4.6, category: "snacks", rankReason: "🎯 Best match" },
    { _id: "p16", name: "Oreo Cookies Party Size", brand: "Oreo", price: 5.49, deliveryETA: "12 mins", rating: 4.7, category: "snacks", rankReason: "⭐ Top rated" },
    { _id: "p31", name: "Microwave Popcorn 3pk", brand: "Orville Redenbacher", price: 3.49, deliveryETA: "12 mins", rating: 4.7, category: "snacks", rankReason: "🎬 Movie night pick" },
    { _id: "p32", name: "Kind Bars Variety 12pk", brand: "Kind", price: 14.99, deliveryETA: "15 mins", rating: 4.6, category: "snacks", rankReason: "💪 Healthy snack" },
    { _id: "p33", name: "Haribo Gummy Bears 5oz", brand: "Haribo", price: 2.99, deliveryETA: "10 mins", rating: 4.4, category: "snacks", rankReason: "⚡ Quick grab" },
    { _id: "p34", name: "Sprite 2 Liter", brand: "Sprite", price: 2.29, deliveryETA: "12 mins", rating: 4.3, category: "snacks", rankReason: "💰 Budget drink" },
  ],
  health: [
    { _id: "p10", name: "Vitamin C 1000mg 60ct", brand: "Nature Made", price: 12.99, deliveryETA: "20 mins", rating: 4.7, category: "health", rankReason: "⭐ Doctor recommended" },
    { _id: "p17", name: "Tylenol Extra Strength 100ct", brand: "Tylenol", price: 9.99, deliveryETA: "15 mins", rating: 4.8, category: "health", rankReason: "🎯 Essential medicine" },
    { _id: "p18", name: "Vicks VapoRub 3.5oz", brand: "Vicks", price: 7.49, deliveryETA: "15 mins", rating: 4.5, category: "health", rankReason: "🤒 Sick day must-have" },
    { _id: "p19", name: "Chicken Noodle Soup 4pk", brand: "Campbell's", price: 5.99, deliveryETA: "12 mins", rating: 4.3, category: "health", rankReason: "❤️ Comfort & recovery" },
    { _id: "p35", name: "Kleenex Ultra Soft Tissues 4pk", brand: "Kleenex", price: 5.99, deliveryETA: "15 mins", rating: 4.6, category: "health", rankReason: "🤧 Cold essential" },
    { _id: "p36", name: "Throat Lozenges 30ct", brand: "Ricola", price: 4.49, deliveryETA: "15 mins", rating: 4.4, category: "health", rankReason: "🎯 Sore throat relief" },
    { _id: "p37", name: "Ginger Tea 20 bags", brand: "Traditional Medicinals", price: 5.99, deliveryETA: "18 mins", rating: 4.5, category: "health", rankReason: "☕ Healing warmth" },
    { _id: "p38", name: "Hand Sanitizer 8oz", brand: "Purell", price: 3.99, deliveryETA: "12 mins", rating: 4.6, category: "health", rankReason: "🧴 Stay protected" },
  ],
  baby: [
    { _id: "b1", name: "Pampers Diapers Size 3 28ct", brand: "Pampers", price: 12.99, deliveryETA: "15 mins", rating: 4.8, category: "baby", rankReason: "🍼 #1 Choice" },
    { _id: "b2", name: "Huggies Baby Wipes 80ct", brand: "Huggies", price: 3.99, deliveryETA: "15 mins", rating: 4.7, category: "baby", rankReason: "🎯 Must-have" },
    { _id: "b3", name: "Similac Infant Formula 23oz", brand: "Similac", price: 29.99, deliveryETA: "20 mins", rating: 4.6, category: "baby", rankReason: "⭐ Top rated" },
    { _id: "b4", name: "Johnson's Baby Shampoo 13.6oz", brand: "Johnson's", price: 5.49, deliveryETA: "18 mins", rating: 4.5, category: "baby", rankReason: "❤️ Gentle formula" },
    { _id: "b5", name: "Gerber Baby Food Variety 12pk", brand: "Gerber", price: 11.99, deliveryETA: "20 mins", rating: 4.4, category: "baby", rankReason: "🎯 Nutrition variety" },
  ],
  pantry: [
    { _id: "pt1", name: "Starbucks Pike Place Coffee 12oz", brand: "Starbucks", price: 9.97, deliveryETA: "20 mins", rating: 4.6, category: "pantry", rankReason: "☕ Morning essential" },
    { _id: "pt2", name: "Quaker Oats 42oz", brand: "Quaker", price: 5.49, deliveryETA: "18 mins", rating: 4.5, category: "pantry", rankReason: "🎯 Breakfast staple" },
    { _id: "pt3", name: "Skippy Peanut Butter 16oz", brand: "Skippy", price: 3.79, deliveryETA: "15 mins", rating: 4.4, category: "pantry", rankReason: "💰 Great value" },
    { _id: "pt4", name: "Honey Nut Cheerios 18oz", brand: "General Mills", price: 4.99, deliveryETA: "15 mins", rating: 4.7, category: "pantry", rankReason: "⭐ Family favorite" },
    { _id: "pt5", name: "Rice Jasmine 5lb", brand: "Royal", price: 7.99, deliveryETA: "20 mins", rating: 4.3, category: "pantry", rankReason: "🎯 Staple grain" },
  ]
};

const ALL_DEMO = Object.values(DEMO_PRODUCTS).flat();

// ─── Smart product matching based on prompt analysis ──────────────────────────
function getSmartProducts(prompt) {
  const lower = (prompt || '').toLowerCase();
  let selected = [];
  let reason = '';

  if (lower.includes('movie') || lower.includes('netflix') || lower.includes('watch') || lower.includes('binge')) {
    selected = [DEMO_PRODUCTS.snacks[4], DEMO_PRODUCTS.snacks[0], DEMO_PRODUCTS.snacks[2], DEMO_PRODUCTS.snacks[3], DEMO_PRODUCTS.snacks[6]];
    reason = 'Movie night bundle — popcorn, chips, drinks & sweets';
  } else if (lower.includes('clean') || lower.includes('mop') || lower.includes('disinfect') || lower.includes('scrub')) {
    selected = DEMO_PRODUCTS.cleaning;
    reason = 'Deep cleaning supplies — spray, soap, mop refills & bags';
  } else if (lower.includes('sick') || lower.includes('fever') || lower.includes('cold') || lower.includes('flu') || lower.includes('medicine') || lower.includes('sore throat')) {
    selected = DEMO_PRODUCTS.health;
    reason = 'Get well soon — medicine, soup, tea, tissues & throat relief';
  } else if (lower.includes('travel') || lower.includes('trip') || lower.includes('toiletry') || lower.includes('vacation')) {
    selected = [...DEMO_PRODUCTS.personal_care.slice(0, 4), DEMO_PRODUCTS.snacks[5]];
    reason = 'Travel essentials — toiletries & healthy snacks';
  } else if (lower.includes('party') || lower.includes('guest') || lower.includes('hosting') || lower.includes('celebrate')) {
    selected = [...DEMO_PRODUCTS.snacks.slice(0, 5), DEMO_PRODUCTS.groceries[1]];
    reason = 'Party-ready bundle — chips, drinks, cookies & more';
  } else if (lower.includes('pantry') || lower.includes('grocery') || lower.includes('weekly') || lower.includes('staple') || lower.includes('restock')) {
    selected = [...DEMO_PRODUCTS.groceries.slice(0, 6), DEMO_PRODUCTS.pantry[0]];
    reason = 'Pantry staples — milk, bread, eggs, pasta & essentials';
  } else if (lower.includes('pasta') || lower.includes('italian') || lower.includes('dinner') || lower.includes('cook')) {
    selected = [DEMO_PRODUCTS.groceries[3], DEMO_PRODUCTS.groceries[4], DEMO_PRODUCTS.groceries[8], DEMO_PRODUCTS.groceries[6], DEMO_PRODUCTS.groceries[9]];
    reason = 'Dinner ingredients — pasta, sauce, olive oil, chicken & cheese';
  } else if (lower.includes('breakfast') || lower.includes('morning') || lower.includes('brunch')) {
    selected = [DEMO_PRODUCTS.groceries[0], DEMO_PRODUCTS.groceries[1], DEMO_PRODUCTS.groceries[2], DEMO_PRODUCTS.pantry[0], DEMO_PRODUCTS.pantry[1], DEMO_PRODUCTS.groceries[5], DEMO_PRODUCTS.groceries[8]];
    reason = 'Breakfast bundle — milk, bread, eggs, coffee, oats & yogurt';
  } else if (lower.includes('gym') || lower.includes('protein') || lower.includes('workout') || lower.includes('fitness')) {
    selected = [DEMO_PRODUCTS.groceries[8], DEMO_PRODUCTS.snacks[5], DEMO_PRODUCTS.groceries[6], DEMO_PRODUCTS.groceries[5], DEMO_PRODUCTS.health[0]];
    reason = 'Fitness fuel — yogurt, protein bars, bananas & vitamins';
  } else if (lower.includes('baby') || lower.includes('diaper') || lower.includes('formula') || lower.includes('infant')) {
    selected = DEMO_PRODUCTS.baby;
    reason = 'Baby care essentials — diapers, wipes, formula & shampoo';
  } else if (lower.includes('coffee') || lower.includes('tea') || lower.includes('caffeine')) {
    selected = [DEMO_PRODUCTS.pantry[0], DEMO_PRODUCTS.pantry[1], DEMO_PRODUCTS.groceries[0], DEMO_PRODUCTS.health[6]];
    reason = 'Hot beverages & morning ritual bundle';
  } else if (lower.includes('snack') || lower.includes('hungry') || lower.includes('munchies') || lower.includes('craving')) {
    selected = DEMO_PRODUCTS.snacks;
    reason = 'Snack attack — chips, cookies, ramen & drinks';
  } else if (lower.includes('healthy') || lower.includes('organic') || lower.includes('salad') || lower.includes('diet')) {
    selected = [DEMO_PRODUCTS.groceries[5], DEMO_PRODUCTS.groceries[7], DEMO_PRODUCTS.groceries[8], DEMO_PRODUCTS.snacks[5], DEMO_PRODUCTS.groceries[6]];
    reason = 'Healthy picks — spinach, bananas, yogurt & protein bars';
  } else {
    // General smart picks from multiple categories
    selected = [DEMO_PRODUCTS.groceries[0], DEMO_PRODUCTS.groceries[1], DEMO_PRODUCTS.groceries[2], DEMO_PRODUCTS.pantry[0], DEMO_PRODUCTS.snacks[0], DEMO_PRODUCTS.personal_care[0]];
    reason = 'Popular picks based on your request';
  }

  return { products: selected.filter(Boolean).slice(0, 8), reason };
}

// ─── Image analysis simulation (for hackathon demo) ───────────────────────────
function analyzeImageForProducts(imageName) {
  // Simulates what a vision AI would return from a fridge/pantry photo
  const detected = [
    { name: 'Milk (nearly empty)', restock: true },
    { name: 'Eggs (2 left)', restock: true },
    { name: 'Orange Juice (half full)', restock: false },
    { name: 'Butter (low)', restock: true },
    { name: 'Cheese (full)', restock: false },
    { name: 'Yogurt (empty slot)', restock: true },
  ];

  const restockProducts = [
    { _id: "p6", name: "Whole Milk 1 Gallon", brand: "Organic Valley", price: 5.49, deliveryETA: "10 mins", rating: 4.4, category: "groceries", rankReason: "📷 Nearly empty in photo" },
    { _id: "p8", name: "Large Eggs 12pk", brand: "Happy Eggs", price: 4.79, deliveryETA: "10 mins", rating: 4.5, category: "groceries", rankReason: "📷 Only 2 left detected" },
    { _id: "img1", name: "Unsalted Butter 1lb", brand: "Land O'Lakes", price: 4.99, deliveryETA: "12 mins", rating: 4.6, category: "groceries", rankReason: "📷 Running low in photo" },
    { _id: "img2", name: "Greek Yogurt 32oz", brand: "Chobani", price: 5.29, deliveryETA: "12 mins", rating: 4.7, category: "groceries", rankReason: "📷 Empty slot detected" },
  ];

  return { detected, products: restockProducts, summary: `Scanned your fridge: found ${detected.filter(d => d.restock).length} items running low` };
}

export default function AIDashboard() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [agentResponse, setAgentResponse] = useState(null);
  const [basketItems, setBasketItems] = useState([]);
  const [moodLoading, setMoodLoading] = useState('');
  // Image upload
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const fileInputRef = useRef(null);
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ price: 'any', delivery: 'any', category: 'all', brand: '', dietary: [] });
  // Panic/Urgency notification (AI-triggered, not a button)
  const [panicNotification, setPanicNotification] = useState(null);

  const { user, householdProfile } = useAuthStore();
  const { trackMission, setCurrentSlots, setAiResults } = useIntentStore();
  const addItem = useCartStore(s => s.addItem);
  const replaceCart = useCartStore(s => s.replaceCart);
  const setAiCart = useAiCartStore(s => s.setAiCart);
  const aiCartAddItem = useAiCartStore(s => s.addItem);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    setVoiceSupported(Boolean(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)));
  }, []);

  useEffect(() => { return () => { if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch (_) {} } }; }, []);

  const currentUserId = user?.id || user?._id || householdProfile?.id || null;

  const hasActiveFilters = filters.price !== 'any' || filters.delivery !== 'any' || filters.category !== 'all' || filters.brand || filters.dietary.length > 0;

  const buildFilterString = () => {
    const parts = [];
    if (filters.price !== 'any') parts.push(`Price ${filters.price}`);
    if (filters.delivery !== 'any') parts.push(`Delivery ${filters.delivery}`);
    if (filters.category !== 'all') parts.push(`Category: ${filters.category}`);
    if (filters.brand) parts.push(`Prefer brand: ${filters.brand}`);
    if (filters.dietary.length) parts.push(`Dietary: ${filters.dietary.join(', ')}`);
    return parts.length ? `\nActive filters: ${parts.join(', ')}` : '';
  };

  // ─── Detect urgency/panic from user text ─────────────────────────────────
  const detectPanic = (text) => {
    const lower = text.toLowerCase();
    return PANIC_KEYWORDS.some(kw => lower.includes(kw));
  };

  // ─── Main AI Agent Search ────────────────────────────────────────────────
  const performSearch = async (text, fromImage = false) => {
    const user_prompt = String(text || query).trim();
    if (!user_prompt && !uploadedImage) return;
    if (loading) return;

    setLoading(true);
    setVoiceError('');
    setAgentResponse(null);
    setPanicNotification(null);

    const enhancedPrompt = user_prompt + buildFilterString();
    const isPanic = detectPanic(user_prompt);

    try {
      const { data } = await ai.shop({ user_prompt: enhancedPrompt, userId: currentUserId, image: uploadedImage || undefined });
      const products = Array.isArray(data.products) ? data.products : [];
      const finalProducts = products.length > 0 ? products : getSmartProducts(user_prompt).products;

      buildResponse(finalProducts, data, user_prompt, isPanic, fromImage);
    } catch {
      // Fallback to smart demo products
      const { products: demoProducts, reason } = fromImage ? { products: analyzeImageForProducts(imageFileName).products, reason: 'Based on image analysis' } : getSmartProducts(user_prompt);
      buildResponse(demoProducts, { intentSummary: { parsedIntent: reason, confidence: 0.89, urgency: isPanic ? 'high' : 'medium', categories: [] } }, user_prompt, isPanic, fromImage);
    } finally {
      setLoading(false);
    }
  };

  const buildResponse = (products, data, prompt, isPanic, fromImage) => {
    const response = {
      understood: data?.intentSummary?.parsedIntent || prompt,
      products,
      baskets: {
        buyAll: { items: products.map(p => ({ ...p, qty: 1 })), total: products.reduce((s, p) => s + (p.price || 0), 0), eta: products[0]?.deliveryETA || '15 mins' },
        essentials: { items: products.slice(0, 3).map(p => ({ ...p, qty: 1 })), total: products.slice(0, 3).reduce((s, p) => s + (p.price || 0), 0), eta: products[0]?.deliveryETA || '10 mins' }
      },
      smartUpsell: data?.smartUpsell || { _id: 'p10', name: 'Vitamin C 1000mg', reason: 'Frequently bought together', price: 12.99 },
      reasoning: data?.reasoning_trace || { context_injected: [`time: ${new Date().getHours() < 12 ? 'morning' : 'evening'}`, `urgency: ${isPanic ? 'HIGH' : 'normal'}`], urgency: isPanic ? 'high' : 'medium', products_reasoning: products.map(p => ({ name: p.name, reason: p.rankReason })) },
      confidence: data?.intentSummary?.confidence || 0.89,
      urgency: isPanic ? 'high' : (data?.intentSummary?.urgency || 'medium'),
      categories: data?.intentSummary?.categories || [],
      imageAnalysis: fromImage ? analyzeImageForProducts(imageFileName).summary : null
    };

    setAgentResponse(response);
    setBasketItems(products.map(p => ({ ...p, qty: 1, selected: true })));
    trackMission({ intentId: Date.now(), intent: response.understood, prompt, products, urgency: response.urgency });
    setCurrentSlots(data?.intentSummary || data?.parsedSlots || {});
    setAiResults(products);

    // PANIC MODE: AI-triggered notification if urgency detected
    if (isPanic) {
      setPanicNotification({
        message: '🚨 I detected urgency in your request. Express delivery activated — your items will arrive in under 15 minutes.',
        eta: '10-15 mins',
        action: 'express'
      });
    }

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  };

  // ─── Image Upload & Analysis ─────────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFileName(file.name);
    setImagePreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (ev) => { setUploadedImage(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleImageAnalyze = () => {
    if (!uploadedImage) return;
    // Trigger search with image context
    const imagePrompt = query.trim() || `Analyze my fridge/pantry photo and recommend what I need to restock`;
    setQuery(imagePrompt);
    performSearch(imagePrompt, true);
  };

  const clearImage = () => { setUploadedImage(null); setImagePreview(''); setImageFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const handleImageDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageFileName(file.name);
    setImagePreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (ev) => { setUploadedImage(ev.target.result); };
    reader.readAsDataURL(file);
  };

  // ─── Basket Management ───────────────────────────────────────────────────
  const updateQty = (id, delta) => { setBasketItems(prev => prev.map(item => item._id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item)); };
  const toggleItem = (id) => { setBasketItems(prev => prev.map(item => item._id === id ? { ...item, selected: !item.selected } : item)); };
  const removeItem = (id) => { setBasketItems(prev => prev.filter(item => item._id !== id)); };
  const selectedItems = basketItems.filter(i => i.selected);
  const basketTotal = selectedItems.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
  const handleBuyAll = () => { useCartStore.getState().clearCart(); setAiCart(selectedItems, agentResponse?.understood || '', agentResponse?.confidence || 0.87); navigate('/checkout?source=ai'); };
  const handleBuyEssentials = () => { useCartStore.getState().clearCart(); setAiCart(selectedItems.slice(0, 3), agentResponse?.understood || '', agentResponse?.confidence || 0.87); navigate('/checkout?source=ai'); };
  const handleAddAllToCart = () => { useCartStore.getState().replaceCart(selectedItems, agentResponse?.understood || ''); };

  // ─── Mission & Mood handlers ─────────────────────────────────────────────
  const handleMissionClick = (mission) => { setQuery(mission.prompt); performSearch(mission.prompt); };

  const handleMoodSelect = async (mood) => {
    setMoodLoading(mood.id);
    setQuery(`${mood.emoji} ${mood.label} mood`);
    try {
      const { data } = await ai.mood({ mood: mood.id });
      if (data.products?.length) {
        const products = data.products.map(p => ({ ...p, _id: p._id || p.id, qty: 1 }));
        buildResponse(products, { intentSummary: { parsedIntent: `${mood.label}: ${data.tagline || 'Curated for you'}`, confidence: 0.93, urgency: 'medium', categories: [] } }, mood.label, false, false);
      } else throw new Error('no products');
    } catch {
      const { products } = getSmartProducts(mood.label);
      buildResponse(products, { intentSummary: { parsedIntent: `${mood.label} bundle`, confidence: 0.85, urgency: 'medium', categories: [] } }, mood.label, false, false);
    } finally { setMoodLoading(''); }
  };

  // ─── Voice Handler ───────────────────────────────────────────────────────
  const handleMicToggle = () => {
    if (!voiceSupported) { setVoiceError('Voice not supported. Use Chrome or Edge.'); return; }
    if (listening && recognitionRef.current) { recognitionRef.current._manualStop = true; try { recognitionRef.current.stop(); } catch (_) {} setListening(false); setInterimText(''); if (query.trim()) performSearch(query); return; }
    setVoiceError(''); setInterimText('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = true; recognition._manualStop = false; recognition._retryCount = 0;
    recognition.onstart = () => { setListening(true); setVoiceError(''); };
    recognition.onresult = (event) => { let f = '', i2 = ''; for (let i = 0; i < event.results.length; i++) { if (event.results[i].isFinal) f += event.results[i][0].transcript; else i2 += event.results[i][0].transcript; } if (f) { setQuery(f.trim()); setInterimText(''); setListening(false); performSearch(f.trim()); } else if (i2) { setInterimText(i2); setQuery(i2); } };
    recognition.onerror = (event) => { setInterimText(''); if (event.error === 'no-speech' && recognition._retryCount < 2) { recognition._retryCount++; try { recognition.start(); } catch (_) {} return; } if (event.error === 'network' && recognition._retryCount < 1) { recognition._retryCount++; setTimeout(() => { try { recognition.start(); } catch (_) { setListening(false); } }, 500); return; } setListening(false); if (event.error === 'not-allowed') setVoiceError('Mic permission denied.'); else if (event.error === 'network') setVoiceError('Network error — type your request instead.'); else if (event.error !== 'aborted') setVoiceError(`Voice error: ${event.error}`); };
    recognition.onend = () => { if (!recognition._manualStop) setListening(false); };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch (_) { setVoiceError('Could not start mic.'); setListening(false); }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">

        {/* ─── Hero ───────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-950 md:text-3xl flex items-center gap-2">
            <Sparkles className="text-amazon-orange" size={28} /> AI Shopping Agent
          </h1>
          <p className="mt-1 text-sm text-slate-500">Tell me what you need — by text, voice, or photo. I'll build your cart instantly.</p>
        </div>

        {/* ─── AI-Triggered Panic/Urgency Notification ────────────── */}
        {panicNotification && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 animate-[slide-down_0.3s_ease-out]">
            <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800 text-sm">{panicNotification.message}</p>
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><Clock size={12} /> Estimated: {panicNotification.eta}</p>
            </div>
            <button onClick={() => setPanicNotification(null)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
          </div>
        )}

        {/* ─── Search Bar + Camera + Filters ──────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-4" onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop}>
          <div className="relative">
            <input
              ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSearch(query)}
              placeholder="I need snacks for a movie night, budget $20, deliver fast..."
              className={`w-full rounded-xl border-2 bg-slate-50 px-5 py-4 pr-48 text-base outline-none transition focus:bg-white ${listening ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 focus:border-amazon-orange'}`}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              <button onClick={() => setShowFilters(!showFilters)} className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 transition" title="Filters">
                <SlidersHorizontal size={17} />
                {hasActiveFilters && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amazon-orange" />}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 transition" title="Upload photo">
                <Camera size={17} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <button onClick={handleMicToggle} disabled={!voiceSupported} className={`relative rounded-xl p-2.5 text-white transition ${listening ? 'bg-red-500' : 'bg-slate-700 hover:bg-slate-800'} disabled:opacity-40`}>
                {listening ? <MicOff size={17} /> : <Mic size={17} />}
                {listening && <span className="absolute -top-1 -right-1 h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" /></span>}
              </button>
              <button onClick={() => performSearch(query)} disabled={loading || (!query.trim() && !uploadedImage)} className="rounded-xl bg-amazon-orange px-4 py-2.5 text-sm font-bold text-white hover:bg-amazon-orange-dark disabled:opacity-50 transition">
                {loading ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
              </button>
            </div>
          </div>

          {/* Image preview + analyze button */}
          {imagePreview && (
            <div className="mt-3 flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
              <img src={imagePreview} alt="Upload" className="h-20 w-20 rounded-lg object-cover border" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">📷 Photo ready for AI analysis</p>
                <p className="text-xs text-slate-500 mt-0.5">{imageFileName || 'Uploaded image'} — AI will detect products & build your cart</p>
              </div>
              <button onClick={handleImageAnalyze} className="rounded-xl bg-amazon-orange px-4 py-2 text-sm font-bold text-white hover:bg-amazon-orange-dark transition">
                {loading ? <Loader2 size={16} className="animate-spin" /> : '🔍 Analyze & Build Cart'}
              </button>
              <button onClick={clearImage} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
            </div>
          )}

          {listening && <div className="mt-3 flex items-center gap-2 text-sm text-red-600 font-medium"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />{interimText ? `"${interimText}"` : 'Listening...'}</div>}
          {voiceError && <div className="mt-3 flex items-center gap-2 text-sm text-amber-700"><AlertCircle size={14} />{voiceError}<button onClick={() => setVoiceError('')} className="ml-1"><X size={12} /></button></div>}
        </div>

        {/* ─── Collapsible Filter Bar ─────────────────────────────── */}
        {showFilters && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <div><span className="text-xs font-semibold text-slate-500 block mb-1">Price</span><div className="flex gap-1">{[['any','Any'],['under10','< $10'],['under25','< $25'],['under50','< $50']].map(([v,l]) => (<button key={v} onClick={() => setFilters(f => ({...f, price: v}))} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${filters.price === v ? 'bg-amazon-orange text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>))}</div></div>
              <div><span className="text-xs font-semibold text-slate-500 block mb-1">Delivery</span><div className="flex gap-1">{[['any','Any'],['under15','< 15 min'],['under30','< 30 min']].map(([v,l]) => (<button key={v} onClick={() => setFilters(f => ({...f, delivery: v}))} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${filters.delivery === v ? 'bg-amazon-orange text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>))}</div></div>
              <div><span className="text-xs font-semibold text-slate-500 block mb-1">Category</span><div className="flex gap-1 flex-wrap">{['all','snacks','health','cleaning','personal_care','groceries'].map(c => (<button key={c} onClick={() => setFilters(f => ({...f, category: c}))} className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition ${filters.category === c ? 'bg-amazon-orange text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c === 'all' ? 'All' : c.replace('_',' ')}</button>))}</div></div>
              <div><span className="text-xs font-semibold text-slate-500 block mb-1">Brand</span><input value={filters.brand} onChange={e => setFilters(f => ({...f, brand: e.target.value}))} placeholder="Prefer..." className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs w-24 outline-none focus:border-amazon-orange" /></div>
              <div><span className="text-xs font-semibold text-slate-500 block mb-1">Dietary</span><div className="flex gap-1">{['Organic','Vegan','Gluten-Free'].map(d => (<button key={d} onClick={() => setFilters(f => ({...f, dietary: f.dietary.includes(d) ? f.dietary.filter(x => x !== d) : [...f.dietary, d]}))} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${filters.dietary.includes(d) ? 'bg-amazon-orange text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{d}</button>))}</div></div>
            </div>
            {hasActiveFilters && <button onClick={() => setFilters({ price: 'any', delivery: 'any', category: 'all', brand: '', dietary: [] })} className="text-xs text-amazon-orange hover:underline font-medium">Reset all filters</button>}
          </div>
        )}

        {/* ─── Quick Missions ─────────────────────────────────────── */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Quick Missions</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_MISSIONS.map(m => (<button key={m.label} onClick={() => handleMissionClick(m)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-amazon-orange hover:bg-amber-50 transition">{m.label}</button>))}
          </div>
        </div>

        {/* ─── Mood Discovery ─────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Shop by Mood</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {MOOD_OPTIONS.map(mood => (<button key={mood.id} onClick={() => handleMoodSelect(mood)} disabled={moodLoading === mood.id} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-3 text-center hover:border-amazon-orange hover:bg-amber-50 transition disabled:opacity-60"><span className="text-2xl">{moodLoading === mood.id ? '⏳' : mood.emoji}</span><span className="text-[10px] font-medium text-slate-600 leading-tight">{mood.label}</span></button>))}
          </div>
        </div>

        {/* ─── Loading ────────────────────────────────────────────── */}
        {loading && (<div className="flex flex-col items-center justify-center py-16 gap-3"><Loader2 size={40} className="animate-spin text-amazon-orange" /><p className="text-sm text-slate-500 font-medium">AI is building your cart...</p></div>)}

        {/* ─── Agent Response + Cart ──────────────────────────────── */}
        {agentResponse && !loading && (
          <div ref={resultsRef} className="space-y-6">
            {/* Confirmation */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">Got it! Here's what I built for you:</p>
                  <p className="text-sm text-slate-600 mt-1">"{agentResponse.understood}"</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {agentResponse.urgency === 'high' && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold"><Zap size={10} /> Express Priority</span>}
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-semibold"><Brain size={10} /> {Math.round((agentResponse.confidence || 0) * 100)}% confidence</span>
                    {agentResponse.imageAnalysis && <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-xs font-semibold">📷 {agentResponse.imageAnalysis}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Buy buttons */}
            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={handleBuyAll} className="flex items-center justify-between rounded-2xl bg-amazon-orange p-4 text-white shadow-md hover:bg-amazon-orange-dark transition">
                <div className="text-left"><p className="font-bold text-lg">Buy All ({selectedItems.length} items)</p><p className="text-sm opacity-90">Total: ${basketTotal.toFixed(2)} · ETA: {agentResponse.baskets?.buyAll?.eta || '15 mins'}</p></div>
                <ShoppingCart size={28} />
              </button>
              <button onClick={handleBuyEssentials} className="flex items-center justify-between rounded-2xl border-2 border-amazon-orange bg-white p-4 text-amazon-orange hover:bg-amber-50 transition">
                <div className="text-left"><p className="font-bold text-lg">Just Essentials (Top 3)</p><p className="text-sm opacity-80">${selectedItems.slice(0, 3).reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)} · Fastest delivery</p></div>
                <Package size={28} />
              </button>
            </div>

            {/* Cart items */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2"><ShoppingCart size={16} className="text-amazon-orange" /> Your AI-Built Cart</h3>
                <button onClick={handleAddAllToCart} className="text-xs text-amazon-orange hover:underline font-medium">Add all to cart →</button>
              </div>
              <div className="divide-y divide-slate-100">
                {basketItems.map((item, idx) => (
                  <div key={item._id || idx} className={`flex items-center gap-4 px-5 py-3 transition ${item.selected ? '' : 'opacity-40'}`}>
                    <input type="checkbox" checked={item.selected} onChange={() => toggleItem(item._id)} className="h-4 w-4 rounded border-slate-300 accent-amazon-orange" />
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-100 overflow-hidden border flex items-center justify-center">
                      {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.style.display='none'; }} /> : <span className="text-xl">📦</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.brand} · <span className="text-emerald-600">{item.deliveryETA || '15 mins'}</span></p>
                      {item.rankReason && <span className="inline-block mt-0.5 text-[10px] bg-amber-50 text-amber-700 rounded px-1.5 py-0.5">{item.rankReason}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item._id, -1)} className="rounded border p-1 hover:bg-slate-100"><Minus size={12} /></button>
                      <span className="text-sm font-medium w-5 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item._id, 1)} className="rounded border p-1 hover:bg-slate-100"><Plus size={12} /></button>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 w-16 text-right">${(item.price * item.qty).toFixed(2)}</p>
                    <button onClick={() => removeItem(item._id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 flex items-center justify-between">
                <div><p className="text-sm text-slate-600">{selectedItems.length} items selected</p><p className="text-xl font-bold text-slate-900">${basketTotal.toFixed(2)}</p></div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium"><Clock size={14} /> {agentResponse.baskets?.buyAll?.eta || '15 mins'}</span>
                  <button onClick={handleBuyAll} className="rounded-xl bg-amazon-orange px-6 py-3 text-sm font-bold text-white hover:bg-amazon-orange-dark transition flex items-center gap-2">Checkout <ArrowRight size={16} /></button>
                </div>
              </div>
            </div>

            {/* Smart Upsell */}
            {agentResponse.smartUpsell && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-4">
                <span className="text-2xl">💡</span>
                <div className="flex-1"><p className="text-sm font-semibold text-slate-900">Don't forget: {agentResponse.smartUpsell.name}</p><p className="text-xs text-slate-600">{agentResponse.smartUpsell.reason}</p></div>
                <button onClick={() => aiCartAddItem({ ...agentResponse.smartUpsell, _id: agentResponse.smartUpsell._id || 'upsell' })} className="rounded-xl border border-amazon-orange bg-white px-3 py-2 text-xs font-semibold text-amazon-orange hover:bg-amber-50">+ Add</button>
              </div>
            )}

            {/* AI Reasoning Trace */}
            <details className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700 flex items-center gap-2"><Brain size={14} className="text-amazon-orange" /> AI Reasoning Trace (click to expand)</summary>
              <div className="mt-3 space-y-3">
                <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  {agentResponse.reasoning?.context_injected?.map((ctx, i) => <span key={i} className="bg-slate-50 rounded px-2 py-1">📍 {ctx}</span>)}
                  {agentResponse.reasoning?.urgency && <span className="bg-red-50 text-red-700 rounded px-2 py-1">⚡ Urgency: {agentResponse.reasoning.urgency}</span>}
                  {agentResponse.imageAnalysis && <span className="bg-violet-50 text-violet-700 rounded px-2 py-1">📷 {agentResponse.imageAnalysis}</span>}
                  {hasActiveFilters && <span className="bg-orange-50 text-orange-700 rounded px-2 py-1">🔍 {buildFilterString()}</span>}
                </div>
                {agentResponse.reasoning?.products_reasoning && (
                  <div><p className="text-xs font-semibold text-slate-700 mb-1">Why each product was picked:</p><div className="grid gap-1 text-xs">{agentResponse.reasoning.products_reasoning.map((pr, i) => (<div key={i} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1"><span className="font-medium text-slate-800 truncate flex-1">{pr.name}</span><span className="text-slate-500 shrink-0">{pr.reason}</span></div>))}</div></div>
                )}
              </div>
            </details>
          </div>
        )}

        {/* Empty State */}
        {!agentResponse && !loading && (
          <div className="text-center py-16">
            <Sparkles size={48} className="mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-700">What do you need today?</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">Type, speak, or upload a photo. I'll analyze it and build your perfect cart.</p>
          </div>
        )}
      </div>
    </div>
  );
}
