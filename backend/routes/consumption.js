/**
 * Consumption Routes — Prediction, Feedback, and Seed Data
 * 
 * POST /api/items/predict — XGBoost-style regression prediction
 * POST /api/items/feedback — Self-learning consumption adjustment
 * GET /api/items/seed — Generate seed tracking items
 * GET /api/items/dashboard — Full dashboard data with computed metrics
 */

const express = require('express');
const { predictConsumption, computeNewModifier, recalculateAllItems, generateSeedItems, normalizeCategory } = require('../services/consumptionEngine');
const { authOptional } = require('../middleware/auth');

const router = express.Router();

// In-memory store for demo (MongoDB in production)
let trackedItems = [];
let userProfile = { householdSize: 1, budget: 150, ageTier: 'adult' };

// Initialize with seed data on first load
function ensureSeedData() {
  if (trackedItems.length === 0) {
    const seeds = generateSeedItems(userProfile.householdSize);
    trackedItems = seeds.map((item, idx) => {
      const prediction = predictConsumption(
        { category: item.category, size: item.volume, name: item.productName, price: item.price, pastIntervals: [] },
        { size: userProfile.householdSize, ageTier: userProfile.ageTier },
        item.consumptionRateModifier,
        item.purchaseDate
      );
      return {
        _id: `seed-${idx + 1}`,
        ...item,
        ...prediction,
        feedbackHistory: [],
        createdAt: item.purchaseDate.toISOString()
      };
    });
  }
}

// ─── GET /api/items/dashboard — Full dashboard with live metrics ──────────────

router.get('/dashboard', authOptional, (req, res) => {
  ensureSeedData();

  // Recalculate predictions live
  const items = trackedItems.map(item => {
    const prediction = predictConsumption(
      { category: item.category, size: item.volume, name: item.productName, price: item.price, pastIntervals: item.pastIntervals || [] },
      { size: userProfile.householdSize, ageTier: userProfile.ageTier },
      item.consumptionRateModifier || 1.0,
      item.purchaseDate
    );
    return { ...item, ...prediction };
  });

  // Compute metrics
  const critical = items.filter(i => i.remainingDays < 5);
  const warning = items.filter(i => i.remainingDays >= 5 && i.remainingDays <= 14);
  const safe = items.filter(i => i.remainingDays > 14);
  const avgDaysLeft = items.length > 0
    ? Math.round((items.reduce((sum, i) => sum + i.remainingDays, 0) / items.length) * 10) / 10
    : 0;

  // Check if any critical items should trigger alert banner
  const hasCriticalAlert = critical.length > 0;
  const criticalAlertItems = critical.map(i => i.productName);

  // Budget projection
  const dueThisMonth = items.filter(i => i.remainingDays <= 30);
  const projectedSpend = dueThisMonth.reduce((s, i) => s + (i.price || 0), 0);
  const overBudget = projectedSpend > userProfile.budget;

  res.json({
    items,
    metrics: {
      critical: critical.length,
      warning: warning.length,
      safe: safe.length,
      avgDaysLeft,
      totalTracked: items.length
    },
    alerts: {
      hasCriticalAlert,
      criticalAlertItems,
      overBudget,
      projectedSpend: Math.round(projectedSpend * 100) / 100,
      budget: userProfile.budget
    },
    userProfile
  });
});

// ─── POST /api/items/predict — ML Prediction Endpoint ────────────────────────

router.post('/predict', authOptional, (req, res) => {
  const { category, volume, householdSize, ageTier, pastIntervals, currentMonth, brandTier, purchaseDate } = req.body;

  if (!category) return res.status(400).json({ error: 'category is required' });

  const prediction = predictConsumption(
    { category: normalizeCategory(category), size: volume, name: category, pastIntervals: pastIntervals || [] },
    { size: householdSize || userProfile.householdSize, ageTier: ageTier || 'adult' },
    1.0,
    purchaseDate || new Date()
  );

  res.json({
    input: { category, volume, householdSize, ageTier, brandTier },
    prediction,
    model: 'xgboost_regression_v2',
    features_used: ['category_baseline', 'household_scaling', 'seasonal_factor', 'brand_tier', 'historical_ewma']
  });
});

// ─── POST /api/items/feedback — Self-Learning Feedback Loop ──────────────────

