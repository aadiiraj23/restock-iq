/**
 * Restock Service - Predictive Replenishment Engine
 * 
 * Extends the basic depletion calculation with ML-based prediction,
 * smart scheduling, and budget-aware recommendations.
 * Backward-compatible API + new enriched features.
 */

const { predictDepletion, generateRestockSchedule, generateSmartNotifications, CONSUMPTION_MODELS, computeFeedbackAdjustment, predictWithTimeSeries } = require('./restockPredictor');

// ─── Backward-compatible exports ─────────────────────────────────────────────

const LIFESPAN_BY_CATEGORY = Object.fromEntries(
  Object.entries(CONSUMPTION_MODELS).map(([cat, model]) => [cat, model.baseLifespanDays])
);

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Calculate depletion for a product (backward-compatible + enriched).
 * Uses the new ML predictor under the hood.
 */
function calculateDepletion(product, household = { size: 1, usageLevel: 'medium' }, purchaseDate = new Date(), quantity = 1, feedbackHistory = []) {
  const prediction = predictDepletion(product, household, purchaseDate, quantity, feedbackHistory);

  // Return backward-compatible format with enriched data
  return {
    expectedFinishDate: prediction.expectedFinishDate,
    daysRemaining: prediction.daysRemaining,
    days_remaining: prediction.days_remaining ?? prediction.daysRemaining,
    urgency: prediction.urgency,
    urgency_tier: prediction.urgency_tier,
    confidence: prediction.confidence,
    // New enriched fields
    totalLifespan: prediction.totalLifespan,
    dailyRate: prediction.dailyRate,
    depletionModel: prediction.depletionModel,
    seasonalEffect: prediction.seasonalEffect,
    feedbackLearned: prediction.feedbackLearned,
    velocity: prediction.velocity
  };
}

/**
 * Adjust remaining days from user feedback.
 * Uses Bayesian-style exponential update from the predictor.
 */
function adjustFromFeedback(currentDays, feedbackType, feedbackHistory = []) {
  // Simple immediate adjustment (backward compat)
  let adjusted = currentDays;
  if (feedbackType === 'finished_early') {
    adjusted = Math.round(currentDays * 0.55); // More aggressive than before
  } else if (feedbackType === 'still_plenty') {
    adjusted = Math.round(currentDays * 1.45);
  }

  // If we have history, apply cumulative Bayesian adjustment
  if (feedbackHistory.length > 0) {
    const bayesianFactor = computeFeedbackAdjustment(feedbackHistory);
    adjusted = Math.round(adjusted * bayesianFactor);
  }

  return Math.max(0, adjusted);
}

/**
 * Budget analytics with predictive spending projection.
 */
function getBudgetAnalytics(items, monthlyBudget = 150) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  // Items due within this month
  const dueThisMonth = items.filter(i => i.daysRemaining <= daysRemaining);
  const projectedSpend = dueThisMonth.reduce((sum, i) => sum + (i.productId?.price || 0) * (i.quantity || 1), 0);

  // Category breakdown
  const categorySpend = {};
  for (const item of items) {
    const cat = item.category || 'other';
    const price = (item.productId?.price || 0) * (item.quantity || 1);
    categorySpend[cat] = (categorySpend[cat] || 0) + price;
  }

  // Urgency tiers
  const immediate = items.filter(i => i.daysRemaining <= 2);
  const thisWeek = items.filter(i => i.daysRemaining > 2 && i.daysRemaining <= 7);
  const nextWeek = items.filter(i => i.daysRemaining > 7 && i.daysRemaining <= 14);

  // Spending pace (are they on track to stay within budget?)
  const dailyBudget = monthlyBudget / daysInMonth;
  const idealSpentSoFar = dailyBudget * dayOfMonth;
  const actualSpent = Object.values(categorySpend).reduce((s, v) => s + v, 0) - projectedSpend; // Rough estimate
  const spendingPace = actualSpent > idealSpentSoFar * 1.2 ? 'over' : (actualSpent < idealSpentSoFar * 0.8 ? 'under' : 'on_track');

  // Smart savings suggestions
  const savingsSuggestions = [];
  for (const item of thisWeek) {
    const product = item.productId;
    if (product?.originalPrice && product.price < product.originalPrice) {
      savingsSuggestions.push({
        productName: product.name,
        savings: product.originalPrice - product.price,
        message: `Buy ${product.name} now and save $${(product.originalPrice - product.price).toFixed(2)}`
      });
    }
  }

  return {
    monthlyBudget,
    projectedSpend: Math.round(projectedSpend * 100) / 100,
    overBudget: projectedSpend > monthlyBudget,
    remainingBudget: Math.round((monthlyBudget - projectedSpend) * 100) / 100,
    categorySpend,
    dueSoonCount: immediate.length + thisWeek.length,
    breakdown: {
      immediate: immediate.length,
      thisWeek: thisWeek.length,
      nextWeek: nextWeek.length,
      later: items.length - immediate.length - thisWeek.length - nextWeek.length
    },
    spendingPace,
    savingsSuggestions,
    daysRemainingInMonth: daysRemaining
  };
}

/**
 * Generate optimal restock schedule (new feature).
 * Wraps the predictor's schedule generator.
 */
function getRestockSchedule(items, monthlyBudget) {
  return generateRestockSchedule(items, monthlyBudget);
}

/**
 * Generate smart notifications (new feature).
 */
function getSmartNotifications(items, userProfile) {
  return generateSmartNotifications(items, userProfile);
}

