const express = require('express');
const { Product } = require('../dataStore');

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

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

module.exports = router;
