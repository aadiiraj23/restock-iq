/**
 * AI Service - Intelligent Shopping Agent Pipeline
 * 
 * Flow: User Prompt → NLP Deep Parse → Product DB Context → Multi-Signal Scoring → 
 *       Feedback-Adjusted Ranking → Valid Product IDs → Substitutions → Response
 * 
 * This is the orchestration layer that ties together:
 * - nlpEngine.js (natural language understanding)
 * - scoringEngine.js (ML-inspired multi-factor ranking)
 * - feedbackLearner.js (personalization from history)
 * - restockPredictor.js (consumption prediction)
 */

const { deepParseIntent, CATEGORY_TAXONOMY, OCCASION_RULES } = require('./nlpEngine');
const { scoreAndRankProducts, scoreSubstitutes } = require('./scoringEngine');
const { buildPurchaseProfile, getWeightAdjustments, getCooccurringProducts, refreshLearningCache } = require('./feedbackLearner');

let mlModels;
try {
  mlModels = require('./mlModels');
} catch { mlModels = { classifyIntent: () => [], getCollabRecommendations: () => [], recordBanditReward: () => {}, getModelStatus: () => ({}) }; }

// ─── Backward-compatible exports (for existing routes) ───────────────────────

const CATEGORY_KEYWORDS = Object.fromEntries(
  Object.entries(CATEGORY_TAXONOMY).map(([cat, tax]) => [cat, [...tax.primary, ...tax.synonyms]])
);

const OCCASION_PATTERNS = Object.fromEntries(
  Object.entries(OCCASION_RULES).map(([name, rule]) => [name, {
    keywords: rule.triggers,
    boost: rule.boostCategories,
    quantity_mult: rule.quantityMultiplier
  }])
);

// ─── Main AI Processing Pipeline ─────────────────────────────────────────────

/**
 * Process a user prompt against the product database.
 * This is the full AI pipeline: NLP → Score → Rank → Explain
 * 
 * @param {string} prompt - User's natural language query
 * @param {Array} products - All in-stock products from database
 * @param {Object} userPrefs - User preferences from profile
 * @param {string|null} userId - For personalization/feedback lookup
 * @returns {Object} AI analysis result with ranked product IDs and reasoning
 */
async function processPromptWithAI(prompt, products, userPrefs = {}, userId = null) {
  // Step 1: Deep NLP parsing — extract all intent slots
  const parsed = deepParseIntent(prompt);

  // Step 1b: ML ENHANCEMENT — Naive Bayes intent classification as validation
  const mlPredictions = mlModels.classifyIntent(prompt);
  if (mlPredictions.length > 0 && mlPredictions[0].probability > 0.4) {
    const mlCategory = mlPredictions[0].label;
    // If ML classifier found a strong category not in rule-based results, add it
    if (!parsed.categories.includes(mlCategory) && mlPredictions[0].probability > 0.6) {
      parsed.categories.push(mlCategory);
    }
    // Boost confidence if ML agrees with rule-based
    if (parsed.categories.includes(mlCategory)) {
      parsed.confidence = Math.min(0.98, parsed.confidence + 0.08);
    }
  }

  // Step 2: Build purchase profile for personalization
  const purchaseHistory = await buildPurchaseProfile(userId);

  // Step 3: Get feedback-learned weight adjustments
  const weightAdjustments = await getWeightAdjustments(userId);
  const feedbackSignals = { weightAdjustments };

  // Step 4: Refresh learning cache (non-blocking)
  refreshLearningCache().catch(() => {}); // Fire and forget

  // Step 5: Pre-filter products for efficiency
  const candidates = preFilterProducts(products, parsed);

  // Step 6: Score all candidates with multi-signal engine (includes ML TF-IDF + bandit)
  const scored = scoreAndRankProducts(candidates, parsed, userPrefs, purchaseHistory, feedbackSignals);

  // Step 7: Select top results (adaptive count based on confidence)
  const topCount = parsed.confidence >= 0.8 ? 5 : (parsed.confidence >= 0.6 ? 7 : 10);
  const topProducts = scored.slice(0, topCount);

  // Step 8: ML ENHANCEMENT — Collaborative filtering for "you might also need"
  let alsoNeeded = [];
  if (topProducts.length > 0) {
    try {
      // First try ML collaborative filter
      const mlRecs = mlModels.getCollabRecommendations(topProducts.map(p => p._id));
      if (mlRecs.length > 0) {
        alsoNeeded = mlRecs;
      } else if (userId) {
        // Fallback to simple co-occurrence
        alsoNeeded = await getCooccurringProducts(topProducts.map(p => p._id));
      }
    } catch {
      alsoNeeded = [];
    }
  }

  // Step 9: Record bandit impressions for explore/exploit learning
  for (const p of topProducts) {
    mlModels.recordBanditReward(p._id, 0.1); // Small reward for being shown
  }

  // Step 10: Generate comprehensive reasoning
  const reasoning = generateDetailedReasoning(parsed, topProducts, scored.length, mlPredictions);

  return {
    products: topProducts,
    productIds: topProducts.map(p => p._id),
    analysis: {
      intent: parsed.parsedIntent,
      categories: parsed.categories,
      urgency: parsed.urgency,
      quantity: parsed.quantity?.value || (parsed.quantityMultiplier > 1 ? parsed.quantityMultiplier : 1),
      confidence: parsed.confidence,
      occasion: parsed.occasion,
      budget: parsed.budget,
      brandHints: parsed.brandHints,
      substitutionTolerance: parsed.substitutionTolerance,
      temporal: parsed.temporal,
      reasoning,
      alsoNeeded: alsoNeeded.slice(0, 3),
      mlClassification: mlPredictions.slice(0, 3) // Expose ML predictions
    },
    parsedSlots: parsed
  };
}

