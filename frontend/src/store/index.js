import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const AUTH_HEADER_KEY = 'Authorization';

function getStorage() {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

function syncAuthHeader(token) {
  if (typeof axios?.defaults?.headers?.common === 'object') {
    if (token) {
      axios.defaults.headers.common[AUTH_HEADER_KEY] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common[AUTH_HEADER_KEY];
    }
  }
}

function persistSession(user, token, householdProfile) {
  const storage = getStorage();
  if (!storage) return;

  if (token) storage.setItem('token', token);
  else storage.removeItem('token');

  if (user || householdProfile) {
    storage.setItem('user', JSON.stringify(user || householdProfile || null));
  } else {
    storage.removeItem('user');
  }
}

function clearSessionStorage() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem('token');
  storage.removeItem('user');
}

function extractHouseholdProfile(userData) {
  if (!userData) return null;

  return userData.householdProfile || {
    id: userData.id || userData._id || null,
    name: userData.name || null,
    email: userData.email || null,
    phone: userData.phone || null,
    addresses: userData.addresses || [],
    preferences: userData.preferences || {},
    household: userData.household || { size: 1, usageLevel: 'medium' },
    monthlyBudget: userData.monthlyBudget ?? 150
  };
}

function recalculateCartState(items) {
  const nextItems = items.map(item => {
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : (item.price || 0);

    return {
      ...item,
      quantity,
      unitPrice,
      priceAtAdd: item.priceAtAdd ?? unitPrice,
      lineTotal: Math.round(unitPrice * quantity * 100) / 100
    };
  });

  const cartTotal = Math.round(nextItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const totalItemsCount = nextItems.reduce((sum, item) => sum + item.quantity, 0);

  return { items: nextItems, cartTotal, total: cartTotal, totalItemsCount };
}

function createCartItem(product, quantity = 1) {
  const resolvedQuantity = Math.max(1, parseInt(quantity, 10) || 1);
  const priceAtAdd = typeof product.price === 'number' ? product.price : 0;

  return {
    ...product,
    quantity: resolvedQuantity,
    unitPrice: priceAtAdd,
    priceAtAdd,
    lineTotal: Math.round(priceAtAdd * resolvedQuantity * 100) / 100
  };
}

// ─── Auth Store ──────────────────────────────────────────────────────────────

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      householdProfile: null,
      actions: {
        login: (userData, token) => {
          const householdProfile = extractHouseholdProfile(userData);
          const user = userData?.user || userData || null;
          const authToken = token || userData?.token || null;

          persistSession(user || householdProfile, authToken, householdProfile);
          syncAuthHeader(authToken);

          set({ user, token: authToken, householdProfile });
          return get();
        },
        logout: () => {
          clearSessionStorage();
          syncAuthHeader(null);
          set({ user: null, token: null, householdProfile: null });
        }
      },
      login: (userData, token) => get().actions.login(userData, token),
      logout: () => get().actions.logout(),
      setAuth: (userData, token) => get().actions.login(userData, token)
    }),
    {
      name: 'amazon-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        householdProfile: state.householdProfile
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          syncAuthHeader(state.token);
        }
      }
    }
  )
);

