/**
 * Restock Predictor - ML-based Consumption & Depletion Engine
 * 
 * Predicts when consumable products will run out using:
 * 1. Product-specific consumption curves (not just linear)
 * 2. Household size & usage pattern modeling
 * 3. Bayesian updates from user feedback (finished_early / still_plenty)
 * 4. Seasonal adjustments (cleaning products spike in spring, sunscreen in summer)
 * 5. Category-specific depletion models
 * 6. Budget-aware restock scheduling (batch orders for savings)
 * 7. Smart reminder timing (not too early, not too late)
 */

const CONSUMPTION_MODELS = {
  // Each category has a base model with parameters
  personal_care: {
    baseLifespanDays: 25,
    depletionCurve: 'linear',       // Steady daily use
    householdScaling: 'per_person',  // Each person uses independently
    variancePercent: 15,
    seasonalFactors: { winter: 1.1, summer: 0.9 } // Lotion usage varies
  },
  cleaning: {
    baseLifespanDays: 35,
    depletionCurve: 'burst',        // Used in bursts (cleaning days)
    householdScaling: 'sqrt',       // More people = slightly more, but not linear
    variancePercent: 25,
    seasonalFactors: { spring: 0.7, default: 1.0 } // Spring cleaning = faster use
  },
  household: {
    baseLifespanDays: 20,
    depletionCurve: 'linear',
    householdScaling: 'per_person',
    variancePercent: 20,
    seasonalFactors: {}
  },
  medicine: {
    baseLifespanDays: 90,
    depletionCurve: 'exponential_decay', // Used heavily at first, tapers off
    householdScaling: 'none',            // Individual use
    variancePercent: 40,
    seasonalFactors: { winter: 0.7, fall: 0.8 } // Cold season = faster use
  },
  snacks: {
    baseLifespanDays: 7,
    depletionCurve: 'accelerating',     // Gets eaten faster as supply drops
    householdScaling: 'per_person',
    variancePercent: 30,
    seasonalFactors: {}
  },
  pantry: {
    baseLifespanDays: 28,
    depletionCurve: 'linear',
    householdScaling: 'sqrt',
    variancePercent: 20,
    seasonalFactors: {}
  },
  groceries: {
    baseLifespanDays: 5,
    depletionCurve: 'accelerating',
    householdScaling: 'per_person',
    variancePercent: 25,
    seasonalFactors: {}
  },
  office: {
    baseLifespanDays: 45,
    depletionCurve: 'linear',
    householdScaling: 'none',
    variancePercent: 30,
    seasonalFactors: {}
  },
  baby: {
    baseLifespanDays: 14,
    depletionCurve: 'linear',
    householdScaling: 'none',     // Per baby, not household
    variancePercent: 15,
    seasonalFactors: {}
  },
  travel: {
    baseLifespanDays: 14,
    depletionCurve: 'burst',
    householdScaling: 'per_person',
    variancePercent: 35,
    seasonalFactors: { summer: 0.7 } // Travel season
  }
};

const USAGE_LEVEL_FACTORS = { low: 1.4, medium: 1.0, high: 0.65 };

const PERSONAL_ITEM_CATEGORIES = new Set(['personal_care', 'medicine', 'baby']);
const SHARED_ITEM_CATEGORIES = new Set(['pantry', 'cleaning', 'household', 'groceries', 'snacks', 'travel', 'office']);
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ML Integration for time-series prediction
let mlModels = null;
try {
  mlModels = require('./mlModels');
} catch { /* ML not loaded yet */ }

// ─── Core Prediction Engine ──────────────────────────────────────────────────

