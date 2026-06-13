/**
 * Scoring Engine - ML-inspired Multi-Factor Product Ranking
 * 
 * Scores products using a weighted multi-signal approach:
 * 1. Relevance Score — keyword/category/tag match quality
 * 2. Stock & Availability Score — in-stock + delivery speed
 * 3. Price Fit Score — budget awareness + value detection
 * 4. Preference Score — brand affinity + past behavior
 * 5. Context Score — urgency, occasion, temporal fit
 * 6. Quality Score — ratings + review volume
 * 7. Substitution Viability — for out-of-stock fallbacks
 * 
 * Each signal produces a 0-100 sub-score, then a weighted combination creates the final rank.
 */

// ─── Scoring Weights (tunable — could be learned from feedback) ──────────────

const DEFAULT_WEIGHTS = {
  relevance: 0.30,
  availability: 0.20,
  priceFit: 0.15,
  preference: 0.15,
  context: 0.10,
  quality: 0.10
};

// Urgency-shifted weights: when urgency is high, delivery speed matters more
const URGENT_WEIGHTS = {
  relevance: 0.25,
  availability: 0.30,
  priceFit: 0.10,
  preference: 0.10,
  context: 0.15,
  quality: 0.10
};

// Budget-focused weights
const BUDGET_WEIGHTS = {
  relevance: 0.25,
  availability: 0.15,
  priceFit: 0.30,
  preference: 0.10,
  context: 0.10,
  quality: 0.10
};

// ─── ML Model Integration ────────────────────────────────────────────────────

let mlModels = null;
try {
  mlModels = require('./mlModels');
} catch { /* ML models not loaded yet — will use rule-based fallback */ }

// ─── Individual Signal Scorers ───────────────────────────────────────────────

function scoreRelevance(product, parsedIntent) {
  let score = 0;
  const productText = `${product.name} ${product.brand || ''} ${(product.tags || []).join(' ')} ${product.description || ''} ${product.category}`.toLowerCase();

  // === ML SIGNAL: TF-IDF similarity (real text relevance) ===
  if (mlModels && parsedIntent.searchKeywords?.length > 0) {
    const query = parsedIntent.searchKeywords.join(' ');
    const tfidfScore = mlModels.getTfIdfScore(query, product);
    score += Math.round(tfidfScore * 35); // Up to 35 points from TF-IDF
  }

  // Category match (strongest rule-based signal)
  if (parsedIntent.categories.includes(product.category)) {
    score += 30;
    if (parsedIntent.primaryCategory === product.category) score += 10;
  }

  // Boosted categories from occasion
  if (parsedIntent.boostedCategories.includes(product.category)) score += 12;

  // Search keyword matching (fallback rule-based TF)
  const keywords = parsedIntent.searchKeywords || [];
  let keywordHits = 0;
  for (const kw of keywords) {
    if (productText.includes(kw)) {
      keywordHits++;
      if (product.name.toLowerCase().includes(kw)) score += 6;
      else score += 3;
    }
  }

  // Keyword coverage ratio
  if (keywords.length > 0) {
    const coverage = keywordHits / keywords.length;
    score += Math.round(coverage * 15);
  }

  // === ML SIGNAL: Thompson Sampling exploration bonus ===
  if (mlModels) {
    const banditScore = mlModels.getBanditScore(product._id);
    score += Math.round(banditScore * 8); // Small exploration bonus
  }

  return Math.min(100, score);
}

function scoreAvailability(product, parsedIntent) {
  let score = 0;

  // Stock level
  if (product.stock <= 0) return 0; // Immediately disqualify out-of-stock
  if (product.stock >= 50) score += 30;
  else if (product.stock >= 10) score += 20;
  else score += 10; // Low stock

  // Delivery speed
  const etaMinutes = parseInt(product.deliveryETA) || 60;
  if (etaMinutes <= 10) score += 40;
  else if (etaMinutes <= 15) score += 35;
  else if (etaMinutes <= 20) score += 30;
  else if (etaMinutes <= 30) score += 20;
  else if (etaMinutes <= 45) score += 10;

  // Prime bonus
  if (product.isPrime) score += 15;

  // Temporal fit: if user needs it NOW, fastest delivery gets extra boost
  if (parsedIntent.temporal?.window === 'immediate' && etaMinutes <= 15) score += 15;

  return Math.min(100, score);
}

