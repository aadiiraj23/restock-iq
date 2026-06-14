import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const catalog = {
  getAll: (params) => api.get('/catalog', { params }),
  getCategories: () => api.get('/catalog/categories'),
  getById: (id) => api.get(`/catalog/${id}`),
  getRecommended: (params) => api.get('/catalog/recommended', { params })
};

// ─── Intent (NLP parsing) ────────────────────────────────────────────────────

export const intent = {
  getTemplates: () => api.get('/intent/templates'),
  parse: (data) => api.post('/intent/parse', data)
};

// ─── AI Agent (main intelligent shopping) ────────────────────────────────────

export const ai = {
  shop: (data) => api.post('/ai/shop', data),
  suggest: (data) => api.post('/ai/suggest', data),
  substitute: (data) => api.post('/ai/substitute', data),
  feedback: (data) => api.post('/ai/feedback', data),
  insights: () => api.get('/ai/insights'),
  context: (data) => api.post('/ai/context', data),
  panic: () => api.post('/ai/panic'),
  mood: (data) => api.post('/ai/mood', data),
  moods: () => api.get('/ai/moods'),
  scan: (data) => api.post('/ai/scan', data)
};

// ─── Cart ────────────────────────────────────────────────────────────────────

export const cart = {
  build: (data) => api.post('/cart/build', data),
  get: (id) => api.get(`/cart/${id}`),
  update: (id, data) => api.put(`/cart/${id}`, data),
  substitute: (productId) => api.post('/cart/substitute', { productId })
};

// ─── Checkout ────────────────────────────────────────────────────────────────

export const checkout = {
  prepare: (data) => api.post('/checkout/prepare', data),
  getOrderStatus: (id) => api.get(`/checkout/orders/${id}/status`),
  getOrders: () => api.get('/checkout/orders'),
  instant: (data) => api.post('/checkout/instant', data)
};

// ─── Restock (predictive replenishment) ──────────────────────────────────────

export const restock = {
  getDashboard: () => api.get('/restock/dashboard'),
  getCalendar: () => api.get('/restock/calendar'),
  addItem: (data) => api.post('/restock/items', data),
  feedback: (data) => api.post('/restock/feedback', data),
  bundle: () => api.post('/restock/bundle'),
  getAnalytics: () => api.get('/restock/analytics'),
  getSchedule: () => api.get('/restock/schedule'),
  getNotifications: () => api.get('/restock/notifications'),
  getHistory: () => api.get('/restock/history'),
  setBudget: (monthlyBudget) => api.post('/restock/budget', { monthlyBudget }),
  predict: (data) => api.post('/restock/predict', data)
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updatePreferences: (data) => api.put('/auth/preferences', data),
  updateHousehold: (data) => api.put('/auth/household', data)
};

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const subscriptions = {
  getAll: () => api.get('/subscriptions'),
  getCalendar: () => api.get('/subscriptions/calendar'),
  getExpenses: () => api.get('/subscriptions/expenses'),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  cancel: (id) => api.delete(`/subscriptions/${id}`)
};

// ─── Feedback (learning) ─────────────────────────────────────────────────────

export const feedback = {
  send: (data) => api.post('/feedback', data)
};
