const express = require('express');
const Product = require('../models/Product');
const IntentRequest = require('../models/IntentRequest');
const { MISSION_TEMPLATES, parseIntent, rankProducts } = require('../services/intentService');
const { authOptional } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.get('/templates', (req, res) => {
  res.json(MISSION_TEMPLATES);
});

/**
 * POST /api/intent/parse
 * Parse natural language into structured intent + ranked products.
 * Uses the deep NLP engine for slot extraction and multi-signal scoring.
 */
router.post('/parse', authOptional, async (req, res) => {
  const { text, voiceTranscript, imageMetadata } = req.body;
  const input = text || voiceTranscript || imageMetadata?.detectedItem || '';
  if (!input) return res.status(400).json({ error: 'Input required' });

  // Deep parse with new NLP engine
  const parsed = parseIntent(input);

  let userPrefs = {};
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    userPrefs = user?.preferences || {};
  }

  // Load in-stock products
  const allProducts = await Product.find({ stock: { $gt: 0 } });

  // Multi-stage filtering for better results
  let candidates = allProducts;

  // 1. Tag/keyword filter
  if (parsed.searchTags?.length) {
    const tagged = allProducts.filter(p => {
      const productText = `${p.name} ${p.brand || ''} ${(p.tags || []).join(' ')} ${p.description || ''} ${p.category}`.toLowerCase();
      return parsed.searchTags.some(t => productText.includes(t));
    });
    if (tagged.length >= 3) candidates = tagged;
  }

  // 2. Category filter (additive, not restrictive)
  if (parsed.category && parsed.category !== 'general') {
    const catFiltered = candidates.filter(p => p.category === parsed.category);
    // If boosted categories exist, include those too
    const boosted = parsed.boostedCategories?.length
      ? candidates.filter(p => parsed.boostedCategories.includes(p.category))
      : [];
    const combined = [...new Set([...catFiltered, ...boosted])];
    if (combined.length >= 3) candidates = combined;
  }

  // Score and rank with multi-signal engine
  const ranked = rankProducts(candidates.length >= 3 ? candidates : allProducts, parsed, userPrefs);

  // Store intent for learning
  const intent = await IntentRequest.create({
    userId: req.user?.id,
    rawText: input,
    parsedIntent: parsed.parsedIntent,
    category: parsed.category,
    urgency: parsed.urgency,
    quantity: parsed.quantity,
    confidence: parsed.confidence,
    occasion: parsed.occasion,
    recommendedProductIds: ranked.map(p => p._id)
  });

  res.json({
    intentId: intent._id,
    intent: parsed.parsedIntent,
    category: parsed.category,
    urgency: parsed.urgency,
    quantity: parsed.quantity,
    confidence: parsed.confidence,
    occasion: parsed.occasion,
    summary: buildSummary(parsed),
    products: ranked,
    // New enriched fields
    parsedSlots: {
      categories: parsed.categories,
      budget: parsed.budget,
      brandHints: parsed.brandHints,
      substitutionTolerance: parsed.substitutionTolerance,
      temporal: parsed.temporal
    }
  });
});

function buildSummary(parsed) {
  const parts = [`Detected: ${parsed.parsedIntent}`];
  parts.push(`${parsed.urgency} urgency`);
  parts.push(`${Math.round(parsed.confidence * 100)}% confidence`);
  if (parsed.budget?.max) parts.push(`budget $${parsed.budget.max}`);
  if (parsed.brandHints?.length) parts.push(`brands: ${parsed.brandHints.join(', ')}`);
  if (parsed.quantity) parts.push(`qty: ${parsed.quantity}`);
  return parts.join(' · ');
}

module.exports = router;