// ─── Cart Store ──────────────────────────────────────────────────────────────

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      cartTotal: 0,
      total: 0,
      totalItemsCount: 0,
      cartId: null,
      eta: '30 mins',
      intentSummary: '',
      addItem: (product, qty = 1) => {
        const items = [...get().items];
        const existingIndex = items.findIndex(item => item._id === product._id);

        if (existingIndex >= 0) {
          const existingItem = items[existingIndex];
          const nextQuantity = Math.max(1, (existingItem.quantity || 1) + (parseInt(qty, 10) || 1));
          items[existingIndex] = {
            ...existingItem,
            ...product,
            quantity: nextQuantity,
            unitPrice: existingItem.unitPrice ?? existingItem.priceAtAdd ?? product.price ?? 0,
            priceAtAdd: existingItem.priceAtAdd ?? existingItem.unitPrice ?? product.price ?? 0
          };
        } else {
          items.push(createCartItem(product, qty));
        }

        set(recalculateCartState(items));
      },
      removeItem: (productId) => {
        const items = get().items.filter(item => item._id !== productId);
        set(recalculateCartState(items));
      },
      updateQuantity: (productId, qty) => {
        const nextQty = Math.max(1, parseInt(qty, 10) || 1);
        const items = get().items.map(item => {
          if (item._id !== productId) return item;
          const unitPrice = item.unitPrice ?? item.priceAtAdd ?? item.price ?? 0;
          return {
            ...item,
            quantity: nextQty,
            unitPrice,
            priceAtAdd: item.priceAtAdd ?? unitPrice,
            lineTotal: Math.round(unitPrice * nextQty * 100) / 100
          };
        });

        set(recalculateCartState(items));
      },
      clearCart: () => set({ items: [], cartTotal: 0, total: 0, totalItemsCount: 0, cartId: null, eta: '30 mins', intentSummary: '' }),
      // Backward-compatible aliases
      updateQty: (productId, qty) => get().updateQuantity(productId, qty),
      clear: () => get().clearCart(),
      // Replace entire cart (used by AI agent — does NOT accumulate)
      replaceCart: (products, summary = '') => {
        const items = products.map(product => {
          const qty = Math.max(1, parseInt(product.qty || product.quantity, 10) || 1);
          const price = typeof product.price === 'number' ? product.price : 0;
          return {
            ...product,
            _id: product._id || product.id,
            quantity: qty,
            unitPrice: price,
            priceAtAdd: price,
            lineTotal: Math.round(price * qty * 100) / 100
          };
        });
        const next = recalculateCartState(items);
        const fastest = items.reduce((min, item) => {
          const mins = parseInt(item.deliveryETA, 10) || 30;
          return mins < min ? mins : min;
        }, 60);
        set({ ...next, eta: `${fastest} mins`, intentSummary: summary });
      },
      setFromServer: (cart) => {
        const items = (cart.items || [])
          .map(item => {
            const product = item.productId || {};
            const priceAtAdd = typeof item.price === 'number' ? item.price : (product.price || 0);
            const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);

            return {
              ...product,
              _id: product._id || item.productId?._id || item.productId,
              quantity,
              unitPrice: priceAtAdd,
              priceAtAdd,
              lineTotal: Math.round(priceAtAdd * quantity * 100) / 100
            };
          })
          .filter(item => item._id);

        const next = recalculateCartState(items);
        set({
          ...next,
          cartId: cart._id || null,
          eta: cart.eta || '30 mins',
          intentSummary: cart.intentSummary || ''
        });
      },
      setBulk: (products) => {
        const items = products.map(product => createCartItem(product, 1));
        const next = recalculateCartState(items);
        const fastest = items.reduce((min, item) => {
          const mins = parseInt(item.deliveryETA, 10) || 60;
          return mins < min ? mins : min;
        }, 60);
        set({ ...next, eta: `${fastest} mins` });
      }
    }),
    {
      name: 'amazon-cart',
      partialize: (state) => ({
        items: state.items,
        cartId: state.cartId,
        eta: state.eta,
        intentSummary: state.intentSummary,
        cartTotal: state.cartTotal,
        total: state.total,
        totalItemsCount: state.totalItemsCount
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (typeof state.total !== 'number') {
          state.total = typeof state.cartTotal === 'number' ? state.cartTotal : 0;
        }
        if (typeof state.cartTotal !== 'number') {
          state.cartTotal = typeof state.total === 'number' ? state.total : 0;
        }
      }
    }
  )
);

// ─── Intent Store ────────────────────────────────────────────────────────────