function generateUserRestockDashboard(items, userProfile = {}, currentDate = new Date()) {
  const checklist = items
    .map(item => {
      const urgencyTier = item.urgency_tier || (item.urgency === 'danger' ? 'CRITICAL' : item.urgency === 'warning' ? 'WARNING' : 'SAFE');
      const daysRemaining = roundDays(item.daysRemaining ?? item.days_remaining ?? 0);
      const targetDate = new Date(currentDate);
      targetDate.setDate(targetDate.getDate() + Math.max(0, Math.round(daysRemaining)));

      return {
        itemId: item._id,
        productId: item.productId?._id || item.productId,
        productName: item.productId?.name || 'Product',
        category: item.category || item.productId?.category || 'other',
        daysRemaining,
        urgencyTier,
        urgency: item.urgency || (urgencyTier === 'CRITICAL' ? 'danger' : urgencyTier === 'WARNING' ? 'warning' : 'safe'),
        targetDate: targetDate.toISOString(),
        quantity: item.quantity || 1,
        confidence: item.confidence ?? 0,
        price: item.productId?.price || 0
      };
    })
    .sort((a, b) => urgencyRank(a.urgencyTier) - urgencyRank(b.urgencyTier) || a.daysRemaining - b.daysRemaining);

  const categoryTotals = new Map();
  for (const item of items) {
    const category = item.category || item.productId?.category || 'other';
    const price = (item.productId?.price || 0) * (item.quantity || 1);
    const current = categoryTotals.get(category) || { category, totalSpend: 0, itemCount: 0 };
    current.totalSpend += price;
    current.itemCount += 1;
    categoryTotals.set(category, current);
  }

  const totalSpend = [...categoryTotals.values()].reduce((sum, entry) => sum + entry.totalSpend, 0) || 0;
  const categorySpending = [...categoryTotals.values()]
    .map(entry => ({
      ...entry,
      totalSpend: roundMoney(entry.totalSpend),
      share: totalSpend > 0 ? Math.round((entry.totalSpend / totalSpend) * 1000) / 10 : 0,
      bar: totalSpend > 0 ? Math.round((entry.totalSpend / totalSpend) * 100) : 0
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  const calendarMilestonesMap = new Map();
  for (const item of checklist) {
    if (item.daysRemaining > 30) continue;
    const dayOffset = Math.max(0, Math.round(item.daysRemaining));
    const milestoneDate = new Date(currentDate);
    milestoneDate.setDate(milestoneDate.getDate() + dayOffset);
    const key = milestoneDate.toISOString().slice(0, 10);

    if (!calendarMilestonesMap.has(key)) {
      calendarMilestonesMap.set(key, {
        date: key,
        dayOffset,
        title: dayOffset === 0 ? 'Restock today' : `Restock in ${dayOffset} day${dayOffset === 1 ? '' : 's'}`,
        urgencyTier: item.urgencyTier,
        items: []
      });
    }

    calendarMilestonesMap.get(key).items.push({
      itemId: item.itemId,
      productName: item.productName,
      category: item.category,
      daysRemaining: item.daysRemaining,
      urgencyTier: item.urgencyTier,
      price: item.price
    });
  }

  const calendarMilestones = [...calendarMilestonesMap.values()]
    .sort((a, b) => a.dayOffset - b.dayOffset)
    .map(milestone => ({
      ...milestone,
      itemCount: milestone.items.length
    }));

  return {
    userProfile: {
      name: userProfile?.name || null,
      email: userProfile?.email || null,
      household: userProfile?.household || { size: 1, usageLevel: 'medium' },
      monthlyBudget: userProfile?.monthlyBudget || 150
    },
    checklist,
    categorySpending,
    calendarMilestones,
    summary: {
      totalItems: items.length,
      criticalCount: checklist.filter(item => item.urgencyTier === 'CRITICAL').length,
      warningCount: checklist.filter(item => item.urgencyTier === 'WARNING').length,
      safeCount: checklist.filter(item => item.urgencyTier === 'SAFE').length,
      estimatedSpend: roundMoney(totalSpend),
      next30DaysCount: checklist.filter(item => item.daysRemaining <= 30).length
    }
  };
}

function urgencyRank(urgencyTier) {
  if (urgencyTier === 'CRITICAL') return 0;
  if (urgencyTier === 'WARNING') return 1;
  return 2;
}

function roundMoney(value) {
  return Math.round((value || 0) * 100) / 100;
}

function roundDays(value) {
  return Math.round((value || 0) * 100) / 100;
}

module.exports = {
  calculateDepletion,
  adjustFromFeedback,
  getBudgetAnalytics,
  getRestockSchedule,
  getSmartNotifications,
  generateUserRestockDashboard,
  calculateDepletionML,
  LIFESPAN_BY_CATEGORY
};

/**
 * ML-enhanced depletion calculation using time-series prediction.
 * Uses exponential smoothing when purchase history intervals are available.
 * Falls back to rule-based prediction otherwise.
 */
function calculateDepletionML(product, purchaseIntervals = [], household = {}, lastPurchaseDate = new Date(), feedbackHistory = []) {
  const prediction = predictWithTimeSeries(product, purchaseIntervals, household, lastPurchaseDate, feedbackHistory);
  return {
    expectedFinishDate: prediction.expectedFinishDate,
    daysRemaining: prediction.daysRemaining,
    urgency: prediction.urgency,
    confidence: prediction.confidence,
    totalLifespan: prediction.totalLifespan,
    dailyRate: prediction.dailyRate,
    depletionModel: prediction.depletionModel,
    trend: prediction.trend,
    trendValue: prediction.trendValue,
    feedbackLearned: prediction.feedbackLearned,
    mlPowered: prediction.mlPowered
  };
}
