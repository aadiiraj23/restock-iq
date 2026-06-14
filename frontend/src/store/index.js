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

export default {
  useAuthStore,
  useCartStore,
  useIntentStore
};
