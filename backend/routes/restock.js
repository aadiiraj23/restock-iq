const express = require('express');
const { RestockItem, Product, Notification, Cart, User } = require('../dataStore');
const { calculateDepletion, adjustFromFeedback, getBudgetAnalytics, getRestockSchedule, getSmartNotifications, generateUserRestockDashboard } = require('../services/restockService');
const { authOptional, authRequired } = require('../middleware/auth');

const router = express.Router();

// ─── Add Tracked Item (with ML prediction) ───────────────────────────────────

router.post('/items', authOptional, async (req, res) => {
  const { productId, quantity = 1, purchaseDate } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  let household = { size: 1, usageLevel: 'medium' };
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    household = user?.household || household;
  }

  // Use ML predictor with feedback history for this category
  const existingItems = await RestockItem.find({
    userId: req.user?.id,
    category: product.category
  });
  const feedbackHistory = existingItems.flatMap(i => i.feedbackHistory || []);

  const depletion = calculateDepletion(
    product,
    household,
    purchaseDate ? new Date(purchaseDate) : new Date(),
    quantity,
    feedbackHistory
  );

  const item = await RestockItem.create({
    userId: req.user?.id,
    productId: product._id,
    quantity,
    purchaseDate: purchaseDate || new Date(),
    category: product.category,
    ...depletion
  });

  // Populate product info
  item.productId = product;
  res.status(201).json(item);
});

// ─── Dashboard (with prediction refresh) ─────────────────────────────────────

router.get('/dashboard', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const items = await RestockItem.find({ userId, isWishlist: false });
    
    // Populate and sort
    const populatedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      populatedItems.push({ ...item, productId: product });
    }
    populatedItems.sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));

    const user = await User.findById(userId);
    const { password, ...userWithoutPw } = user || {};

    const dashboard = generateUserRestockDashboard(populatedItems, userWithoutPw || {}, new Date());

    res.json({
      userId,
      ...dashboard
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load restock dashboard', details: err.message });
  }
});

// ─── Calendar View ───────────────────────────────────────────────────────────

router.get('/calendar', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const items = await RestockItem.find(filter);

  const events = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    events.push({
      id: item._id,
      title: product?.name || 'Product',
      date: item.expectedFinishDate,
      daysRemaining: item.daysRemaining,
      urgency: item.urgency,
      category: item.category,
      confidence: item.confidence,
      price: product?.price
    });
  }

  res.json(events);
});

// ─── Feedback (with Bayesian learning) ───────────────────────────────────────

router.post('/feedback', authOptional, async (req, res) => {
  const { itemId, type, note } = req.body;
  const item = await RestockItem.findById(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const product = await Product.findById(item.productId);

  // Push feedback to history first
  if (!item.feedbackHistory) item.feedbackHistory = [];
  item.feedbackHistory.push({ type, note, date: new Date() });

  // Use Bayesian adjustment with full history
  const adjustedDays = adjustFromFeedback(item.daysRemaining, type, item.feedbackHistory);
  const newFinish = new Date();
  newFinish.setDate(newFinish.getDate() + adjustedDays);

  let urgency = 'safe';
  if (adjustedDays <= 2) urgency = 'danger';
  else if (adjustedDays <= 5) urgency = 'warning';

  item.daysRemaining = adjustedDays;
  item.expectedFinishDate = newFinish;
  item.urgency = urgency;

  // Recalculate confidence (more feedback = more confident)
  item.confidence = Math.min(0.98, 0.8 + item.feedbackHistory.length * 0.03);

  // Save back
  await RestockItem.findByIdAndUpdate(item._id, item);

  item.productId = product;
  res.json(item);
});

// ─── Smart Bundle (budget-aware) ─────────────────────────────────────────────

router.post('/bundle', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const allItems = await RestockItem.find(filter);
  const dueItems = allItems.filter(i => i.daysRemaining <= 7);

  // Populate products
  const populatedDueItems = [];
  for (const item of dueItems) {
    const product = await Product.findById(item.productId);
    if (product) {
      populatedDueItems.push({ ...item, productId: product });
    }
  }

  const productIds = populatedDueItems.map(i => i.productId?._id).filter(Boolean);
  let total = 0;
  const items = populatedDueItems.map(i => {
    total += (i.productId?.price || 0) * i.quantity;
    return { productId: i.productId._id, quantity: i.quantity, price: i.productId.price };
  });

  // Budget check
  let monthlyBudget = 150;
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    monthlyBudget = user?.monthlyBudget || 150;
  }

  const overBudget = total > monthlyBudget * 0.5;

  const cart = await Cart.create({
    userId: req.user?.id,
    items,
    total,
    source: 'restock',
    intentSummary: `Restock bundle - ${populatedDueItems.length} items`
  });

  res.json({
    cartId: cart._id,
    items: populatedDueItems,
    total: Math.round(total * 100) / 100,
    message: `${populatedDueItems.length} items added to bundle`,
    budgetWarning: overBudget ? `This bundle is ₹${total.toFixed(2)} — more than 50% of your ₹${monthlyBudget} monthly budget` : null,
    savings: populatedDueItems.reduce((s, i) => {
      const orig = i.productId?.originalPrice || i.productId?.price || 0;
      return s + (orig - (i.productId?.price || 0));
    }, 0).toFixed(2)
  });
});

