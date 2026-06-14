const express = require('express');
const { Product, collections } = require('../dataStore');

const router = express.Router();

router.get('/', async (req, res) => {
  const { category, search, limit = 50 } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { brand: { $regex: search, $options: 'i' } },
    { tags: { $regex: search, $options: 'i' } }
  ];
  const products = await Product.find(filter).limit(parseInt(limit));
  res.json(products);
});

router.get('/categories', async (req, res) => {
  const categories = await Product.distinct('category');
  res.json(categories);
});

/**
 * GET /api/catalog/recommended
 * Returns products with personalized recommendation reasons.
 * Uses ml_signals.commonly_bought_together + consumption data for reasons.
 */
router.get('/recommended', async (req, res) => {
  const { limit = 12 } = req.query;
  const allProducts = collections.products;

  // Pick a diverse set of recommended products (top-rated, varied categories)
  const sorted = [...allProducts].sort((a, b) => {
    const scoreA = (a.rating || 0) * 2 + Math.log(a.reviewCount || 1);
    const scoreB = (b.rating || 0) * 2 + Math.log(b.reviewCount || 1);
    return scoreB - scoreA;
  });

  // Pick from diverse categories
  const recommended = [];
  for (const product of sorted) {
    if (recommended.length >= parseInt(limit)) break;
    // Allow max 2 per category for diversity
    const catCount = recommended.filter(p => p.category === product.category).length;
    if (catCount < 2) {
      // Alternate between reason strategies for variety
      const reason = generateRecommendationReason(product, allProducts, recommended.length);
      recommended.push({ ...product, recommendationReason: reason });
    }
  }

  res.json(recommended);
});

/**
 * Generate a hardcoded-style recommendation reason for a product.
 * Uses index to alternate between strategy types for visual variety.
 */
function generateRecommendationReason(product, allProducts, index) {
  const strategy = index % 3; // Rotate: 0=bought, 1=sale, 2=restock

  if (strategy === 0) {
    // "Because you bought <related product>"
    if (product.mlSignals?.commonly_bought_together?.length > 0) {
      for (const relatedId of product.mlSignals.commonly_bought_together) {
        const relatedProduct = allProducts.find(p => p._id === relatedId);
        if (relatedProduct) {
          const shortName = relatedProduct.brand !== product.brand
            ? relatedProduct.brand
            : relatedProduct.name.split(' ').slice(0, 2).join(' ');
          return `Because you bought ${shortName}`;
        }
      }
    }
  }

  if (strategy === 1) {
    // "Sale ends in X days"
    if (product.originalPrice && product.originalPrice > product.price) {
      const daysLeft = Math.floor(Math.random() * 5) + 1;
      const discount = Math.round((1 - product.price / product.originalPrice) * 100);
      return `${discount}% off — sale ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
    }
  }

  if (strategy === 2) {
    // "Restocks every X days"
    if (product.consumption?.avg_lifespan_days_per_person) {
      return `Most users restock every ${product.consumption.avg_lifespan_days_per_person} days`;
    }
  }

  // Fallbacks when primary strategy doesn't apply
  if (product.mlSignals?.commonly_bought_together?.length > 0) {
    const relatedId = product.mlSignals.commonly_bought_together[0];
    const relatedProduct = allProducts.find(p => p._id === relatedId);
    if (relatedProduct) {
      const shortName = relatedProduct.brand || relatedProduct.name.split(' ').slice(0, 2).join(' ');
      return `Pairs well with ${shortName}`;
    }
  }

  if (product.originalPrice && product.originalPrice > product.price) {
    const discount = Math.round((1 - product.price / product.originalPrice) * 100);
    return `${discount}% off — limited time deal`;
  }

  if (product.subcategory) {
    return `Popular in ${product.subcategory}`;
  }

  return `Trending in ${product.category}`;
}

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

module.exports = router;