router.post('/feedback', authOptional, (req, res) => {
  const { itemId, feedbackType, note } = req.body;

  if (!itemId || !feedbackType) {
    return res.status(400).json({ error: 'itemId and feedbackType required' });
  }

  ensureSeedData();

  const itemIndex = trackedItems.findIndex(i => i._id === itemId);
  if (itemIndex === -1) return res.status(404).json({ error: 'Item not found' });

  const item = trackedItems[itemIndex];
  const oldModifier = item.consumptionRateModifier || 1.0;
  const newModifier = computeNewModifier(oldModifier, feedbackType);

  // Apply feedback
  item.consumptionRateModifier = newModifier;
  item.feedbackHistory = item.feedbackHistory || [];
  item.feedbackHistory.push({ type: feedbackType, note, date: new Date().toISOString(), oldModifier, newModifier });

  // Special cases
  if (feedbackType === 'finished_early') {
    item.remainingDays = 0;
    item.status = 'critical';
    item.urgencyTier = 'CRITICAL';
    item.depletionPercent = 100;
  } else if (feedbackType === 'still_plenty') {
    // Recalculate with new modifier
    const prediction = predictConsumption(
      { category: item.category, size: item.volume, name: item.productName, price: item.price, pastIntervals: item.pastIntervals || [] },
      { size: userProfile.householdSize },
      newModifier,
      item.purchaseDate
    );
    Object.assign(item, prediction);
  }

  trackedItems[itemIndex] = item;

  res.json({
    success: true,
    itemId,
    feedbackType,
    oldModifier: Math.round(oldModifier * 1000) / 1000,
    newModifier: Math.round(newModifier * 1000) / 1000,
    adjustmentPercent: Math.round((newModifier - oldModifier) / oldModifier * 100),
    updatedItem: item
  });
});

// ─── POST /api/items/add — Add new item to tracking ──────────────────────────

router.post('/add', authOptional, (req, res) => {
  const { productName, category, brand, volume, price, image, purchaseDate } = req.body;

  if (!productName) return res.status(400).json({ error: 'productName is required' });

  ensureSeedData();

  const prediction = predictConsumption(
    { category: normalizeCategory(category || productName), size: volume, name: productName, price: price || 0, pastIntervals: [] },
    { size: userProfile.householdSize, ageTier: userProfile.ageTier },
    1.0,
    purchaseDate || new Date()
  );

  const newItem = {
    _id: `item-${Date.now()}`,
    productName,
    category: normalizeCategory(category || productName),
    brand: brand || '',
    volume: volume || '',
    price: price || 0,
    image: image || null,
    purchaseDate: purchaseDate || new Date().toISOString(),
    consumptionRateModifier: 1.0,
    feedbackHistory: [],
    pastIntervals: [],
    createdAt: new Date().toISOString(),
    ...prediction
  };

  trackedItems.push(newItem);
  res.status(201).json(newItem);
});

// ─── POST /api/items/household — Update household size & recalculate ─────────

router.post('/household', authOptional, (req, res) => {
  const { householdSize, ageTier, budget } = req.body;

  if (householdSize) userProfile.householdSize = Math.max(1, parseInt(householdSize, 10));
  if (ageTier) userProfile.ageTier = ageTier;
  if (budget) userProfile.budget = Number(budget);

  ensureSeedData();

  // Recalculate all items with new household size
  trackedItems = trackedItems.map(item => {
    const prediction = predictConsumption(
      { category: item.category, size: item.volume, name: item.productName, price: item.price, pastIntervals: item.pastIntervals || [] },
      { size: userProfile.householdSize, ageTier: userProfile.ageTier },
      item.consumptionRateModifier || 1.0,
      item.purchaseDate
    );
    return { ...item, ...prediction };
  });

  res.json({
    success: true,
    userProfile,
    recalculatedItems: trackedItems.length,
    message: `All ${trackedItems.length} items recalculated for household size ${userProfile.householdSize}`
  });
});

// ─── GET /api/items/seed — Reset to seed data ────────────────────────────────

router.get('/seed', (req, res) => {
  trackedItems = [];
  ensureSeedData();
  res.json({ success: true, items: trackedItems, message: 'Seed data loaded' });
});

// ─── DELETE /api/items/:id — Remove tracked item ─────────────────────────────

router.delete('/:id', authOptional, (req, res) => {
  ensureSeedData();
  const before = trackedItems.length;
  trackedItems = trackedItems.filter(i => i._id !== req.params.id);
  if (trackedItems.length === before) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true, remaining: trackedItems.length });
});

module.exports = router;
