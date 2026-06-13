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
const { processPromptWithAI, generateSuggestions } = require('../services/aiService');
const { scoreSubstitutes } = require('../services/scoringEngine');
const { processFeedback } = require('../services/feedbackLearner');
const { authOptional } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/ai/shop
 * Main AI Shopping endpoint — the core "smart agent" experience.
 * Takes a user prompt and returns intelligently ranked products from the database.
 */
router.post('/shop', authOptional, async (req, res) => {
  try {
    const { prompt, filters } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Step 1: Load product database (the "context" for AI)
    let productQuery = { stock: { $gt: 0 } };
    if (filters?.category) productQuery.category = filters.category;
    const allProducts = await Product.find(productQuery);

    // Step 2: Get user preferences for personalization
    let userPrefs = {};
    if (req.user?.id) {
      const user = await User.findById(req.user.id);
      userPrefs = user?.preferences || {};
    }

    // Step 3: Run the full AI pipeline (NLP → Score → Rank → Explain)
    const aiResult = await processPromptWithAI(prompt, allProducts, userPrefs, req.user?.id);

    // Step 4: Validate product IDs exist in our database
    const validProducts = aiResult.products.filter(p => p._id);

    // Step 5: Store the intent for learning
    const intent = await IntentRequest.create({
      userId: req.user?.id,
      rawText: prompt,
      parsedIntent: aiResult.analysis.intent,
      category: aiResult.analysis.categories[0] || 'general',
      urgency: aiResult.analysis.urgency,
      quantity: aiResult.analysis.quantity,
      confidence: aiResult.analysis.confidence,
      occasion: aiResult.analysis.occasion,
      recommendedProductIds: validProducts.map(p => p._id)
    });

    // Step 6: Return comprehensive results to frontend
    res.json({
      success: true,
      intentId: intent._id,
      prompt,
      analysis: {
        ...aiResult.analysis,
        // Remove internal fields
        alsoNeeded: undefined
      },
      products: validProducts.map(p => ({
        _id: p._id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: p.price,
        originalPrice: p.originalPrice,
        image: p.image,
        rating: p.rating,
        reviewCount: p.reviewCount,
        deliveryETA: p.deliveryETA,
        stock: p.stock,
        isPrime: p.isPrime,
        size: p.size,
        description: p.description,
        tags: p.tags,
        aiScore: p._aiScore,
        rankReason: p.rankReason,
        signals: p._signals // Expose scoring breakdown for transparency
      })),
      // New: "You might also need" section
      alsoNeeded: aiResult.analysis.alsoNeeded || [],
      // Parsed NLP slots (useful for UI display)
      parsedSlots: aiResult.parsedSlots,
      meta: {
        totalProductsSearched: allProducts.length,
        matchesFound: validProducts.length,
        processingMethod: 'multi_signal_nlp_v2',
        scoringWeights: aiResult.analysis.urgency === 'high' ? 'urgent' : (aiResult.analysis.budget ? 'budget' : 'default')
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
