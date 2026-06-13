/**
 * AI Agent Route - Main Shopping Intelligence Endpoint
 * 
 * Flow: User sends prompt → NLP Deep Parse → Product DB + Scoring → 
 * Feedback-Adjusted Ranking → Valid Product IDs → Substitutions → Response
 * 
 * This is the primary endpoint that makes the app feel like an intelligent agent.
 */
const express = require('express');
const Product = require('../models/Product');
const IntentRequest = require('../models/IntentRequest');
const User = require('../models/User');
const { processPromptWithAI, processAIShoppingRequest, generateSuggestions } = require('../services/aiService');
const { scoreSubstitutes } = require('../services/scoringEngine');
const { processFeedback } = require('../services/feedbackLearner');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/ai/shop
 * Main AI Shopping endpoint — the core "smart agent" experience.
 * Takes a user prompt and returns intelligently ranked products from the database.
 */
router.post('/shop', authRequired, async (req, res) => {
  try {
    const { user_prompt, userId, filters = {} } = req.body;
    const prompt = String(user_prompt || '').trim();
    if (!prompt) {
      return res.status(400).json({ error: 'user_prompt is required' });
    }

    if (userId && String(userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'userId does not match the authenticated session' });
    }

    const activeUserId = String(req.user.id);
    const [allProducts, activeUser] = await Promise.all([
      Product.find({}).lean(),
      User.findById(activeUserId).select('-password').lean()
    ]);

    const requestResult = await processAIShoppingRequest({
      user_prompt: prompt,
      userId: activeUserId,
      products: allProducts,
      userProfile: activeUser || {},
      filters
    });

    const intent = await IntentRequest.create({
      userId: activeUserId,
      rawText: prompt,
      parsedIntent: requestResult.intentSummary.parsedIntent,
      category: requestResult.intentSummary.categories?.[0] || 'general',
      urgency: requestResult.intentSummary.urgency,
      quantity: requestResult.intentSummary.quantity,
      confidence: requestResult.intentSummary.confidence,
      occasion: requestResult.intentSummary.occasion,
      recommendedProductIds: requestResult.products.map(p => p._id).filter(Boolean)
    });

    res.json({
      success: true,
      intentId: intent._id,
      intentSummary: requestResult.intentSummary,
      products: requestResult.products,
      alsoNeeded: requestResult.alsoNeeded,
      parsedSlots: requestResult.parsedSlots,
      meta: {
        totalProductsSearched: allProducts.length,
        matchesFound: requestResult.products.length,
        processingMethod: 'processAIShoppingRequest',
        authenticatedUserId: activeUserId
      }
    });
  } catch (err) {
    console.error('AI Shop Error:', err);
    res.status(500).json({ error: 'AI processing failed', details: err.message });
  }
});

/**
 * POST /api/ai/suggest
 * Intelligent autocomplete with category/mission awareness.
 */
router.post('/suggest', async (req, res) => {
  const { partial } = req.body;
  if (!partial || partial.length < 2) return res.json({ suggestions: [] });

  const products = await Product.find({ stock: { $gt: 0 } })
    .select('name brand category image price tags')
    .limit(100);

  const suggestions = generateSuggestions(partial, products);

  res.json({ suggestions });
});

/**
 * POST /api/ai/substitute
 * Find intelligent substitutes for a product.
 * Uses multi-factor scoring (price, rating, brand, delivery).
 */
router.post('/substitute', authOptional, async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  let userPrefs = {};
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    userPrefs = user?.preferences || {};
  }

  const allProducts = await Product.find({ stock: { $gt: 0 } });
  const substitutes = scoreSubstitutes(product, allProducts, userPrefs);

  res.json({
    original: product,
    substitutes: substitutes.map(s => ({
      _id: s._id,
      name: s.name,
      brand: s.brand,
      price: s.price,
      originalPrice: s.originalPrice,
      image: s.image,
      rating: s.rating,
      deliveryETA: s.deliveryETA,
      isPrime: s.isPrime,
      substitutionScore: s.substitutionScore,
      priceDifference: s.priceDifference,
      reason: s.reason
    }))
  });
});

/**
 * POST /api/ai/feedback
 * Record user feedback on AI recommendations for learning.
 */
router.post('/feedback', authOptional, async (req, res) => {
  try {
    const { type, accepted, productId, intentId, reason } = req.body;
    const event = await processFeedback({
      userId: req.user?.id,
      type,
      accepted,
      productId,
      intentId,
      reason
    });
    res.json({ stored: true, eventId: event._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to store feedback' });
  }
});

/**
 * GET /api/ai/insights
 * Return AI-generated insights about user's shopping patterns.
 */
router.get('/insights', authOptional, async (req, res) => {
  try {
    const { buildPurchaseProfile } = require('../services/feedbackLearner');
    const mlModels = require('../services/mlModels');
    const profile = await buildPurchaseProfile(req.user?.id);

    const intents = await IntentRequest.find(req.user?.id ? { userId: req.user.id } : {})
      .sort({ createdAt: -1 })
      .limit(20);

    // Derive shopping patterns
    const categoryFreq = {};
    const urgencyDist = { high: 0, medium: 0, low: 0 };
    for (const intent of intents) {
      categoryFreq[intent.category] = (categoryFreq[intent.category] || 0) + 1;
      urgencyDist[intent.urgency]++;
    }

    const topCategories = Object.entries(categoryFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, count]) => ({ category: cat, count }));

    res.json({
      profile,
      patterns: {
        totalIntents: intents.length,
        topCategories,
        urgencyDistribution: urgencyDist,
        avgConfidence: intents.length ? (intents.reduce((s, i) => s + i.confidence, 0) / intents.length).toFixed(2) : 0
      },
      mlStatus: mlModels.getModelStatus()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

/**
 * POST /api/ai/similar
 * Find products similar to a given product using ML feature vectors.
 */
router.post('/similar', async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required' });

  const mlModels = require('../services/mlModels');
  const similar = mlModels.getSimilarProducts(productId, 5);

  res.json({
    productId,
    similar: similar.map(s => ({
      _id: s.product._id,
      name: s.product.name,
      brand: s.product.brand,
      price: s.product.price,
      category: s.product.category,
      image: s.product.image,
      rating: s.product.rating,
      similarity: Math.round(s.similarity * 100) / 100
    }))
  });
});

/**
 * POST /api/ai/classify
 * Classify a text query using the trained Naive Bayes model.
 * Useful for debugging and showing ML confidence.
 */
router.post('/classify', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  const mlModels = require('../services/mlModels');
  const predictions = mlModels.classifyIntent(text);

  res.json({
    text,
    predictions: predictions.slice(0, 5),
    topCategory: predictions[0]?.label || 'general',
    confidence: predictions[0]?.probability || 0
  });
});

module.exports = router;
