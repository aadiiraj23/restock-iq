/**
 * Context Engine - Ambient Context Injection for AI Shopping Agent
 * 
 * Silently injects environmental and behavioral context into AI reasoning:
 * 1. Time-of-day awareness (morning → breakfast, late night → snacks)
 * 2. Day-of-week patterns (Friday → weekend prep)
 * 3. User purchase history graph (30-day category distribution)
 * 4. Time since last order (staleness detection)
 * 5. Urgency/emotion detection from text signals
 * 6. Session memory (conversational context within a shopping session)
 */

const Order = require('../models/Order');
const IntentRequest = require('../models/IntentRequest');
const RestockItem = require('../models/RestockItem');

// ─── Time-of-Day Context ─────────────────────────────────────────────────────

const TIME_CONTEXT = {
  early_morning: { hours: [5, 6, 7], boostCategories: ['groceries', 'pantry'], mood: 'fresh_start', suggestTypes: ['coffee', 'breakfast', 'milk'] },
  morning: { hours: [8, 9, 10, 11], boostCategories: ['pantry', 'office', 'groceries'], mood: 'productive', suggestTypes: ['snacks', 'coffee', 'lunch_prep'] },
  afternoon: { hours: [12, 13, 14, 15], boostCategories: ['snacks', 'groceries', 'household'], mood: 'midday', suggestTypes: ['lunch', 'drinks', 'energy'] },
  evening: { hours: [16, 17, 18, 19], boostCategories: ['groceries', 'cleaning', 'household'], mood: 'winding_down', suggestTypes: ['dinner', 'household', 'relaxation'] },
  night: { hours: [20, 21, 22], boostCategories: ['snacks', 'personal_care'], mood: 'relaxed', suggestTypes: ['snacks', 'movie_night', 'comfort'] },
  late_night: { hours: [23, 0, 1, 2, 3, 4], boostCategories: ['medicine', 'snacks', 'baby'], mood: 'emergency_or_craving', suggestTypes: ['emergency', 'cravings', 'baby_care'] }
};

const DAY_CONTEXT = {
  0: { dayName: 'Sunday', pattern: 'leisure', boostCategories: ['snacks', 'groceries'], suggestMissions: ['sunday_brunch', 'lazy_day'] },
  1: { dayName: 'Monday', pattern: 'fresh_start', boostCategories: ['office', 'pantry', 'personal_care'], suggestMissions: ['weekly_prep', 'office_supplies'] },
  2: { dayName: 'Tuesday', pattern: 'routine', boostCategories: ['household', 'groceries'], suggestMissions: [] },
  3: { dayName: 'Wednesday', pattern: 'midweek', boostCategories: ['snacks', 'personal_care'], suggestMissions: ['midweek_restock'] },
  4: { dayName: 'Thursday', pattern: 'pre_weekend', boostCategories: ['groceries', 'cleaning'], suggestMissions: ['weekend_prep'] },
  5: { dayName: 'Friday', pattern: 'weekend_prep', boostCategories: ['snacks', 'cleaning', 'personal_care'], suggestMissions: ['party', 'guests', 'movie_night'] },
  6: { dayName: 'Saturday', pattern: 'active', boostCategories: ['groceries', 'household', 'snacks'], suggestMissions: ['deep_clean', 'hosting', 'outdoor'] }
};

// ─── Urgency & Emotion Detection ─────────────────────────────────────────────

const URGENCY_SIGNALS = {
  immediate: ['right now', 'asap', 'immediately', 'hurry', 'fast', 'urgent', 'emergency', 'tonight', 'running out', 'ran out', 'no more', 'last one', 'desperate'],
  high: ['today', 'soon', 'quick', 'need', 'must have', 'before', 'in an hour', 'guests coming', 'party tonight'],
  medium: ['this week', 'sometime', 'planning', 'want to', 'thinking about'],
  low: ['eventually', 'someday', 'maybe', 'browsing', 'just looking', 'explore']
};

const EMOTION_SIGNALS = {
  stressed: ['ugh', 'hate', 'frustrated', 'annoying', 'forgot', 'disaster', 'help', 'panic', 'worried', 'running late'],
  excited: ['party', 'celebration', 'exciting', 'can\'t wait', 'love', 'amazing', 'fun', 'yay'],
  casual: ['maybe', 'just', 'kinda', 'sort of', 'thinking', 'browsing', 'hmm'],
  panicked: ['emergency', 'sick', 'fever', 'hurt', 'bleeding', 'choking', 'allergic', 'ambulance', 'hospital']
};

const FILLER_WORDS = ['umm', 'uhh', 'uh', 'um', 'like', 'you know', 'i think', 'i guess', 'hmm', 'well', 'so', 'basically'];

// ─── Session Memory Store (in-memory per user session) ───────────────────────

const sessionStore = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

function getSession(userId) {
  const session = sessionStore.get(userId);
  if (!session) return createSession(userId);
  if (Date.now() - session.lastActivity > SESSION_TTL) return createSession(userId);
  session.lastActivity = Date.now();
  return session;
}