function calculateExponentialSmoothing(purchaseHistory = [], startingVelocity = 1) {
  const events = normaliseHistoryEvents(purchaseHistory)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (events.length === 0) {
    return {
      velocity: startingVelocity,
      smoothedVelocity: startingVelocity,
      bayesianVelocity: 1,
      earlySignals: 0,
      plentySignals: 0,
      sampleSize: 0
    };
  }

  const smoothingAlpha = 0.35;
  let smoothedVelocity = startingVelocity;
  let earlySignals = 0;
  let plentySignals = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const recencyWeight = Math.pow(0.85, events.length - 1 - i);

    if (event.signal === 'finished_early') {
      earlySignals += recencyWeight;
      smoothedVelocity = smoothingAlpha * 0.85 + (1 - smoothingAlpha) * smoothedVelocity;
    } else if (event.signal === 'still_have_plenty') {
      plentySignals += recencyWeight;
      smoothedVelocity = smoothingAlpha * 1.15 + (1 - smoothingAlpha) * smoothedVelocity;
    }
  }

  const bayesianVelocity = (plentySignals + 1) / (earlySignals + 1);
  const velocity = clampNumber(((smoothedVelocity + bayesianVelocity) / 2), 0.4, 2.5);

  return {
    velocity,
    smoothedVelocity,
    bayesianVelocity,
    earlySignals: Math.round(earlySignals * 1000) / 1000,
    plentySignals: Math.round(plentySignals * 1000) / 1000,
    sampleSize: events.length
  };
}

function calculateDepletion(purchaseHistory = [], householdProfile = {}, productLifespan = 0) {
  const now = new Date();
  const baseLifespan = resolveBaseLifespan(productLifespan);
  const category = resolveCategory(productLifespan);
  const householdSize = Math.max(1, parseInt(householdProfile.household_size ?? householdProfile.size ?? 1, 10) || 1);
  const isSharedItem = resolveSharingMode(productLifespan, category);
  const householdScale = isSharedItem ? householdSize : 1;
  const smoothing = calculateExponentialSmoothing(purchaseHistory, 1);
  const referenceDate = getMostRecentHistoryDate(purchaseHistory) || now;
  const elapsedDays = Math.max(0, (now.getTime() - referenceDate.getTime()) / MS_PER_DAY);
  const adjustedLifespan = Math.max(0, (baseLifespan / householdScale) * smoothing.velocity);
  const preciseDaysRemaining = Math.max(0, adjustedLifespan - elapsedDays);
  const daysRemaining = Math.round(preciseDaysRemaining * 100) / 100;
  const urgencyTier = daysRemaining <= 2 ? 'CRITICAL' : daysRemaining <= 5 ? 'WARNING' : 'SAFE';
  const legacyUrgency = urgencyTier === 'CRITICAL' ? 'danger' : urgencyTier === 'WARNING' ? 'warning' : 'safe';

  return {
    days_remaining: daysRemaining,
    daysRemaining,
    urgency: legacyUrgency,
    urgency_tier: urgencyTier,
    expectedFinishDate: addDays(now, daysRemaining),
    totalLifespan: Math.round(adjustedLifespan * 100) / 100,
    baseLifespan,
    householdSize,
    householdScale,
    velocity: Math.round(smoothing.velocity * 1000) / 1000,
    smoothing: {
      smoothedVelocity: Math.round(smoothing.smoothedVelocity * 1000) / 1000,
      bayesianVelocity: Math.round(smoothing.bayesianVelocity * 1000) / 1000,
      earlySignals: smoothing.earlySignals,
      plentySignals: smoothing.plentySignals,
      sampleSize: smoothing.sampleSize
    },
    calculatedAt: now.toISOString()
  };
}

/**
 * Predict depletion for a product given household context and history.
 * Returns: expectedFinishDate, daysRemaining, confidence, urgency, depletionRate
 * 
 * @param {Object} product - Product document
 * @param {Object} household - { size, usageLevel }
 * @param {Date} purchaseDate - When product was bought
 * @param {Number} quantity - How many units
 * @param {Array} feedbackHistory - Past feedback on this item type
 * @returns {Object} Prediction result
 */