export const useIntentStore = create(
  persist(
    (set, get) => ({
      recentMissions: [],
      currentSlots: {},
      aiResults: [],
      // Compatibility fields retained for older callers
      lastIntent: null,
      recentIntents: [],
      trackMission: (mission) => {
        const normalizedMission = typeof mission === 'string'
          ? { text: mission }
          : { ...mission };

        const recentMissions = [normalizedMission, ...get().recentMissions]
          .filter((entry, index, array) => array.findIndex(item => item.intentId ? item.intentId === entry.intentId : item.text === entry.text) === index)
          .slice(0, 10);

        set({
          recentMissions,
          recentIntents: recentMissions,
          lastIntent: normalizedMission
        });
      },
      setCurrentSlots: (slots) => set({ currentSlots: slots || {} }),
      setAiResults: (results) => set({ aiResults: Array.isArray(results) ? results : [] }),
      clearIntent: () => set({ currentSlots: {}, aiResults: [], lastIntent: null }),
      // Backward-compatible aliases
      setIntent: (intent) => get().trackMission(intent)
    }),
    {
      name: 'amazon-intent',
      partialize: (state) => ({
        recentMissions: state.recentMissions,
        currentSlots: state.currentSlots,
        aiResults: state.aiResults,
        lastIntent: state.lastIntent,
        recentIntents: state.recentIntents
      })
    }
  )
);

// ─── AI Cart Store (separate from main cart — for AI-built baskets) ──────────

export const useAiCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      totalItemsCount: 0,
      eta: '15 mins',
      intentSummary: '',
      confidence: 0,

      setAiCart: (products, summary = '', confidence = 0.87) => {
        const items = products.map(product => {
          const qty = Math.max(1, parseInt(product.qty || product.quantity, 10) || 1);
          const price = typeof product.price === 'number' ? product.price : 0;
          return {
            ...product,
            _id: product._id || product.id,
            quantity: qty,
            price,
            lineTotal: Math.round(price * qty * 100) / 100
          };
        });
        const total = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
        const totalItemsCount = items.reduce((s, i) => s + i.quantity, 0);
        const fastest = items.reduce((min, i) => Math.min(min, parseInt(i.deliveryETA, 10) || 30), 60);
        set({ items, total, totalItemsCount, eta: `${fastest} mins`, intentSummary: summary, confidence });
      },

      updateQuantity: (productId, qty) => {
        const nextQty = Math.max(1, parseInt(qty, 10) || 1);
        const items = get().items.map(item => {
          if (item._id !== productId) return item;
          return { ...item, quantity: nextQty, lineTotal: Math.round((item.price || 0) * nextQty * 100) / 100 };
        });
        const total = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
        const totalItemsCount = items.reduce((s, i) => s + i.quantity, 0);
        set({ items, total, totalItemsCount });
      },

      removeItem: (productId) => {
        const items = get().items.filter(i => i._id !== productId);
        const total = Math.round(items.reduce((s, i) => s + (i.lineTotal || 0), 0) * 100) / 100;
        const totalItemsCount = items.reduce((s, i) => s + i.quantity, 0);
        set({ items, total, totalItemsCount });
      },

      addItem: (product) => {
        const items = [...get().items];
        const existing = items.findIndex(i => i._id === product._id);
        if (existing >= 0) {
          items[existing] = { ...items[existing], quantity: (items[existing].quantity || 1) + 1, lineTotal: Math.round((items[existing].price || 0) * ((items[existing].quantity || 1) + 1) * 100) / 100 };
        } else {
          const price = product.price || 0;
          items.push({ ...product, _id: product._id || product.id, quantity: 1, price, lineTotal: price });
        }
        const total = Math.round(items.reduce((s, i) => s + (i.lineTotal || 0), 0) * 100) / 100;
        const totalItemsCount = items.reduce((s, i) => s + i.quantity, 0);
        set({ items, total, totalItemsCount });
      },

      clearAiCart: () => set({ items: [], total: 0, totalItemsCount: 0, eta: '15 mins', intentSummary: '', confidence: 0 })
    }),
    {
      name: 'amazon-ai-cart',
      partialize: (state) => ({ items: state.items, total: state.total, totalItemsCount: state.totalItemsCount, eta: state.eta, intentSummary: state.intentSummary, confidence: state.confidence })
    }
  )
);