function createSession(userId) {
  const session = {
    userId,
    messages: [],
    accumulatedConstraints: {},
    cartContext: [],
    lastActivity: Date.now(),
    turnCount: 0
  };
  sessionStore.set(userId, session);
  return session;
}

function updateSession(userId, message, parsedIntent, products) {
  const session = getSession(userId);
  session.messages.push({ role: 'user', text: message, timestamp: Date.now() });
  session.turnCount++;

  // Merge constraints additively
  if (parsedIntent.budget) session.accumulatedConstraints.budget = parsedIntent.budget;
  if (parsedIntent.brandHints?.length) {
    session.accumulatedConstraints.brands = [
      ...(session.accumulatedConstraints.brands || []),
      ...parsedIntent.brandHints
    ];
  }
  if (parsedIntent.categories?.length) {
    session.accumulatedConstraints.categories = [
      ...(session.accumulatedConstraints.categories || []),
      ...parsedIntent.categories
    ];
  }

  // Track products shown
  if (products?.length) {
    session.cartContext = products.map(p => ({ id: p._id, name: p.name, category: p.category }));
  }

  return session;
}

// ─── Main Context Builder ────────────────────────────────────────────────────

async function buildAmbientContext(userId, prompt = '') {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  // Time context
  const timeSlot = Object.entries(TIME_CONTEXT).find(([_, ctx]) => ctx.hours.includes(hour));
  const timeContext = timeSlot ? timeSlot[1] : TIME_CONTEXT.afternoon;
  const timePeriod = timeSlot ? timeSlot[0] : 'afternoon';

  // Day context
  const dayContext = DAY_CONTEXT[dayOfWeek];

  // Urgency detection
  const urgencyLevel = detectUrgency(prompt);

  // Emotion detection
  const emotionalState = detectEmotion(prompt);

  // Filler word detection (voice hesitation)
  const hasFillers = detectFillers(prompt);

  // List pattern detection
  const listItems = detectListPattern(prompt);

  // Purchase history (last 30 days)
  let purchaseHistory = { categories: [], brands: [], recentProducts: [], daysSinceLastOrder: 999, orderCount: 0 };
  if (userId) {
    purchaseHistory = await buildPurchaseContext(userId);
  }

  // Restock urgency items
  let restockUrgent = [];
  if (userId) {
    restockUrgent = await getUrgentRestockItems(userId);
  }

  // Session context
  const session = getSession(userId || 'anonymous');

  return {
    time: {
      hour,
      period: timePeriod,
      dayOfWeek,
      dayName: dayContext.dayName,
      dayPattern: dayContext.pattern,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isLateNight: hour >= 22 || hour <= 5
    },
    ambient: {
      boostCategories: [...new Set([...timeContext.boostCategories, ...dayContext.boostCategories])],
      suggestTypes: timeContext.suggestTypes,
      mood: timeContext.mood,
      suggestMissions: dayContext.suggestMissions
    },
    user: {
      urgencyLevel,
      emotionalState,
      hasFillers,
      needsClarification: hasFillers && prompt.split(' ').length < 5,
      listItems,
      isListMode: listItems.length >= 2
    },
    history: purchaseHistory,
    restockUrgent,
    session: {
      turnCount: session.turnCount,
      accumulatedConstraints: session.accumulatedConstraints,
      previousProducts: session.cartContext
    }
  };
}

// ─── Detection Functions ─────────────────────────────────────────────────────

function detectUrgency(text) {
  const lower = text.toLowerCase();
  for (const [level, signals] of Object.entries(URGENCY_SIGNALS)) {
    if (signals.some(s => lower.includes(s))) return level;
  }
  return 'medium';
}

function detectEmotion(text) {
  const lower = text.toLowerCase();
  for (const [emotion, signals] of Object.entries(EMOTION_SIGNALS)) {
    const matches = signals.filter(s => lower.includes(s));
    if (matches.length >= 1) return { state: emotion, confidence: Math.min(0.95, 0.5 + matches.length * 0.15), signals: matches };
  }
  return { state: 'neutral', confidence: 0.5, signals: [] };
}

function detectFillers(text) {
  const lower = text.toLowerCase();
  return FILLER_WORDS.some(f => lower.includes(f));
}

function detectListPattern(text) {
  // Detect patterns like "milk, eggs, and bread" or "I need milk... and eggs... and bread"
  const items = [];

  // Comma-separated
  const commaSplit = text.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40);
  if (commaSplit.length >= 2) return commaSplit;

  // "and" separated
  const andSplit = text.split(/\band\b/i).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40);
  if (andSplit.length >= 3) return andSplit;

  // Ellipsis/dots pattern
  const dotSplit = text.split(/\.{2,}|\.\s/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40);
  if (dotSplit.length >= 2) return dotSplit;

  return items;
}

// ─── History Builder ─────────────────────────────────────────────────────────

