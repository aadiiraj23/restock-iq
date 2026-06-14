import api, { catalog, intent, ai, cart, checkout, restock, auth, feedback, subscriptions } from './api/index.js';

export default api;

export const login = (data) => auth.login(data);
export const register = (data) => auth.register(data);
export const getMe = () => auth.me();
export const updatePreferences = (data) => auth.updatePreferences(data);
export const updateHousehold = (data) => auth.updateHousehold(data);
export const updateBudget = (data) => api.put('/auth/budget', data);

export const getProducts = (params) => catalog.getAll(params);
export const getCategories = () => catalog.getCategories();
export const getProduct = (id) => catalog.getById(id);

export const getTemplates = () => intent.getTemplates();
export const parseIntent = (data) => intent.parse(data);

export const aiShop = (data) => ai.shop(data);
export const aiSuggest = (data) => ai.suggest(data);
export const aiSubstitute = (data) => ai.substitute(data);
export const aiFeedback = (data) => ai.feedback(data);
export const aiInsights = () => ai.insights();
export const aiScan = (data) => ai.scan(data);

export const generateRecommendations = (data) => api.post('/recommendations/generate', data);

export const buildCart = (data) => cart.build(data);
export const getCart = (id) => cart.get(id);
export const updateCart = (id, data) => cart.update(id, data);
export const getSubstitutes = (data) => cart.substitute(data);

export const prepareCheckout = (data) => checkout.prepare(data);
export const getOrderStatus = (id) => checkout.getOrderStatus(id);
export const getOrders = () => checkout.getOrders();

export const addRestockItem = (data) => restock.addItem(data);
export const getRestockDashboard = () => restock.getDashboard();
export const getRestockCalendar = () => restock.getCalendar();
export const submitRestockFeedback = (data) => restock.feedback(data);
export const createRestockBundle = () => restock.bundle();
export const setRestockBudget = (data) => restock.setBudget(data?.monthlyBudget ?? data);
export const getRestockAnalytics = () => restock.getAnalytics();
export const getRestockSchedule = () => restock.getSchedule();
export const getNotifications = () => restock.getNotifications();
export const getRestockHistory = () => restock.getHistory();
export const predictDepletion = (data) => restock.predict(data);

export const submitFeedback = (data) => feedback.send(data);

export { catalog, intent, ai, cart, checkout, restock, auth, feedback, subscriptions };
