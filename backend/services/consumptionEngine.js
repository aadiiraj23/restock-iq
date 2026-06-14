/**
 * Consumption Engine — Deterministic Multi-Level Fallback Prediction
 * 
 * Level 1: Hardcoded category baselines × household size
 * Level 2: XGBoost-style regression mock with feature weighting
 * Level 3: Self-learning feedback loop (adjusts consumptionRateModifier)
 */

// ─── Level 1: Hardcoded Category × Household Baselines ───────────────────────

const CATEGORY_BASELINES = {
  face_wash: { '200ml': { 1: 60, 2: 30, 3: 25, 4: 20 }, default_volume: '200ml' },
  shampoo: { '400ml': { 1: 45, 2: 22, 3: 18, 4: 15 }, '200ml': { 1: 25, 2: 12, 3: 10, 4: 8 }, default_volume: '400ml' },
  toothpaste: { '150g': { 1: 30, 2: 15, 3: 12, 4: 10 }, '100g': { 1: 20, 2: 10, 3: 8, 4: 7 }, default_volume: '150g' },
  dish_soap: { '500ml': { 1: 30, 2: 20, 3: 15, 4: 12 }, default_volume: '500ml' },
  body_lotion: { '400ml': { 1: 60, 2: 35, 3: 28, 4: 22 }, default_volume: '400ml' },
  protein_powder: { '1kg': { 1: 30, 2: 15, 3: 12, 4: 10 }, default_volume: '1kg' },
  detergent: { '1L': { 1: 30, 2: 18, 3: 14, 4: 10 }, default_volume: '1L' },
  hand_wash: { '250ml': { 1: 30, 2: 15, 3: 12, 4: 10 }, default_volume: '250ml' },
  cleaning_spray: { '500ml': { 1: 45, 2: 30, 3: 22, 4: 18 }, default_volume: '500ml' },
  deodorant: { '150ml': { 1: 45, 2: 22, 3: 18, 4: 15 }, default_volume: '150ml' },
  sunscreen: { '100ml': { 1: 30, 2: 18, 3: 14, 4: 10 }, default_volume: '100ml' },
  conditioner: { '400ml': { 1: 50, 2: 25, 3: 20, 4: 16 }, default_volume: '400ml' },
  mouthwash: { '500ml': { 1: 30, 2: 18, 3: 14, 4: 12 }, default_volume: '500ml' },
  tissue_paper: { '100sheets': { 1: 14, 2: 7, 3: 5, 4: 4 }, default_volume: '100sheets' },
  coffee: { '250g': { 1: 21, 2: 14, 3: 10, 4: 7 }, default_volume: '250g' },
  milk: { '1L': { 1: 5, 2: 3, 3: 2, 4: 2 }, default_volume: '1L' },
  eggs: { '12pk': { 1: 10, 2: 5, 3: 4, 4: 3 }, default_volume: '12pk' },
  bread: { '1loaf': { 1: 5, 2: 3, 3: 2, 4: 2 }, default_volume: '1loaf' },
  rice: { '5kg': { 1: 30, 2: 18, 3: 14, 4: 10 }, default_volume: '5kg' },
  cooking_oil: { '1L': { 1: 30, 2: 20, 3: 15, 4: 12 }, default_volume: '1L' },
  // Fallback for unknown categories
  default: { default: { 1: 30, 2: 20, 3: 15, 4: 12 }, default_volume: 'default' }
};

// ─── Seasonal Adjustment Factors ─────────────────────────────────────────────

const SEASON_FACTORS = {
  sunscreen: { summer: 0.5, winter: 2.0, spring: 0.8, fall: 1.2 },
  body_lotion: { summer: 1.5, winter: 0.7, spring: 1.0, fall: 0.8 },
  cleaning_spray: { spring: 0.7, summer: 1.0, fall: 1.0, winter: 1.2 },
  deodorant: { summer: 0.7, winter: 1.3, spring: 0.9, fall: 1.0 },
  coffee: { winter: 0.7, summer: 1.3, spring: 1.0, fall: 0.8 },
};

function getSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

// ─── Level 1: Baseline Prediction ────────────────────────────────────────────

function getBaselineDays(category, volume, householdSize) {
  const normalizedCategory = (category || 'default').toLowerCase().replace(/\s+/g, '_');
  const catData = CATEGORY_BASELINES[normalizedCategory] || CATEGORY_BASELINES.default;
  const volKey = volume || catData.default_volume || 'default';
  const sizeMap = catData[volKey] || catData[Object.keys(catData).find(k => k !== 'default_volume')] || { 1: 30, 2: 20, 3: 15, 4: 12 };

  const clampedSize = Math.min(4, Math.max(1, householdSize || 1));
  return sizeMap[clampedSize] || sizeMap[1] || 30;
}

// ─── Level 2: XGBoost-style Feature-Weighted Regression ──────────────────────

function predictWithRegression(features) {
  const {
    category,
    volume,
    householdSize = 1,
    ageTier = 'adult',
    pastIntervals = [],
    currentMonth = new Date().getMonth(),
    brandTier = 'standard'
  } = features;

  // Start with baseline
  let prediction = getBaselineDays(category, volume, householdSize);

  // Feature weights (simulating learned XGBoost coefficients)
  const weights = {
    household_size: -0.12,      // More people = faster consumption
    age_tier: { child: -0.15, teen: -0.05, adult: 0, senior: 0.1 },
    brand_tier: { budget: -0.1, standard: 0, premium: 0.15 },
    season: 1.0,
    historical_mean: 0.6,       // Weight given to past intervals
    baseline_weight: 0.4        // Weight given to category baseline
  };

  // Age adjustment
  prediction *= (1 + (weights.age_tier[ageTier] || 0));

  // Brand tier adjustment (premium products may last longer due to concentration)
  prediction *= (1 + (weights.brand_tier[brandTier] || 0));

  // Seasonal adjustment
  const season = getSeason();
  const seasonFactor = SEASON_FACTORS[category]?.[season] || 1.0;
  prediction *= seasonFactor;

  // Historical interval learning (if we have past reorder data)
  if (pastIntervals.length >= 2) {
    // Exponential weighted moving average of past intervals
    let ewma = pastIntervals[0];
    const alpha = 0.4;
    for (let i = 1; i < pastIntervals.length; i++) {
      ewma = alpha * pastIntervals[i] + (1 - alpha) * ewma;
    }
    // Blend historical with baseline
    prediction = weights.historical_mean * ewma + weights.baseline_weight * prediction;
  }

  // Month-specific micro-adjustments (holidays increase consumption)
  if (currentMonth === 11 || currentMonth === 0) prediction *= 0.85; // Holiday season
  if (currentMonth === 6) prediction *= 0.9; // Prime Day / summer sales

  return Math.max(1, Math.round(prediction));
}

// ─── Full Prediction Pipeline ────────────────────────────────────────────────