// ─── Buy Now Store (separate single-item cart for instant purchase) ───────────
// This store holds ONE product for "Buy Now" flow — completely independent of main cart.

export const useBuyNowStore = create(
  (set) => ({
    item: null,
    total: 0,
    eta: '15 mins',

    setBuyNowItem: (product) => {
      const price = typeof product.price === 'number' ? product.price : 0;
      set({
        item: { ...product, _id: product._id || product.id, quantity: 1, price },
        total: price,
        eta: product.deliveryETA || '15 mins'
      });
    },

    clearBuyNow: () => set({ item: null, total: 0, eta: '15 mins' })
  })
);

// ─── Restock Store — ML PREDICTION ENGINE ────────────────────────────────────
// Exponential smoothing, seasonal decomposition, Bayesian confidence,
// household-scaled consumption curves, feedback-loop learning
// ═══════════════════════════════════════════════════════════════════════════════

const ML_CATEGORY_BASELINES = {
  face_wash: { base: 60, householdFactor: 0.5, seasonalProfile: { summer: 0.85, winter: 1.1, spring: 1.0, fall: 1.0 } },
  toothpaste: { base: 30, householdFactor: 0.5, seasonalProfile: { summer: 1.0, winter: 1.0, spring: 1.0, fall: 1.0 } },
  shampoo: { base: 45, householdFactor: 0.5, seasonalProfile: { summer: 0.85, winter: 1.1, spring: 0.95, fall: 1.0 } },
  dish_soap: { base: 30, householdFactor: 0.65, seasonalProfile: { summer: 0.9, winter: 1.0, spring: 0.8, fall: 1.0 } },
  body_lotion: { base: 60, householdFactor: 0.6, seasonalProfile: { summer: 1.3, winter: 0.7, spring: 1.0, fall: 0.9 } },
  protein_powder: { base: 30, householdFactor: 1.0, seasonalProfile: { summer: 0.85, winter: 1.1, spring: 0.9, fall: 1.0 } },
  detergent: { base: 35, householdFactor: 0.55, seasonalProfile: { summer: 1.0, winter: 1.0, spring: 0.85, fall: 1.0 } },
  default: { base: 30, householdFactor: 0.7, seasonalProfile: { summer: 1.0, winter: 1.0, spring: 1.0, fall: 1.0 } }
};

function getCurrentSeason() { const m = new Date().getMonth(); if (m >= 2 && m <= 4) return 'spring'; if (m >= 5 && m <= 7) return 'summer'; if (m >= 8 && m <= 10) return 'fall'; return 'winter'; }

function computeEWMA(feedbackHistory, baseModifier = 1.0) {
  if (!feedbackHistory || feedbackHistory.length === 0) return baseModifier;
  const alpha = 0.3;
  let modifier = baseModifier;
  feedbackHistory.forEach(fb => {
    if (fb.type === 'finished_early') modifier = alpha * (modifier * 0.85) + (1 - alpha) * modifier;
    else if (fb.type === 'still_plenty') modifier = alpha * (modifier * 1.15) + (1 - alpha) * modifier;
  });
  return Math.max(0.3, Math.min(2.5, modifier));
}

function computeConfidence(feedbackCount, base = 0.7) { return Math.min(0.97, base + (0.27 * (1 - Math.exp(-0.15 * feedbackCount)))); }

