/**
 * Intent Service - Mission Template & Intent Parsing
 * 
 * Provides backwards-compatible API while using the new NLP engine under the hood.
 * Also handles mission templates and substitution logic.
 */

const { deepParseIntent } = require('./nlpEngine');
const { scoreAndRankProducts, scoreSubstitutes } = require('./scoringEngine');

// ─── Mission Templates ───────────────────────────────────────────────────────

const MISSION_TEMPLATES = [
  { id: 'party', label: 'Party for 8', prompt: 'Party snacks and drinks for 8 people tonight', icon: 'party', category: 'snacks' },
  { id: 'travel', label: 'Travel tomorrow', prompt: 'Travel essentials for a 2-day trip tomorrow', icon: 'travel', category: 'travel' },
  { id: 'dinner', label: 'Dinner prep', prompt: 'Ingredients for quick dinner for 4 people', icon: 'dinner', category: 'groceries' },
  { id: 'baby', label: 'Baby care', prompt: 'Baby fever essentials and care products', icon: 'baby', category: 'baby' },
  { id: 'office', label: 'Office supplies', prompt: 'Office snacks and supplies for the week', icon: 'office', category: 'office' },
  { id: 'pharmacy', label: 'Pharmacy run', prompt: 'Common medicine and first aid essentials', icon: 'pharmacy', category: 'medicine' },
  { id: 'movie', label: 'Movie night', prompt: 'Movie night snacks for 4 people', icon: 'movie', category: 'snacks' },
  { id: 'cleaning', label: 'Deep clean', prompt: 'Cleaning supplies for deep house cleaning', icon: 'cleaning', category: 'cleaning' },
  { id: 'emergency', label: 'Emergency', prompt: 'Emergency household essentials needed now', icon: 'emergency', category: 'household' },
  { id: 'guests', label: 'Guests in 30 min', prompt: 'Quick essentials for guests arriving in 30 minutes', icon: 'guests', category: 'household' },
  { id: 'weekly', label: 'Weekly restock', prompt: 'Restock essentials running low this week', icon: 'restock', category: 'household' },
  { id: 'breakfast', label: 'Breakfast staples', prompt: 'Breakfast essentials like coffee, cereal, and milk', icon: 'breakfast', category: 'pantry' }
];

// ─── Intent Parsing (upgraded with NLP engine) ───────────────────────────────

/**
 * Parse natural language text into structured intent.
 * Backward-compatible output format + new enriched fields.
 */
function parseIntent(text) {
  const parsed = deepParseIntent(text);

  // Map to backward-compatible format
  return {
    parsedIntent: parsed.parsedIntent,
    category: parsed.primaryCategory,
    urgency: parsed.urgency,
    quantity: parsed.quantity?.value || null,
    confidence: parsed.confidence,
    occasion: parsed.parsedIntent,
    searchTags: parsed.searchKeywords,
    // New enriched fields
    categories: parsed.categories,
    budget: parsed.budget,
    brandHints: parsed.brandHints,
    substitutionTolerance: parsed.substitutionTolerance,
    temporal: parsed.temporal,
    quantityMultiplier: parsed.quantityMultiplier,
    boostedCategories: parsed.boostedCategories
  };
}

// ─── Product Ranking (uses new scoring engine) ───────────────────────────────

/**
 * Rank products against a parsed intent using multi-signal scoring.
 */
function rankProducts(products, parsed, userPrefs = {}) {
  // Convert parsed intent to format expected by scoring engine
  const scoringInput = {
    categories: parsed.categories || [parsed.category].filter(c => c && c !== 'general'),
    primaryCategory: parsed.category || 'general',
    boostedCategories: parsed.boostedCategories || [],
    searchKeywords: parsed.searchTags || [],
    urgency: parsed.urgency || 'medium',
    budget: parsed.budget || null,
    brandHints: parsed.brandHints || [],
    substitutionTolerance: parsed.substitutionTolerance || 'medium',
    temporal: parsed.temporal || { window: 'standard', hours: 48 },
    occasion: parsed.occasion || null,
    quantity: parsed.quantity ? { value: parsed.quantity, unit: 'people' } : null,
    quantityMultiplier: parsed.quantityMultiplier || 1,
    confidence: parsed.confidence || 0.7
  };

  const scored = scoreAndRankProducts(products, scoringInput, userPrefs);
  return scored.slice(0, 5);
}

// ─── Substitution Finding (uses new scoring engine) ──────────────────────────

/**
 * Find smart substitutes for a product.
 * Considers price similarity, brand equivalence, ratings, and availability.
 */
function findSubstitutes(product, allProducts, userPrefs = {}) {
  return scoreSubstitutes(product, allProducts, userPrefs);
}

module.exports = { MISSION_TEMPLATES, parseIntent, rankProducts, findSubstitutes };