function predictConsumption(product, household = {}, consumptionRateModifier = 1.0, purchaseDate = new Date()) {
  const category = normalizeCategory(product.category || product.name);
  const volume = product.size || product.volume || null;
  const householdSize = Math.max(1, parseInt(household.size || household.household_size || 1, 10));

  // Level 2 regression
  const baseDays = predictWithRegression({
    category,
    volume,
    householdSize,
    ageTier: household.ageTier || 'adult',
    pastIntervals: product.pastIntervals || [],
    brandTier: product.brandTier || (product.price > 15 ? 'premium' : product.price > 8 ? 'standard' : 'budget')
  });

  // Apply user's learned consumption rate modifier
  const adjustedDays = Math.max(1, Math.round(baseDays * consumptionRateModifier));

  // Calculate predicted expiry
  const purchaseTimestamp = new Date(purchaseDate).getTime();
  const predictedExpiryDate = new Date(purchaseTimestamp + adjustedDays * 24 * 60 * 60 * 1000);

  // Calculate remaining days from now
  const now = Date.now();
  const remainingDays = Math.max(0, Math.round((predictedExpiryDate.getTime() - now) / (24 * 60 * 60 * 1000)));

  // Determine urgency status
  let status = 'safe';
  let urgencyTier = 'SAFE';
  if (remainingDays < 5) { status = 'critical'; urgencyTier = 'CRITICAL'; }
  else if (remainingDays <= 14) { status = 'warning'; urgencyTier = 'WARNING'; }

  // Calculate depletion percentage
  const elapsed = Math.max(0, (now - purchaseTimestamp) / (24 * 60 * 60 * 1000));
  const depletionPercent = Math.min(100, Math.max(0, (elapsed / adjustedDays) * 100));

  // Confidence score
  const hasHistory = (product.pastIntervals || []).length >= 2;
  const confidence = hasHistory ? Math.min(0.95, 0.75 + (product.pastIntervals.length * 0.03)) : 0.7;

  return {
    predictedExpiryDate,
    remainingDays,
    totalLifespan: adjustedDays,
    depletionPercent: Math.round(depletionPercent * 10) / 10,
    status,
    urgencyTier,
    confidence: Math.round(confidence * 100) / 100,
    baseDays,
    consumptionRateModifier,
    seasonalFactor: SEASON_FACTORS[category]?.[getSeason()] || 1.0,
    method: hasHistory ? 'regression+history' : 'regression+baseline'
  };
}

// ─── Feedback Learning: Adjust Consumption Rate ──────────────────────────────

function computeNewModifier(currentModifier, feedbackType) {
  const ADJUSTMENT = 0.15;

  switch (feedbackType) {
    case 'finished_early':
      // Product ran out faster than predicted → decrease modifier (shorten prediction)
      return Math.max(0.3, currentModifier * (1 - ADJUSTMENT));
    case 'still_plenty':
      // Product lasted longer → increase modifier (lengthen prediction)
      return Math.min(2.5, currentModifier * (1 + ADJUSTMENT));
    case 'on_time':
      // Prediction was accurate → no change, boost confidence
      return currentModifier;
    default:
      return currentModifier;
  }
}