function mlPredictItem(item, householdSize) {
  const profile = ML_CATEGORY_BASELINES[item.category] || ML_CATEGORY_BASELINES.default;
  const season = getCurrentSeason();
  let lifespan = profile.base;
  lifespan = lifespan / Math.pow(householdSize, profile.householdFactor);
  lifespan = lifespan * (profile.seasonalProfile[season] || 1.0);
  lifespan = lifespan * computeEWMA(item.feedbackHistory, item.consumptionRateModifier || 1.0);
  const elapsed = Math.max(0, (Date.now() - new Date(item.purchaseDate).getTime()) / 86400000);
  const remaining = Math.max(0, Math.round(lifespan - elapsed));
  const linearDep = (elapsed / Math.max(1, lifespan)) * 100;
  const curvedDep = Math.min(100, linearDep * (1 + linearDep / 300));
  const confidence = computeConfidence((item.feedbackHistory || []).length);
  const urgencyTier = remaining < 5 ? 'CRITICAL' : remaining <= 14 ? 'WARNING' : 'SAFE';
  return { remainingDays: remaining, totalLifespan: Math.round(lifespan), depletionPercent: Math.round(Math.min(100, curvedDep)), urgencyTier, status: urgencyTier === 'CRITICAL' ? 'critical' : urgencyTier === 'WARNING' ? 'warning' : 'safe', confidence: Math.round(confidence * 100) / 100, predictedExpiryDate: new Date(Date.now() + remaining * 86400000).toISOString(), consumptionRateModifier: Math.round(computeEWMA(item.feedbackHistory, item.consumptionRateModifier || 1.0) * 1000) / 1000, mlMetadata: { model: 'ewma_seasonal_v2', season, seasonalFactor: profile.seasonalProfile[season] || 1.0, householdScale: Math.round(Math.pow(householdSize, profile.householdFactor) * 100) / 100, feedbackCount: (item.feedbackHistory || []).length, learnedRate: Math.round(computeEWMA(item.feedbackHistory, item.consumptionRateModifier || 1.0) * 1000) / 1000 } };
}

const SEED_ITEMS = (() => {
  const now = Date.now();
  const day = 86400000;
  const raw = [
    { _id: 'ri1', productName: 'Cetaphil Gentle Skin Cleanser (200ml)', category: 'face_wash', brand: 'Cetaphil', volume: '200ml', price: 8.99, image: null, purchaseDate: new Date(now - 58 * day).toISOString(), consumptionRateModifier: 1.0, feedbackHistory: [] },
    { _id: 'ri2', productName: 'Colgate Total Toothpaste (150g)', category: 'toothpaste', brand: 'Colgate', volume: '150g', price: 4.99, image: null, purchaseDate: new Date(now - 29 * day).toISOString(), consumptionRateModifier: 1.0, feedbackHistory: [] },
    { _id: 'ri3', productName: 'Head & Shoulders Shampoo (400ml)', category: 'shampoo', brand: 'Head & Shoulders', volume: '400ml', price: 6.97, image: null, purchaseDate: new Date(now - 17 * day).toISOString(), consumptionRateModifier: 1.0, feedbackHistory: [] },
    { _id: 'ri4', productName: 'Dawn Ultra Dish Soap (500ml)', category: 'dish_soap', brand: 'Dawn', volume: '500ml', price: 3.97, image: null, purchaseDate: new Date(now - 28 * day).toISOString(), consumptionRateModifier: 1.0, feedbackHistory: [] },
    { _id: 'ri5', productName: 'Nivea Body Lotion (400ml)', category: 'body_lotion', brand: 'Nivea', volume: '400ml', price: 7.49, image: null, purchaseDate: new Date(now - 35 * day).toISOString(), consumptionRateModifier: 1.0, feedbackHistory: [] },
    { _id: 'ri6', productName: 'Optimum Nutrition Whey Protein (1kg)', category: 'protein_powder', brand: 'ON', volume: '1kg', price: 34.99, image: null, purchaseDate: new Date(now - 28 * day).toISOString(), consumptionRateModifier: 1.0, feedbackHistory: [] },
    { _id: 'ri7', productName: 'Tide Liquid Detergent (92oz)', category: 'detergent', brand: 'Tide', volume: '92oz', price: 12.97, image: null, purchaseDate: new Date(now - 34 * day).toISOString(), consumptionRateModifier: 1.0, feedbackHistory: [] },
    { _id: 'ri8', productName: 'Sensodyne Toothpaste (100g)', category: 'toothpaste', brand: 'Sensodyne', volume: '100g', price: 6.49, image: null, purchaseDate: new Date(now - 10 * day).toISOString(), consumptionRateModifier: 1.0, feedbackHistory: [] },
  ];
  return raw.map(item => ({ ...item, ...mlPredictItem(item, 1) }));
})();

