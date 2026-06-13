import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Cart Store ──────────────────────────────────────────────────────────────

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      total: 0,
      eta: '30 mins',
      intentSummary: '',

      addItem: (product, qty = 1) => {
        const items = [...get().items];
        const idx = items.findIndex(i => i._id === product._id);
        if (idx >= 0) items[idx].quantity += qty;
        else items.push({ ...product, quantity: qty });
        const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        set({ items, total });
      },

      removeItem: (id) => {
        const items = get().items.filter(i => i._id !== id);
        const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        set({ items, total });
      },

      updateQty: (id, quantity) => {
        if (quantity < 1) quantity = 1;
        const items = get().items.map(i => i._id === id ? { ...i, quantity } : i);
        const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        set({ items, total });
      },

      setFromServer: (cart) => {
        const items = (cart.items || []).map(i => ({
          ...(i.productId || {}),
          quantity: i.quantity || 1
        })).filter(i => i._id);
        const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        set({ items, cartId: cart._id, total, eta: cart.eta || '30 mins', intentSummary: cart.intentSummary || '' });
      },

      setBulk: (products) => {
        const items = products.map(p => ({ ...p, quantity: 1 }));
        const total = items.reduce((s, i) => s + (i.price || 0) * 1, 0);
        const fastest = items.reduce((min, i) => {
          const mins = parseInt(i.deliveryETA) || 60;
          return mins < min ? mins : min;
        }, 60);
        set({ items, total, eta: `${fastest} mins` });
      },

      clear: () => set({ items: [], cartId: null, total: 0, eta: '30 mins', intentSummary: '' })
    }),
    { name: 'amazon-cart' }
  )
);

// ─── Auth Store ──────────────────────────────────────────────────────────────

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      }
    }),
    { name: 'amazon-auth' }
  )
);

// ─── Intent Store ────────────────────────────────────────────────────────────

export const useIntentStore = create(
  persist(
    (set) => ({
      lastIntent: null,
      recentIntents: [],
      setIntent: (intent) => set(state => ({
        lastIntent: intent,
        recentIntents: [intent, ...state.recentIntents.filter(i => i.intentId !== intent.intentId)].slice(0, 10)
      })),
      clearIntent: () => set({ lastIntent: null })
    }),
    { name: 'amazon-intent' }
  )
);