function recalculateAllItems(items, newHouseholdSize) {
  return items.map(item => {
    const category = normalizeCategory(item.category || item.productName);
    const baseDays = getBaselineDays(category, item.volume, newHouseholdSize);
    const adjustedDays = Math.max(1, Math.round(baseDays * (item.consumptionRateModifier || 1.0)));
    const purchaseTimestamp = new Date(item.purchaseDate || item.createdAt).getTime();
    const predictedExpiryDate = new Date(purchaseTimestamp + adjustedDays * 24 * 60 * 60 * 1000);
    const remainingDays = Math.max(0, Math.round((predictedExpiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

    return {
      ...item,
      remainingDays,
      predictedExpiryDate,
      totalLifespan: adjustedDays
    };
  });
}

// ─── Category Normalization ──────────────────────────────────────────────────

function normalizeCategory(input) {
  if (!input) return 'default';
  const lower = input.toLowerCase().replace(/[^a-z0-9_\s]/g, '').trim();

  const categoryMap = {
    'face wash': 'face_wash', 'facial cleanser': 'face_wash', 'cleanser': 'face_wash',
    'shampoo': 'shampoo', 'hair wash': 'shampoo',
    'toothpaste': 'toothpaste', 'dental': 'toothpaste',
    'dish soap': 'dish_soap', 'dishwash': 'dish_soap', 'dish wash': 'dish_soap',
    'body lotion': 'body_lotion', 'moisturizer': 'body_lotion', 'lotion': 'body_lotion',
    'protein powder': 'protein_powder', 'protein': 'protein_powder', 'whey': 'protein_powder',
    'detergent': 'detergent', 'laundry': 'detergent',
    'hand wash': 'hand_wash', 'hand soap': 'hand_wash',
    'cleaning': 'cleaning_spray', 'cleaner': 'cleaning_spray', 'spray': 'cleaning_spray',
    'deodorant': 'deodorant', 'deo': 'deodorant',
    'sunscreen': 'sunscreen', 'spf': 'sunscreen',
    'conditioner': 'conditioner',
    'mouthwash': 'mouthwash',
    'tissue': 'tissue_paper', 'tissues': 'tissue_paper',
    'coffee': 'coffee',
    'milk': 'milk',
    'eggs': 'eggs', 'egg': 'eggs',
    'bread': 'bread',
    'rice': 'rice',
    'oil': 'cooking_oil', 'cooking oil': 'cooking_oil',
  };

  for (const [key, value] of Object.entries(categoryMap)) {
    if (lower.includes(key)) return value;
  }

  return lower.replace(/\s+/g, '_');
}

// ─── Seed Data Generator ─────────────────────────────────────────────────────

function generateSeedItems(householdSize = 1) {
  const now = new Date();

  return [
    {
      productName: 'Cetaphil Gentle Skin Cleanser (200ml)',
      category: 'face_wash',
      brand: 'Cetaphil',
      volume: '200ml',
      image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop',
      purchaseDate: new Date(now.getTime() - 51 * 24 * 60 * 60 * 1000), // 51 days ago for 1 person = 9 days left
      price: 8.99,
      consumptionRateModifier: 1.0,
      householdSize,
      // Expected: ~9 days remaining (yellow/warning)
    },
    {
      productName: 'Colgate Total Toothpaste (150g)',
      category: 'toothpaste',
      brand: 'Colgate',
      volume: '150g',
      image: 'https://images.unsplash.com/photo-1622372738946-62e02505fe3f?w=200&h=200&fit=crop',
      purchaseDate: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000), // 27 days ago for 1 person = 3 days left
      price: 4.99,
      consumptionRateModifier: 1.0,
      householdSize,
      // Expected: ~3 days remaining (red/critical)
    },
    {
      productName: 'Head & Shoulders Shampoo (400ml)',
      category: 'shampoo',
      brand: 'Head & Shoulders',
      volume: '400ml',
      image: 'https://images.unsplash.com/photo-1535585209827-a93fcddd4c02?w=200&h=200&fit=crop',
      purchaseDate: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000), // 17 days ago for 1 person = 28 days left
      price: 6.97,
      consumptionRateModifier: 1.0,
      householdSize,
      // Expected: ~28 days remaining (green/safe)
    },
    {
      productName: 'Dawn Ultra Dish Soap (500ml)',
      category: 'dish_soap',
      brand: 'Dawn',
      volume: '500ml',
      image: 'https://images.unsplash.com/photo-1563453392219-991e9b4b2b0a?w=200&h=200&fit=crop',
      purchaseDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      price: 3.97,
      consumptionRateModifier: 1.0,
      householdSize,
      // Expected: ~10 days remaining (warning)
    },
    {
      productName: 'Nivea Body Lotion (400ml)',
      category: 'body_lotion',
      brand: 'Nivea',
      volume: '400ml',
      image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=200&h=200&fit=crop',
      purchaseDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      price: 7.49,
      consumptionRateModifier: 1.0,
      householdSize,
      // Expected: ~25 days remaining (safe)
    },
    {
      productName: 'Optimum Nutrition Whey Protein (1kg)',
      category: 'protein_powder',
      brand: 'Optimum Nutrition',
      volume: '1kg',
      image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200&h=200&fit=crop',
      purchaseDate: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000),
      price: 34.99,
      consumptionRateModifier: 1.0,
      householdSize,
      // Expected: ~6 days remaining (warning)
    },
  ];
}

module.exports = {
  predictConsumption,
  getBaselineDays,
  predictWithRegression,
  computeNewModifier,
  recalculateAllItems,
  normalizeCategory,
  generateSeedItems,
  CATEGORY_BASELINES,
  SEASON_FACTORS,
  getSeason
};