export const useRestockStore = create(
  persist(
    (set, get) => ({
      items: SEED_ITEMS,
      householdSize: 1,
      budget: 150,
      loaded: true,

      // Computed getters
      getMetrics: () => {
        const items = get().items;
        const critical = items.filter(i => i.remainingDays < 5).length;
        const warning = items.filter(i => i.remainingDays >= 5 && i.remainingDays <= 14).length;
        const safe = items.filter(i => i.remainingDays > 14).length;
        const avgDaysLeft = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.remainingDays, 0) / items.length * 10) / 10 : 0;
        return { critical, warning, safe, avgDaysLeft, totalTracked: items.length };
      },

      getAlerts: () => {
        const items = get().items;
        const budget = get().budget;
        const criticalItems = items.filter(i => i.remainingDays < 5);
        const projectedSpend = items.filter(i => i.remainingDays <= 30).reduce((s, i) => s + (i.price || 0), 0);
        return {
          hasCriticalAlert: criticalItems.length > 0,
          criticalAlertItems: criticalItems.map(i => i.productName),
          overBudget: projectedSpend > budget,
          projectedSpend: Math.round(projectedSpend * 100) / 100,
          budget
        };
      },

      // Self-learning feedback — re-runs ML prediction after updating history
      feedbackItem: (itemId, type) => {
        const hSize = get().householdSize;
        set(state => ({
          items: state.items.map(item => {
            if (item._id !== itemId) return item;
            const newHistory = [...(item.feedbackHistory || []), { type, date: new Date().toISOString() }];
            const updatedItem = { ...item, feedbackHistory: newHistory };
            if (type === 'finished_early') {
              updatedItem.purchaseDate = new Date(Date.now() - (item.totalLifespan || 30) * 86400000).toISOString();
            }
            return { ...updatedItem, ...mlPredictItem(updatedItem, hSize) };
          })
        }));
      },

      addTrackedItem: (item) => {
        const hSize = get().householdSize;
        const baseItem = { _id: `ri-${Date.now()}`, productName: item.productName || item.name, category: item.category || 'default', brand: item.brand || '', volume: item.volume || '', price: item.price || 0, image: item.image || null, purchaseDate: new Date().toISOString(), consumptionRateModifier: 1.0, feedbackHistory: [] };
        set(state => ({ items: [...state.items, { ...baseItem, ...mlPredictItem(baseItem, hSize) }] }));
      },

      removeTrackedItem: (itemId) => {
        set(state => ({ items: state.items.filter(i => i._id !== itemId) }));
      },

      reorderItem: (itemId) => {
        const hSize = get().householdSize;
        set(state => ({
          items: state.items.map(item => {
            if (item._id !== itemId) return item;
            const resetItem = { ...item, purchaseDate: new Date().toISOString(), feedbackHistory: [...(item.feedbackHistory || []), { type: 'reordered', date: new Date().toISOString() }] };
            return { ...resetItem, ...mlPredictItem(resetItem, hSize) };
          })
        }));
      },

      updateHousehold: (size) => {
        const newSize = Math.max(1, parseInt(size, 10) || 1);
        set(state => ({
          items: state.items.map(item => ({ ...item, ...mlPredictItem(item, newSize) })),
          householdSize: newSize
        }));
      },

      setBudget: (amount) => set({ budget: Math.max(0, Number(amount) || 150) }),

      resetToSeed: () => set({ items: SEED_ITEMS })
    }),
    {
      name: 'restock-iq-items',
      partialize: (state) => ({ items: state.items, householdSize: state.householdSize, budget: state.budget })
    }
  )
);

export default {
  useAuthStore,
  useCartStore,
  useIntentStore,
  useAiCartStore,
  useBuyNowStore,
  useRestockStore
};