// ─── Budget Management ───────────────────────────────────────────────────────

router.post('/budget', authRequired, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, { monthlyBudget: req.body.monthlyBudget }, { new: true });
  res.json({ monthlyBudget: user.monthlyBudget });
});

// ─── Analytics (with predictive insights) ────────────────────────────────────

router.get('/analytics', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const items = await RestockItem.find(filter);
  
  // Populate
  const populatedItems = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    populatedItems.push({ ...item, productId: product });
  }

  const monthlyBudget = req.user?.id ? ((await User.findById(req.user.id))?.monthlyBudget || 150) : 150;
  const analytics = getBudgetAnalytics(populatedItems, monthlyBudget);
  res.json(analytics);
});

// ─── Schedule (optimal reorder timeline) ─────────────────────────────────────

router.get('/schedule', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const items = await RestockItem.find(filter);
  
  const populatedItems = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    populatedItems.push({ ...item, productId: product });
  }

  const monthlyBudget = req.user?.id ? ((await User.findById(req.user.id))?.monthlyBudget || 150) : 150;
  const schedule = getRestockSchedule(populatedItems, monthlyBudget);
  res.json(schedule);
});

// ─── Smart Notifications ─────────────────────────────────────────────────────

router.get('/notifications', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const items = await RestockItem.find(filter);

  // Populate
  const populatedItems = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    populatedItems.push({ ...item, productId: product });
  }

  // Generate smart notifications from predictor
  let userProfile = {};
  if (req.user?.id) {
    const { buildPurchaseProfile } = require('../services/feedbackLearner');
    userProfile = await buildPurchaseProfile(req.user.id);
  }

  const smartNotifs = getSmartNotifications(populatedItems, userProfile);

  // Also check stored notifications
  const storedFilter = req.user?.id ? { userId: req.user.id, status: 'active' } : { status: 'active' };
  const storedNotifs = await Notification.find(storedFilter).sort({ triggerTime: -1 }).limit(10);

  // Merge: smart notifications first, then stored ones
  const merged = [
    ...smartNotifs.map(n => ({
      _id: n.itemId || n.productId,
      type: n.type,
      priority: n.priority,
      title: n.title,
      message: n.message,
      action: n.action,
      price: n.price,
      savings: n.savings,
      triggerTime: new Date(),
      status: 'active'
    })),
    ...storedNotifs
  ];

  res.json(merged.slice(0, 15));
});

// ─── History ─────────────────────────────────────────────────────────────────

router.get('/history', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const items = await RestockItem.find(filter).sort({ updatedAt: -1 });
  
  const populatedItems = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    populatedItems.push({ ...item, productId: product });
  }

  res.json(populatedItems);
});

// ─── Predict (predict depletion for a product without tracking) ──────────────

router.post('/predict', authOptional, async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  let household = { size: 1, usageLevel: 'medium' };
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    household = user?.household || household;
  }

  const prediction = calculateDepletion(product, household, new Date(), quantity, []);
  res.json({
    product: { name: product.name, category: product.category, price: product.price },
    prediction
  });
});

module.exports = router;
