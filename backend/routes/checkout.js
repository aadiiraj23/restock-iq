const express = require('express');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authOptional } = require('../middleware/auth');

const router = express.Router();

router.post('/prepare', authOptional, async (req, res) => {
  const { cartId, address, deliverySlot, paymentMethod } = req.body;
  const cart = await Cart.findById(cartId).populate('items.productId');
  if (!cart) return res.status(404).json({ error: 'Cart not found' });

  const orderItems = cart.items.map(item => ({
    productId: item.productId._id,
    name: item.productId.name,
    quantity: item.quantity,
    price: item.productId.price,
    image: item.productId.image
  }));

  const now = new Date();
  const order = await Order.create({
    userId: req.user?.id || cart.userId,
    cartId: cart._id,
    items: orderItems,
    total: cart.total,
    address: address || { street: '123 Main St', city: 'Seattle', state: 'WA', zip: '98101' },
    deliverySlot: deliverySlot || 'Express - Today',
    paymentMethod: paymentMethod || 'card',
    paymentStatus: 'paid',
    fulfillmentStatus: 'processing',
    eta: cart.eta || '30 mins',
    trackingSteps: [
      { label: 'Order placed', time: now, completed: true },
      { label: 'Packing items', time: null, completed: false },
      { label: 'Out for delivery', time: null, completed: false },
      { label: 'Delivered', time: null, completed: false }
    ]
  });

  await Cart.findByIdAndUpdate(cartId, { status: 'checked_out' });

  res.json({
    orderId: order._id,
    order,
    paymentReady: true,
    eta: order.eta,
    summary: { subtotal: cart.total, delivery: 0, total: cart.total }
  });
});

router.get('/orders/:id/status', async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const elapsed = Date.now() - new Date(order.createdAt).getTime();
  const steps = [...order.trackingSteps];

  if (elapsed > 30000 && !steps[1].completed) {
    steps[1] = { ...steps[1], completed: true, time: new Date() };
  }
  if (elapsed > 60000 && !steps[2].completed) {
    steps[2] = { ...steps[2], completed: true, time: new Date() };
  }
  if (elapsed > 120000 && !steps[3].completed) {
    steps[3] = { ...steps[3], completed: true, time: new Date() };
    order.fulfillmentStatus = 'delivered';
  }

  order.trackingSteps = steps;
  await order.save();

  res.json({ orderId: order._id, status: order.fulfillmentStatus, eta: order.eta, trackingSteps: steps });
});

router.get('/orders', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(20);
  res.json(orders);
});

module.exports = router;
