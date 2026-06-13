const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { findSubstitutes } = require('../services/intentService');
const { authOptional } = require('../middleware/auth');

const router = express.Router();

async function buildCartItems(productIds, quantities = {}) {
  const items = [];
  let total = 0;
  let fastestEta = '60 mins';

  for (const id of productIds) {
    const product = await Product.findById(id);
    if (!product) continue;
    const qty = quantities[id] || 1;
    items.push({ productId: product._id, quantity: qty, price: product.price });
    total += product.price * qty;
    if (product.deliveryETA && parseInt(product.deliveryETA) < parseInt(fastestEta)) {
      fastestEta = product.deliveryETA;
    }
  }
  return { items, total, eta: fastestEta };
}

router.post('/build', authOptional, async (req, res) => {
  const { productIds, intentSummary, source = 'intent', sessionId } = req.body;
  if (!productIds?.length) return res.status(400).json({ error: 'productIds required' });

  const { items, total, eta } = await buildCartItems(productIds);

  const cart = await Cart.create({
    userId: req.user?.id,
    sessionId,
    items,
    total,
    eta,
    source,
    intentSummary
  });

  const populated = await Cart.findById(cart._id).populate('items.productId');
  res.json(populated);
});

router.get('/:id', async (req, res) => {
  const cart = await Cart.findById(req.params.id).populate('items.productId');
  if (!cart) return res.status(404).json({ error: 'Cart not found' });
  res.json(cart);
});

router.put('/:id', async (req, res) => {
  const { items } = req.body;
  let total = 0;
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (product) total += product.price * item.quantity;
  }
  const cart = await Cart.findByIdAndUpdate(req.params.id, { items, total }, { new: true }).populate('items.productId');
  res.json(cart);
});

router.post('/substitute', async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const allProducts = await Product.find();
  const substitutes = findSubstitutes(product, allProducts);
  res.json({ original: product, substitutes });
});

module.exports = router;
