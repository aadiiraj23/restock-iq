const express = require('express');
const Product = require('../models/Product');
const { parseIntent, rankProducts } = require('../services/intentService');
const { buildPurchaseProfile, getCooccurringProducts } = require('../services/feedbackLearner');
const { authOptional } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * POST /api/recommendations/generate
 * Generate product recommendations from a parsed intent or text.
 * Uses multi-signal scoring + collaborative filtering.
 */
router.post('/generate', authOptional, async (req, res) => {
  const { parsedIntent, text, location } = req.body;

  let userPrefs = {};
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    userPrefs = user?.preferences || {};
  }

  // Parse if not already parsed
  const parsed = parsedIntent || parseIntent(text || '');

  // Get all in-stock products
  const allProducts = await Product.find({ stock: { $gt: 0 } });
  const ranked = rankProducts(allProducts, parsed, userPrefs);

  // Collaborative filtering: "also bought" products
  let alsoBought = [];
  if (ranked.length > 0 && req.user?.id) {
    try {
      const cooccurring = await getCooccurringProducts(ranked.map(p => p._id), 3);
      if (cooccurring.length > 0) {
        const coProducts = await Product.find({ _id: { $in: cooccurring.map(c => c.productId) } });
        alsoBought = coProducts.map(p => ({
          ...p.toObject(),
          recommendationReason: 'Frequently bought together'
        }));
      }
    } catch {
      // Non-critical
    }
  }

  res.json({
    products: ranked,
    alsoBought,
    location: location || 'default',
    method: 'multi_signal_scoring_v2'
  });
});

module.exports = router;