function scorePriceFit(product, parsedIntent, userPrefs) {
  let score = 50; // Neutral start

  const budget = parsedIntent.budget;
  const userBudget = userPrefs?.budget;

  // Hard budget from query
  if (budget?.max) {
    if (product.price <= budget.max) score += 30;
    else if (product.price <= budget.max * 1.2) score += 10; // Slight overage
    else score -= 20; // Over budget
  }

  if (budget?.min && product.price < budget.min) score -= 10; // Under range might mean low quality

  // Budget preference
  if (budget?.preference === 'budget') {
    // Cheaper is better
    score += Math.max(0, 30 - Math.round(product.price * 2));
  } else if (budget?.preference === 'premium') {
    // More expensive might be better
    score += Math.min(30, Math.round(product.price * 1.5));
  }

  // User's saved budget
  if (userBudget && product.price <= userBudget / 5) score += 10; // Fits well within budget

  // Discount detection (great deals score higher)
  if (product.originalPrice && product.price < product.originalPrice) {
    const discount = (product.originalPrice - product.price) / product.originalPrice;
    score += Math.round(discount * 40); // Up to 40 points for big discounts
  }

  return Math.max(0, Math.min(100, score));
}

function scorePreference(product, parsedIntent, userPrefs, purchaseHistory) {
  let score = 30; // Neutral

  // Brand affinity
  if (parsedIntent.brandHints?.includes(product.brand?.toLowerCase())) score += 35;
  if (userPrefs?.savedBrands?.includes(product.brand)) score += 25;

  // Purchase history signal (if user bought this category before)
  if (purchaseHistory?.categories?.includes(product.category)) score += 15;
  if (purchaseHistory?.brands?.includes(product.brand)) score += 10;
  if (purchaseHistory?.productIds?.includes(product._id?.toString())) score += 20; // Re-purchase signal

  // Dietary/allergy check (negative signal)
  if (userPrefs?.allergies?.length > 0) {
    const productText = `${product.name} ${product.description || ''} ${(product.tags || []).join(' ')}`.toLowerCase();
    if (userPrefs.allergies.some(a => productText.includes(a.toLowerCase()))) {
      score -= 50; // Strong penalty
    }
  }

  return Math.max(0, Math.min(100, score));
}

function scoreContext(product, parsedIntent) {
  let score = 40; // Base

  // Urgency × delivery speed synergy
  if (parsedIntent.urgency === 'high') {
    const eta = parseInt(product.deliveryETA) || 60;
    if (eta <= 15) score += 30;
    else if (eta <= 25) score += 15;
  }

  // Occasion fit — products that match the occasion archetype
  if (parsedIntent.occasion) {
    const occasionProducts = {
      party: ['chips', 'soda', 'popcorn', 'cookies', 'paper', 'cups'],
      movie_night: ['popcorn', 'chips', 'soda', 'candy', 'snacks'],
      travel: ['toiletry', 'travel', 'mini', 'portable'],
      dinner: ['pasta', 'sauce', 'vegetables', 'oil', 'spice'],
      emergency: ['medicine', 'thermometer', 'band', 'fever'],
      baby_care: ['diaper', 'wipe', 'formula', 'baby'],
      cleaning_day: ['spray', 'wipe', 'mop', 'disinfect', 'bag']
    };
    const relevantTerms = occasionProducts[parsedIntent.occasion] || [];
    const productText = `${product.name} ${(product.tags || []).join(' ')}`.toLowerCase();
    if (relevantTerms.some(t => productText.includes(t))) score += 25;
  }

  // Quantity consideration — bulk/multi-packs when serving multiple people
  if (parsedIntent.quantity?.value > 3) {
    if (product.name.toLowerCase().includes('pack') || product.name.toLowerCase().includes('count')) {
      score += 15;
    }
  }

  return Math.min(100, score);
}

function scoreQuality(product) {
  let score = 0;

  // Rating (out of 5)
  score += Math.round((product.rating || 4) * 12); // Max 60 from rating

  // Review volume (social proof)
  const reviews = product.reviewCount || 0;
  if (reviews >= 10000) score += 25;
  else if (reviews >= 5000) score += 20;
  else if (reviews >= 1000) score += 15;
  else if (reviews >= 100) score += 10;
  else score += 5;

  // Prime badge as quality indicator
  if (product.isPrime) score += 10;

  return Math.min(100, score);
}

// ─── Main Scoring Function ───────────────────────────────────────────────────

/**
 * Score and rank products against a parsed intent.
 * 
 * @param {Array} products - Product documents from DB
 * @param {Object} parsedIntent - Output from nlpEngine.deepParseIntent()
 * @param {Object} userPrefs - User preferences from profile
 * @param {Object} purchaseHistory - Derived from order history
 * @param {Object} feedbackSignals - From FeedbackEvent collection
 * @returns {Array} Scored and ranked products with explanations
 */
