const express = require('express');
const RestockItem = require('../models/RestockItem');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const Cart = require('../models/Cart');
const { calculateDepletion, adjustFromFeedback, getBudgetAnalytics, getRestockSchedule, getSmartNotifications, generateUserRestockDashboard } = require('../services/restockService');
const { authOptional, authRequired } = require('../middleware/auth');
const User = require('../models/User');

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
    productId,
    quantity,
    purchaseDate: purchaseDate || new Date(),
    category: product.category,
    ...depletion
  });

  const populated = await RestockItem.findById(item._id).populate('productId');
  res.status(201).json(populated);
});

// ─── Dashboard (with prediction refresh) ─────────────────────────────────────

router.get('/dashboard', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const [items, user] = await Promise.all([
      RestockItem.find({ userId, isWishlist: false }).populate('productId').sort({ daysRemaining: 1 }),
      User.findById(userId).select('-password').lean()
    ]);

    const dashboard = generateUserRestockDashboard(items, user || {}, new Date());

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
  const items = await RestockItem.find(filter).populate('productId');

  const events = items.map(item => ({
    id: item._id,
    title: item.productId?.name || 'Product',
    date: item.expectedFinishDate,
    daysRemaining: item.daysRemaining,
    urgency: item.urgency,
    category: item.category,
    confidence: item.confidence,
    price: item.productId?.price
  }));

  res.json(events);
});

// ─── Feedback (with Bayesian learning) ───────────────────────────────────────

router.post('/feedback', authOptional, async (req, res) => {
  const { itemId, type, note } = req.body;
  const item = await RestockItem.findById(itemId).populate('productId');
  if (!item) return res.status(404).json({ error: 'Item not found' });

  // Push feedback to history first
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
  await item.save();

  res.json(item);
});

// ─── Smart Bundle (budget-aware) ─────────────────────────────────────────────

router.post('/bundle', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id, daysRemaining: { $lte: 7 } } : { daysRemaining: { $lte: 7 } };
  const dueItems = await RestockItem.find(filter).populate('productId');

  const productIds = dueItems.map(i => i.productId?._id).filter(Boolean);
  let total = 0;
  const items = dueItems.map(i => {
    total += (i.productId?.price || 0) * i.quantity;
    return { productId: i.productId._id, quantity: i.quantity, price: i.productId.price };
  });

  // Budget check
  let monthlyBudget = 150;
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    monthlyBudget = user?.monthlyBudget || 150;
  }

  const overBudget = total > monthlyBudget * 0.5; // Alert if bundle is > 50% of monthly budget

  const cart = await Cart.create({
    userId: req.user?.id,
    items,
    total,
    source: 'restock',
    intentSummary: `Restock bundle - ${dueItems.length} items`
  });

  res.json({
    cartId: cart._id,
    items: dueItems,
    total: Math.round(total * 100) / 100,
    message: `${dueItems.length} items added to bundle`,
    budgetWarning: overBudget ? `This bundle is $${total.toFixed(2)} — more than 50% of your $${monthlyBudget} monthly budget` : null,
    savings: dueItems.reduce((s, i) => {
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
  const items = await RestockItem.find(filter).populate('productId');
  const monthlyBudget = req.user?.id ? (await User.findById(req.user.id))?.monthlyBudget || 150 : 150;
  const analytics = getBudgetAnalytics(items, monthlyBudget);
  res.json(analytics);
});

// ─── Schedule (NEW: optimal reorder timeline) ────────────────────────────────

router.get('/schedule', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const items = await RestockItem.find(filter).populate('productId');
  const monthlyBudget = req.user?.id ? (await User.findById(req.user.id))?.monthlyBudget || 150 : 150;
  const schedule = getRestockSchedule(items, monthlyBudget);
  res.json(schedule);
});

// ─── Smart Notifications ─────────────────────────────────────────────────────

router.get('/notifications', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const items = await RestockItem.find(filter).populate('productId');

  // Generate smart notifications from predictor
  let userProfile = {};
  if (req.user?.id) {
    const { buildPurchaseProfile } = require('../services/feedbackLearner');
    userProfile = await buildPurchaseProfile(req.user.id);
  }

  const smartNotifs = getSmartNotifications(items, userProfile);

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
    ...storedNotifs.map(n => n.toObject())
  ];

  res.json(merged.slice(0, 15));
});

// ─── History ─────────────────────────────────────────────────────────────────

router.get('/history', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const items = await RestockItem.find(filter).populate('productId').sort({ updatedAt: -1 });
  res.json(items);
});

// ─── Predict (NEW: predict depletion for a product without tracking) ─────────

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