/**
 * Pre-filter products to reduce scoring workload.
 * Only eliminates clearly irrelevant products.
 */
function preFilterProducts(products, parsed) {
  // If we have strong category signals, prioritize those but don't exclude others entirely
  if (parsed.categories.length > 0) {
    const primary = products.filter(p => parsed.categories.includes(p.category));
    const secondary = products.filter(p => !parsed.categories.includes(p.category));

    // If primary has enough results, use just those
    if (primary.length >= 10) return primary;

    // Otherwise include boosted categories too
    const boosted = secondary.filter(p => parsed.boostedCategories.includes(p.category));
    const combined = [...primary, ...boosted];
    if (combined.length >= 5) return combined;

    // Still not enough? Use all products (scoring will handle relevance)
    return products;
  }

  // No category signal — search by keywords in product text
  if (parsed.searchKeywords.length > 0) {
    const keywordFiltered = products.filter(p => {
      const text = `${p.name} ${p.brand || ''} ${(p.tags || []).join(' ')} ${p.description || ''} ${p.category}`.toLowerCase();
      return parsed.searchKeywords.some(kw => text.includes(kw));
    });
    if (keywordFiltered.length >= 3) return keywordFiltered;
  }

  return products; // Fallback: score everything
}

function generateDetailedReasoning(parsed, results, totalScored, mlPredictions = []) {
  const parts = [];

  // What we understood
  if (parsed.occasion) parts.push(`Detected "${parsed.occasion}" shopping mission.`);
  if (parsed.categories.length > 0) parts.push(`Categories: ${parsed.categories.join(', ')}.`);
  if (parsed.urgency === 'high') parts.push('High urgency — prioritized fastest delivery.');
  if (parsed.budget) {
    if (parsed.budget.max) parts.push(`Budget: under $${parsed.budget.max}.`);
    else if (parsed.budget.preference) parts.push(`Price preference: ${parsed.budget.preference}.`);
  }
  if (parsed.brandHints.length > 0) parts.push(`Brand preference: ${parsed.brandHints.join(', ')}.`);
  if (parsed.quantity) parts.push(`Serving ${parsed.quantity.value} ${parsed.quantity.unit}.`);
  if (parsed.substitutionTolerance === 'none') parts.push('No substitutes — exact match only.');
  if (parsed.temporal?.window === 'immediate') parts.push('Needed immediately.');

  // ML classification confidence
  if (mlPredictions.length > 0 && mlPredictions[0].probability > 0.7) {
    parts.push(`ML classifier: ${Math.round(mlPredictions[0].probability * 100)}% ${mlPredictions[0].label}.`);
  }

  // Results summary
  if (results.length > 0) {
    parts.push(`Found ${results.length} matches from ${totalScored} scored products.`);
    const topScore = results[0]._aiScore;
    if (topScore >= 70) parts.push('High-confidence matches.');
    else if (topScore >= 50) parts.push('Good matches found.');
  } else {
    parts.push('No strong matches — showing best available options.');
  }

  return parts.join(' ');
}

// ─── Quick Suggest (Autocomplete) ────────────────────────────────────────────

/**
 * Generate autocomplete suggestions from partial input.
 * Uses prefix matching + category expansion.
 */
function generateSuggestions(partial, products) {
  const lower = partial.toLowerCase();
  const suggestions = [];

  // Direct product name matches
  const nameMatches = products.filter(p =>
    p.name.toLowerCase().includes(lower) || (p.brand && p.brand.toLowerCase().includes(lower))
  ).slice(0, 3);

  suggestions.push(...nameMatches.map(p => ({
    type: 'product',
    text: p.name,
    category: p.category,
    productId: p._id
  })));

  // Category suggestions
  for (const [cat, taxonomy] of Object.entries(CATEGORY_TAXONOMY)) {
    if (cat.includes(lower) || taxonomy.primary.some(t => t.includes(lower)) || taxonomy.synonyms.some(s => s.includes(lower))) {
      suggestions.push({ type: 'category', text: cat.replace('_', ' '), category: cat });
    }
  }

  // Mission template suggestions
  for (const [name, rule] of Object.entries(OCCASION_RULES)) {
    if (rule.triggers.some(t => t.includes(lower))) {
      suggestions.push({ type: 'mission', text: name.replace('_', ' '), occasion: name });
    }
  }

  return suggestions.slice(0, 8);
}

module.exports = { processPromptWithAI, generateSuggestions, CATEGORY_KEYWORDS, OCCASION_PATTERNS };