function scoreAndRankProducts(products, parsedIntent, userPrefs = {}, purchaseHistory = {}, feedbackSignals = {}) {
  // Select weight profile based on context
  let weights = DEFAULT_WEIGHTS;
  if (parsedIntent.urgency === 'high') weights = URGENT_WEIGHTS;
  else if (parsedIntent.budget?.preference === 'budget' || parsedIntent.budget?.max) weights = BUDGET_WEIGHTS;

  // Apply feedback-learned weight adjustments
  if (feedbackSignals.weightAdjustments) {
    weights = { ...weights, ...feedbackSignals.weightAdjustments };
  }

  const scored = products
    .filter(p => p.stock > 0) // Filter out of stock
    .map(product => {
      const signals = {
        relevance: scoreRelevance(product, parsedIntent),
        availability: scoreAvailability(product, parsedIntent),
        priceFit: scorePriceFit(product, parsedIntent, userPrefs),
        preference: scorePreference(product, parsedIntent, userPrefs, purchaseHistory),
        context: scoreContext(product, parsedIntent),
        quality: scoreQuality(product)
      };

      // Weighted combination
      const finalScore = Object.entries(weights).reduce((sum, [key, weight]) => {
        return sum + (signals[key] || 0) * weight;
      }, 0);

      // Generate rank explanation
      const topSignal = Object.entries(signals).sort((a, b) => b[1] - a[1])[0];
      const rankReason = generateRankReason(signals, parsedIntent, product);

      return {
        ...product.toObject ? product.toObject() : product,
        _aiScore: Math.round(finalScore * 10) / 10,
        _signals: signals,
        rankReason
      };
    })
    .sort((a, b) => b._aiScore - a._aiScore);

  return scored;
}

function generateRankReason(signals, parsedIntent, product) {
  // Pick the dominant reason for this product's ranking
  if (parsedIntent.urgency === 'high' && signals.availability >= 70) {
    const eta = parseInt(product.deliveryETA) || 60;
    if (eta <= 15) return '⚡ Fastest delivery';
  }
  if (signals.relevance >= 70) return '🎯 Best match';
  if (signals.preference >= 70) return '❤️ Your brand';
  if (signals.quality >= 75) return '⭐ Top rated';
  if (signals.priceFit >= 70 && product.originalPrice) return '💰 Great deal';
  if (signals.availability >= 70 && product.isPrime) return '✓ Prime';
  if (signals.context >= 60) return '🎪 Occasion fit';
  return '✓ Recommended';
}

// ─── Substitution Scoring ────────────────────────────────────────────────────

/**
 * Find and score substitutes for a product.
 * Considers: same category, similar price, brand equivalence, rating.
 */
function scoreSubstitutes(product, allProducts, userPrefs = {}) {
  return allProducts
    .filter(p => {
      if (p._id.toString() === product._id.toString()) return false;
      if (p.stock <= 0) return false;
      if (p.category !== product.category) return false;
      return true;
    })
    .map(p => {
      let score = 50;

      // Price similarity (closer = better)
      const priceDiff = Math.abs(p.price - product.price);
      const priceRatio = priceDiff / product.price;
      score += Math.max(0, 30 - Math.round(priceRatio * 50));

      // Rating comparison
      if (p.rating >= product.rating) score += 15;
      else if (p.rating >= product.rating - 0.3) score += 8;

      // Brand preference
      if (userPrefs?.savedBrands?.includes(p.brand)) score += 15;

      // Same tags overlap
      const commonTags = (p.tags || []).filter(t => (product.tags || []).includes(t));
      score += commonTags.length * 5;

      // Faster delivery
      const origEta = parseInt(product.deliveryETA) || 60;
      const subEta = parseInt(p.deliveryETA) || 60;
      if (subEta < origEta) score += 10;

      return {
        ...p.toObject ? p.toObject() : p,
        substitutionScore: score,
        priceDifference: p.price - product.price,
        reason: generateSubstitutionReason(p, product)
      };
    })
    .sort((a, b) => b.substitutionScore - a.substitutionScore)
    .slice(0, 3);
}

function generateSubstitutionReason(substitute, original) {
  if (substitute.price < original.price) return `Save $${(original.price - substitute.price).toFixed(2)}`;
  if (substitute.rating > original.rating) return 'Higher rated alternative';
  if (parseInt(substitute.deliveryETA) < parseInt(original.deliveryETA)) return 'Faster delivery';
  return 'Similar product';
}

module.exports = {
  scoreAndRankProducts,
  scoreSubstitutes,
  DEFAULT_WEIGHTS,
  URGENT_WEIGHTS,
  BUDGET_WEIGHTS
};