async function buildPurchaseContext(userId) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const orders = await Order.find({ userId, createdAt: { $gte: thirtyDaysAgo } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const categories = {};
    const brands = {};
    const recentProducts = [];

    for (const order of orders) {
      for (const item of (order.items || [])) {
        const cat = item.category || 'other';
        categories[cat] = (categories[cat] || 0) + 1;
        if (item.brand) brands[item.brand] = (brands[item.brand] || 0) + 1;
        recentProducts.push({ name: item.name, productId: item.productId });
      }
    }

    const lastOrder = orders[0];
    const daysSinceLastOrder = lastOrder
      ? Math.round((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      categories: Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => ({ category: cat, count })),
      brands: Object.entries(brands).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([brand, count]) => ({ brand, count })),
      recentProducts: recentProducts.slice(0, 10),
      daysSinceLastOrder,
      orderCount: orders.length,
      isStale: daysSinceLastOrder > 7
    };
  } catch {
    return { categories: [], brands: [], recentProducts: [], daysSinceLastOrder: 999, orderCount: 0, isStale: true };
  }
}

async function getUrgentRestockItems(userId) {
  try {
    const items = await RestockItem.find({ userId, daysRemaining: { $lte: 3 } })
      .populate('productId', 'name category price image')
      .limit(5)
      .lean();

    return items.map(i => ({
      productName: i.productId?.name || 'Unknown',
      category: i.category,
      daysRemaining: i.daysRemaining,
      urgency: i.urgency
    }));
  } catch {
    return [];
  }
}

// ─── Panic Mode ──────────────────────────────────────────────────────────────

async function getPanicModeCart(userId) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orders = await Order.find({ userId, createdAt: { $gte: thirtyDaysAgo } }).lean();

    // Count product frequency
    const productFreq = {};
    for (const order of orders) {
      for (const item of (order.items || [])) {
        const key = item.productId?.toString() || item.name;
        if (!productFreq[key]) {
          productFreq[key] = { count: 0, name: item.name, productId: item.productId, price: item.price, image: item.image, quantity: item.quantity || 1 };
        }
        productFreq[key].count++;
        productFreq[key].quantity = Math.max(productFreq[key].quantity, item.quantity || 1);
      }
    }

    // Sort by frequency, return top 10
    const topItems = Object.values(productFreq)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Check if late night — filter to night-delivery available items
    const hour = new Date().getHours();
    const isLateNight = hour >= 22 || hour <= 6;

    // Check for recent order (prevent doubles)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recentOrder = await Order.findOne({ userId, createdAt: { $gte: sixHoursAgo } });

    return {
      items: topItems,
      total: topItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0),
      isLateNight,
      hasRecentOrder: Boolean(recentOrder),
      recentOrderId: recentOrder?._id,
      itemCount: topItems.length,
      reasoning: `Based on your ${orders.length} orders in the last 30 days. Top ${topItems.length} most-ordered items.`
    };
  } catch {
    return { items: [], total: 0, isLateNight: false, hasRecentOrder: false, itemCount: 0, reasoning: 'No order history found.' };
  }
}

// ─── Mood-Based Discovery ────────────────────────────────────────────────────

const MOOD_BUNDLES = {
  movie_night: { categories: ['snacks'], tags: ['popcorn', 'chips', 'soda', 'candy', 'chocolate'], tagline: 'Grab the remote, we\'ve got the snacks', maxItems: 6 },
  sunday_brunch: { categories: ['groceries', 'pantry'], tags: ['eggs', 'bread', 'juice', 'coffee', 'butter', 'jam'], tagline: 'Slow morning, good food', maxItems: 8 },
  workout_recovery: { categories: ['health', 'snacks'], tags: ['protein', 'energy', 'bar', 'drink', 'nuts', 'banana'], tagline: 'Refuel like you mean it', maxItems: 5 },
  sick_day: { categories: ['medicine', 'groceries'], tags: ['soup', 'medicine', 'tissue', 'tea', 'honey', 'thermometer'], tagline: 'Feel better, one item at a time', maxItems: 6 },
  date_night: { categories: ['groceries', 'snacks'], tags: ['wine', 'chocolate', 'candle', 'cheese', 'crackers'], tagline: 'Set the mood right', maxItems: 5 },
  party_time: { categories: ['snacks', 'household'], tags: ['chips', 'soda', 'cups', 'plates', 'napkin', 'ice'], tagline: 'Let\'s get this party started', maxItems: 8 },
  deep_clean: { categories: ['cleaning', 'household'], tags: ['spray', 'mop', 'wipe', 'disinfect', 'trash', 'sponge'], tagline: 'Fresh start, fresh space', maxItems: 6 },
  comfort_food: { categories: ['groceries', 'snacks'], tags: ['ice cream', 'chocolate', 'pizza', 'mac', 'cheese', 'cookie'], tagline: 'Because you deserve it', maxItems: 5 }
};

function getMoodBundle(mood) {
  return MOOD_BUNDLES[mood] || MOOD_BUNDLES.movie_night;
}

module.exports = {
  buildAmbientContext,
  getSession,
  updateSession,
  detectUrgency,
  detectEmotion,
  detectFillers,
  detectListPattern,
  getPanicModeCart,
  getMoodBundle,
  MOOD_BUNDLES,
  TIME_CONTEXT,
  DAY_CONTEXT
};