function predictDepletion(product, household = {}, purchaseDate = new Date(), quantity = 1, feedbackHistory = []) {
  const category = product.category || 'household';
  const model = CONSUMPTION_MODELS[category] || CONSUMPTION_MODELS.household;
  const purchaseHistory = Array.isArray(feedbackHistory)
    ? feedbackHistory.map((feedback, index) => ({
        ...feedback,
        type: feedback?.type || feedback?.signal || feedback?.status || null,
        date: feedback?.date || feedback?.timestamp || purchaseDate,
        index
      }))
    : [];

  const depletion = calculateDepletion(purchaseHistory, household, {
    category,
    baseLifespanDays: product.avgLifespanDays || model.baseLifespanDays,
    shared: model.householdScaling !== 'none'
  });

  const daysSincePurchase = Math.max(0, (Date.now() - new Date(purchaseDate).getTime()) / MS_PER_DAY);
  const rawRemaining = Math.max(0, depletion.totalLifespan - daysSincePurchase);
  const curvedRemaining = Math.max(0, Math.round(applyCurve(rawRemaining, Math.max(1, depletion.totalLifespan), daysSincePurchase, model.depletionCurve) * 100) / 100);
  const expectedFinishDate = new Date();
  expectedFinishDate.setDate(expectedFinishDate.getDate() + curvedRemaining);

  const baseConfidence = 0.90;
  const variancePenalty = model.variancePercent / 200;
  const timePenalty = Math.min(0.15, daysSincePurchase / (Math.max(1, depletion.totalLifespan) * 5));
  const feedbackBoost = Math.min(0.1, purchaseHistory.length * 0.02);
  const confidence = Math.max(0.5, Math.min(0.98, baseConfidence - variancePenalty - timePenalty + feedbackBoost));

  return {
    expectedFinishDate,
    daysRemaining: curvedRemaining,
    days_remaining: curvedRemaining,
    totalLifespan: Math.round(depletion.totalLifespan * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    urgency: depletion.urgency,
    urgency_tier: depletion.urgency_tier,
    dailyRate: depletion.totalLifespan > 0 ? Math.round((1 / depletion.totalLifespan) * 1000) / 10 : 0,
    depletionModel: model.depletionCurve,
    seasonalEffect: getSeason(new Date().getMonth()),
    feedbackLearned: purchaseHistory.length > 0,
    velocity: depletion.velocity,
    mlPowered: false
  };
}

function normaliseHistoryEvents(purchaseHistory) {
  if (!Array.isArray(purchaseHistory)) return [];

  return purchaseHistory
    .map((entry, index) => {
      const type = String(entry?.type || entry?.signal || entry?.status || entry?.feedback || entry?.note || '').toLowerCase();
      let signal = null;
      if (type.includes('finished') && type.includes('early')) signal = 'finished_early';
      else if (type.includes('still') && type.includes('plenty')) signal = 'still_have_plenty';
      else if (type === 'finished_early' || type === 'still_have_plenty') signal = type;

      const timestamp = resolveEntryDate(entry, index);
      return signal ? { signal, timestamp } : null;
    })
    .filter(Boolean);
}

function resolveEntryDate(entry, fallbackIndex = 0) {
  const candidate = entry?.date || entry?.timestamp || entry?.createdAt || entry?.purchaseDate || entry?.updatedAt;
  const parsed = candidate ? new Date(candidate) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  return new Date(Date.now() - fallbackIndex * MS_PER_DAY);
}

function getMostRecentHistoryDate(purchaseHistory) {
  if (!Array.isArray(purchaseHistory) || purchaseHistory.length === 0) return null;
  let latest = null;
  for (let i = 0; i < purchaseHistory.length; i++) {
    const candidate = resolveEntryDate(purchaseHistory[i], i);
    if (!latest || candidate > latest) latest = candidate;
  }
  return latest;
}

function resolveBaseLifespan(productLifespan) {
  if (typeof productLifespan === 'number') return Math.max(0, productLifespan);
  if (!productLifespan || typeof productLifespan !== 'object') return 0;
  return Math.max(0, productLifespan.baseLifespanDays ?? productLifespan.lifespanDays ?? productLifespan.lifespan ?? 0);
}

function resolveCategory(productLifespan) {
  if (!productLifespan || typeof productLifespan !== 'object') return 'household';
  return String(productLifespan.category || 'household').toLowerCase();
}

function resolveSharingMode(productLifespan, category) {
  if (productLifespan && typeof productLifespan === 'object') {
    if (productLifespan.shared === true || productLifespan.isShared === true || productLifespan.personal === false) {
      return true;
    }
    if (productLifespan.shared === false || productLifespan.isShared === false || productLifespan.personal === true) {
      return false;
    }
  }

  if (PERSONAL_ITEM_CATEGORIES.has(category)) return false;
  if (SHARED_ITEM_CATEGORIES.has(category)) return true;
  return true;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addDays(baseDate, days) {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Apply depletion curve to remaining days.
 * Different products deplete at different rates over their lifetime.
 */
function applyCurve(rawRemaining, totalLifespan, elapsed, curveType) {
  if (rawRemaining <= 0) return 0;
  const progress = elapsed / totalLifespan; // 0 to 1

  switch (curveType) {
    case 'accelerating':
      // Depletes faster toward the end (snacks, food)
      // Remaining time compresses as you get further in
      return rawRemaining * (1 - progress * 0.3);

    case 'burst':
      // Used in bursts — remaining fluctuates but averages out
      // No curve adjustment, but add some noise-awareness
      return rawRemaining;

    case 'exponential_decay':
      // Heavy use at start, tapers off (medicine for acute illness)
      if (progress < 0.3) return rawRemaining * 0.8; // First 30% uses 50% of product
      return rawRemaining * 1.1; // Remainder lasts longer

    case 'linear':
    default:
      return rawRemaining;
  }
}

function getSeason(month) {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Bayesian-style adjustment from feedback.
 * Each "finished_early" shifts estimate down, "still_plenty" shifts up.
 * Uses exponential weighting so recent feedback matters more.
 */
function computeFeedbackAdjustment(feedbackHistory) {
  if (!feedbackHistory || feedbackHistory.length === 0) return 1.0;

  let adjustment = 1.0;
  const decayRate = 0.8; // More recent feedback has more weight

  // Process from oldest to newest
  const sorted = [...feedbackHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = 0; i < sorted.length; i++) {
    const weight = Math.pow(decayRate, sorted.length - 1 - i); // Newer = higher weight
    const fb = sorted[i];

    if (fb.type === 'finished_early') {
      adjustment *= (1 - 0.15 * weight); // Reduce lifespan estimate
    } else if (fb.type === 'still_plenty') {
      adjustment *= (1 + 0.15 * weight); // Increase lifespan estimate
    }
    // 'on_track' doesn't change anything
  }

  // Clamp to reasonable bounds
  return Math.max(0.4, Math.min(2.0, adjustment));
}

// ─── Smart Restock Scheduling ────────────────────────────────────────────────

/**
 * Given all tracked items, generate an optimal restock schedule.
 * Groups items by urgency window and suggests bundle orders for savings.
 * 
 * @param {Array} items - RestockItem documents with populated productId
 * @param {Number} monthlyBudget - User's monthly budget
 * @returns {Object} Schedule with immediate, thisWeek, nextWeek, and budgetAdvice
 */
function generateRestockSchedule(items, monthlyBudget = 150) {
  const now = new Date();
  const schedule = {
    immediate: [],   // 0-2 days
    thisWeek: [],    // 3-7 days
    nextWeek: [],    // 8-14 days
    later: [],       // 14+ days
    totalProjectedCost: 0,
    budgetStatus: 'ok',
    savingOpportunities: []
  };

  for (const item of items) {
    const product = item.productId;
    if (!product) continue;

    const entry = {
      itemId: item._id,
      productId: product._id,
      productName: product.name,
      price: product.price,
      category: item.category,
      daysRemaining: item.daysRemaining,
      urgency: item.urgency,
      confidence: item.confidence
    };

    if (item.daysRemaining <= 2) {
      schedule.immediate.push(entry);
    } else if (item.daysRemaining <= 7) {
      schedule.thisWeek.push(entry);
    } else if (item.daysRemaining <= 14) {
      schedule.nextWeek.push(entry);
    } else {
      schedule.later.push(entry);
    }
  }

  // Calculate projected cost
  const urgentCost = [...schedule.immediate, ...schedule.thisWeek].reduce((s, i) => s + i.price, 0);
  const totalCost = items.reduce((s, i) => s + (i.productId?.price || 0), 0);
  schedule.totalProjectedCost = Math.round(urgentCost * 100) / 100;

  // Budget analysis
  if (urgentCost > monthlyBudget * 0.7) {
    schedule.budgetStatus = 'tight';
  } else if (urgentCost > monthlyBudget) {
    schedule.budgetStatus = 'over';
  }

  // Saving opportunities: items in thisWeek that could be deferred
  schedule.savingOpportunities = schedule.thisWeek
    .filter(i => i.confidence < 0.85 && i.daysRemaining >= 5)
    .map(i => ({
      ...i,
      suggestion: `Consider waiting — ${Math.round((1 - i.confidence) * 100)}% chance you still have enough`
    }));

  return schedule;
}

// ─── Predictive Notifications ────────────────────────────────────────────────

/**
 * Determine which items need proactive notifications.
 * Considers: urgency threshold, user's typical reorder lead time, delivery ETA.
 */
function generateSmartNotifications(items, userProfile = {}) {
  const notifications = [];
  const typicalLeadTime = userProfile.avgDaysBetweenOrders || 3;

  for (const item of items) {
    const product = item.productId;
    if (!product) continue;

    const deliveryDays = Math.ceil((parseInt(product.deliveryETA) || 30) / (60 * 24)) || 1; // Convert to days (mostly < 1 day)
    const idealOrderDay = item.daysRemaining - deliveryDays;

    // Generate notification if approaching ideal order window
    if (item.daysRemaining <= 3) {
      notifications.push({
        type: 'restock',
        priority: 'high',
        title: `${product.name} running out!`,
        message: `Only ${item.daysRemaining} day${item.daysRemaining !== 1 ? 's' : ''} left. Order now for ${product.deliveryETA} delivery.`,
        productId: product._id,
        itemId: item._id,
        action: 'reorder',
        price: product.price
      });
    } else if (item.daysRemaining <= 7 && item.daysRemaining <= idealOrderDay + 2) {
      notifications.push({
        type: 'reminder',
        priority: 'medium',
        title: `Time to reorder ${product.name}`,
        message: `${item.daysRemaining} days remaining. Based on your usage pattern, order soon to avoid running out.`,
        productId: product._id,
        itemId: item._id,
        action: 'reorder',
        price: product.price
      });
    }

    // Sale prediction (if product has discount history implied by originalPrice)
    if (product.originalPrice && product.price < product.originalPrice && item.daysRemaining <= 10) {
      notifications.push({
        type: 'deal',
        priority: 'low',
        title: `${product.name} is on sale!`,
        message: `Save $${(product.originalPrice - product.price).toFixed(2)} — and you'll need it in ${item.daysRemaining} days.`,
        productId: product._id,
        itemId: item._id,
        action: 'buy_deal',
        savings: product.originalPrice - product.price
      });
    }
  }

  return notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });
}

module.exports = {
  calculateDepletion,
  calculateExponentialSmoothing,
  predictDepletion,
  generateRestockSchedule,
  generateSmartNotifications,
  CONSUMPTION_MODELS,
  computeFeedbackAdjustment,
  predictWithTimeSeries
};

/**
 * ML-enhanced prediction using exponential smoothing on purchase intervals.
 * Falls back to rule-based predictDepletion if no time-series data available.
 * 
 * @param {Object} product
 * @param {Array} purchaseIntervals - Array of days between past purchases
 * @param {Object} household
 * @param {Date} lastPurchaseDate
 * @param {Array} feedbackHistory
 * @returns {Object} Enhanced prediction with trend analysis
 */
function predictWithTimeSeries(product, purchaseIntervals = [], household = {}, lastPurchaseDate = new Date(), feedbackHistory = []) {
  // If we have enough historical data, use exponential smoothing
  if (purchaseIntervals.length >= 3 && mlModels) {
    const prediction = mlModels.predictRestockInterval(purchaseIntervals);

    const daysSincePurchase = Math.max(0, (Date.now() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, Math.round(prediction.prediction - daysSincePurchase));

    const expectedFinishDate = new Date();
    expectedFinishDate.setDate(expectedFinishDate.getDate() + daysRemaining);

    let urgency = 'safe';
    if (daysRemaining <= 2) urgency = 'danger';
    else if (daysRemaining <= 5) urgency = 'warning';

    return {
      expectedFinishDate,
      daysRemaining,
      totalLifespan: Math.round(prediction.prediction),
      confidence: prediction.confidence,
      urgency,
      dailyRate: prediction.prediction > 0 ? Math.round((100 / prediction.prediction) * 10) / 10 : 0,
      depletionModel: 'exponential_smoothing',
      trend: prediction.trend,
      trendValue: prediction.trendValue,
      feedbackLearned: feedbackHistory.length > 0,
      mlPowered: true
    };
  }

  // Fallback to rule-based prediction
  const basePrediction = predictDepletion(product, household, lastPurchaseDate, 1, feedbackHistory);
  return { ...basePrediction, mlPowered: false };
}
