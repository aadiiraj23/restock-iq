/**
 * Subscriptions Route
 * 
 * Manages product subscriptions (weekly/monthly).
 * Users can subscribe, pause, cancel, and view their subscriptions with calendar/timeline.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Product, collections } = require('../dataStore');
const { authOptional } = require('../middleware/auth');

const router = express.Router();

// In-memory subscriptions store
let subscriptions = [];

// ─── Seed Dummy Data ─────────────────────────────────────────────────────────

function seedDummySubscriptions() {
  if (subscriptions.length > 0) return;

  const now = new Date();
  const products = collections.products;

  // Pick some popular products for dummy subscriptions
  const dummySubs = [
    { productId: 'PROD_008', frequency: 'monthly', startDate: new Date(now.getTime() - 60 * 86400000), quantity: 2 },
    { productId: 'PROD_055', frequency: 'monthly', startDate: new Date(now.getTime() - 45 * 86400000), quantity: 1 },
    { productId: 'PROD_031', frequency: 'monthly', startDate: new Date(now.getTime() - 30 * 86400000), quantity: 1 },
    { productId: 'PROD_059', frequency: 'weekly', startDate: new Date(now.getTime() - 28 * 86400000), quantity: 3 },
    { productId: 'PROD_091', frequency: 'weekly', startDate: new Date(now.getTime() - 21 * 86400000), quantity: 2 },
    { productId: 'PROD_046', frequency: 'monthly', startDate: new Date(now.getTime() - 35 * 86400000), quantity: 1 },
    { productId: 'PROD_001', frequency: 'monthly', startDate: new Date(now.getTime() - 40 * 86400000), quantity: 1 },
  ];

  subscriptions = dummySubs.map((sub, idx) => {
    const product = products.find(p => p._id === sub.productId);
    if (!product) return null;

    const intervalDays = sub.frequency === 'weekly' ? 7 : 30;
    const daysSinceStart = Math.floor((now - sub.startDate) / 86400000);
    const deliveriesCompleted = Math.floor(daysSinceStart / intervalDays);
    const nextDeliveryDate = new Date(sub.startDate.getTime() + (deliveriesCompleted + 1) * intervalDays * 86400000);

    // Build delivery history
    const deliveryHistory = [];
    for (let i = 0; i < deliveriesCompleted; i++) {
      const deliveryDate = new Date(sub.startDate.getTime() + (i + 1) * intervalDays * 86400000);
      deliveryHistory.push({
        date: deliveryDate.toISOString(),
        amount: product.price * sub.quantity,
        status: 'delivered'
      });
    }

    return {
      _id: `sub-${idx + 1}`,
      userId: 'user-admin-001',
      productId: sub.productId,
      productName: product.name,
      productBrand: product.brand,
      productImage: product.image,
      productPrice: product.price,
      category: product.category,
      frequency: sub.frequency,
      quantity: sub.quantity,
      startDate: sub.startDate.toISOString(),
      nextDeliveryDate: nextDeliveryDate.toISOString(),
      status: 'active',
      totalSpent: deliveryHistory.reduce((s, d) => s + d.amount, 0),
      deliveriesCompleted,
      deliveryHistory,
      createdAt: sub.startDate.toISOString(),
      updatedAt: now.toISOString()
    };
  }).filter(Boolean);

  console.log(`[Subscriptions] Seeded ${subscriptions.length} dummy subscriptions`);
}

seedDummySubscriptions();

// ─── GET /api/subscriptions — List all subscriptions ─────────────────────────

router.get('/', authOptional, async (req, res) => {
  const userId = req.user?.id || 'user-admin-001';
  const userSubs = subscriptions.filter(s => s.userId === userId);
  res.json(userSubs);
});

// ─── GET /api/subscriptions/calendar — Calendar view with delivery dates ─────

router.get('/calendar', authOptional, async (req, res) => {
  const userId = req.user?.id || 'user-admin-001';
  const userSubs = subscriptions.filter(s => s.userId === userId && s.status === 'active');

  // Generate upcoming deliveries for the next 90 days
  const now = new Date();
  const events = [];

  for (const sub of userSubs) {
    const intervalDays = sub.frequency === 'weekly' ? 7 : 30;
    let nextDate = new Date(sub.nextDeliveryDate);

    // Generate events for next 90 days
    for (let i = 0; i < 12; i++) {
      if (nextDate > new Date(now.getTime() + 90 * 86400000)) break;
      if (nextDate >= now) {
        events.push({
          id: `${sub._id}-delivery-${i}`,
          subscriptionId: sub._id,
          productName: sub.productName,
          productBrand: sub.productBrand,
          productImage: sub.productImage,
          date: nextDate.toISOString(),
          amount: sub.productPrice * sub.quantity,
          quantity: sub.quantity,
          frequency: sub.frequency,
          category: sub.category,
          type: 'upcoming_delivery'
        });
      }
      nextDate = new Date(nextDate.getTime() + intervalDays * 86400000);
    }
  }

  // Also add past deliveries from history
  for (const sub of userSubs) {
    for (const delivery of sub.deliveryHistory) {
      events.push({
        id: `${sub._id}-past-${delivery.date}`,
        subscriptionId: sub._id,
        productName: sub.productName,
        productBrand: sub.productBrand,
        productImage: sub.productImage,
        date: delivery.date,
        amount: delivery.amount,
        quantity: sub.quantity,
        frequency: sub.frequency,
        category: sub.category,
        type: 'past_delivery',
        status: delivery.status
      });
    }
  }

  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(events);
});

// ─── GET /api/subscriptions/expenses — Timeline expense analytics ────────────

router.get('/expenses', authOptional, async (req, res) => {
  const userId = req.user?.id || 'user-admin-001';
  const userSubs = subscriptions.filter(s => s.userId === userId);

  // Monthly expense breakdown
  const monthlyExpenses = {};
  const categoryExpenses = {};
  let totalSpent = 0;

  for (const sub of userSubs) {
    for (const delivery of sub.deliveryHistory) {
      const date = new Date(delivery.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyExpenses[monthKey]) {
        monthlyExpenses[monthKey] = { month: monthKey, total: 0, items: [] };
      }
      monthlyExpenses[monthKey].total += delivery.amount;
      monthlyExpenses[monthKey].items.push({
        productName: sub.productName,
        amount: delivery.amount,
        date: delivery.date
      });

      // Category breakdown
      if (!categoryExpenses[sub.category]) {
        categoryExpenses[sub.category] = { category: sub.category, total: 0, count: 0 };
      }
      categoryExpenses[sub.category].total += delivery.amount;
      categoryExpenses[sub.category].count++;

      totalSpent += delivery.amount;
    }
  }

  // Projected monthly cost
  const projectedMonthly = userSubs
    .filter(s => s.status === 'active')
    .reduce((sum, sub) => {
      const deliveriesPerMonth = sub.frequency === 'weekly' ? 4 : 1;
      return sum + (sub.productPrice * sub.quantity * deliveriesPerMonth);
    }, 0);

  res.json({
    totalSpent: Math.round(totalSpent * 100) / 100,
    projectedMonthly: Math.round(projectedMonthly * 100) / 100,
    activeSubscriptions: userSubs.filter(s => s.status === 'active').length,
    monthlyBreakdown: Object.values(monthlyExpenses).sort((a, b) => a.month.localeCompare(b.month)),
    categoryBreakdown: Object.values(categoryExpenses).sort((a, b) => b.total - a.total),
    subscriptions: userSubs
  });
});

// ─── POST /api/subscriptions — Create a new subscription ─────────────────────

router.post('/', authOptional, async (req, res) => {
  const { productId, frequency = 'monthly', quantity = 1 } = req.body;

  if (!productId) return res.status(400).json({ error: 'productId is required' });
  if (!['weekly', 'monthly'].includes(frequency)) {
    return res.status(400).json({ error: 'frequency must be weekly or monthly' });
  }

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const userId = req.user?.id || 'user-admin-001';

  // Check if already subscribed
  const existing = subscriptions.find(s => s.userId === userId && s.productId === productId && s.status === 'active');
  if (existing) {
    return res.status(400).json({ error: 'Already subscribed to this product', subscription: existing });
  }

  const now = new Date();
  const intervalDays = frequency === 'weekly' ? 7 : 30;
  const nextDeliveryDate = new Date(now.getTime() + intervalDays * 86400000);

  const subscription = {
    _id: `sub-${uuidv4().slice(0, 8)}`,
    userId,
    productId,
    productName: product.name,
    productBrand: product.brand,
    productImage: product.image,
    productPrice: product.price,
    category: product.category,
    frequency,
    quantity,
    startDate: now.toISOString(),
    nextDeliveryDate: nextDeliveryDate.toISOString(),
    status: 'active',
    totalSpent: 0,
    deliveriesCompleted: 0,
    deliveryHistory: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  subscriptions.push(subscription);
  res.status(201).json(subscription);
});

// ─── PUT /api/subscriptions/:id — Update subscription (frequency, quantity, pause/resume) ─

router.put('/:id', authOptional, async (req, res) => {
  const { frequency, quantity, status } = req.body;
  const sub = subscriptions.find(s => s._id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  if (frequency && ['weekly', 'monthly'].includes(frequency)) sub.frequency = frequency;
  if (quantity && quantity > 0) sub.quantity = quantity;
  if (status && ['active', 'paused', 'cancelled'].includes(status)) sub.status = status;

  sub.updatedAt = new Date().toISOString();

  // Recalculate next delivery if resumed
  if (status === 'active') {
    const intervalDays = sub.frequency === 'weekly' ? 7 : 30;
    sub.nextDeliveryDate = new Date(Date.now() + intervalDays * 86400000).toISOString();
  }

  res.json(sub);
});

// ─── DELETE /api/subscriptions/:id — Cancel subscription ─────────────────────

router.delete('/:id', authOptional, async (req, res) => {
  const idx = subscriptions.findIndex(s => s._id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Subscription not found' });

  subscriptions[idx].status = 'cancelled';
  subscriptions[idx].updatedAt = new Date().toISOString();
  res.json({ success: true, message: 'Subscription cancelled' });
});

module.exports = router;
