import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);
export const getMe = () => API.get('/auth/me');
export const updatePreferences = (data) => API.put('/auth/preferences', data);
export const updateHousehold = (data) => API.put('/auth/household', data);
export const updateBudget = (data) => API.put('/auth/budget', data);

// Catalog
export const getProducts = (params) => API.get('/catalog', { params });
export const getCategories = () => API.get('/catalog/categories');
export const getProduct = (id) => API.get(`/catalog/${id}`);

// Intent
export const getTemplates = () => API.get('/intent/templates');
export const parseIntent = (data) => API.post('/intent/parse', data);

// AI Agent (intelligent shopping pipeline)
export const aiShop = (data) => API.post('/ai/shop', data);
export const aiSuggest = (data) => API.post('/ai/suggest', data);
export const aiSubstitute = (data) => API.post('/ai/substitute', data);
export const aiFeedback = (data) => API.post('/ai/feedback', data);
export const aiInsights = () => API.get('/ai/insights');

// Recommendations
export const generateRecommendations = (data) => API.post('/recommendations/generate', data);

// Cart
export const buildCart = (data) => API.post('/cart/build', data);
export const getCart = (id) => API.get(`/cart/${id}`);
export const updateCart = (id, data) => API.put(`/cart/${id}`, data);
export const getSubstitutes = (data) => API.post('/cart/substitute', data);

// Checkout
export const prepareCheckout = (data) => API.post('/checkout/prepare', data);
export const getOrderStatus = (id) => API.get(`/orders/${id}/status`);
export const getOrders = () => API.get('/checkout/orders');

// Restock (predictive replenishment)
export const addRestockItem = (data) => API.post('/restock/items', data);
export const getRestockDashboard = () => API.get('/restock/dashboard');
export const getRestockCalendar = () => API.get('/restock/calendar');
export const submitRestockFeedback = (data) => API.post('/restock/feedback', data);
export const createRestockBundle = () => API.post('/restock/bundle');
export const setRestockBudget = (data) => API.post('/restock/budget', data);
export const getRestockAnalytics = () => API.get('/restock/analytics');
export const getRestockSchedule = () => API.get('/restock/schedule');
export const getNotifications = () => API.get('/restock/notifications');
export const getRestockHistory = () => API.get('/restock/history');
export const predictDepletion = (data) => API.post('/restock/predict', data);

// Feedback (learning)
export const submitFeedback = (data) => API.post('/feedback', data);

export default API;
