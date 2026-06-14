const express = require('express');
const { Cart, Order, Product } = require('../dataStore');
const { authOptional } = require('../middleware/auth');

const router = express.Router();

router.post('/prepare', authOptional, async (req, res) => {
  const { cartId, address, deliverySlot, paymentMethod } = req.body;
  const cart = await Cart.findById(cartId);
  if (!cart) return res.status(404).json({ error: 'Cart not found' });

  // Populate product details in cart items
  const populatedItems = [];
  for (const item of cart.items) {
    const product = await Product.findById(item.productId?._id || item.productId);
    if (product) {
      populatedItems.push({ ...item, productId: product });
    }
  }

  const orderItems = populatedItems.map(item => ({
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
    address: address || { street: '123 Main St', city: 'Mumbai', state: 'MH', zip: '400001' },
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
  // Save back
  await Order.findByIdAndUpdate(order._id, { trackingSteps: steps, fulfillmentStatus: order.fulfillmentStatus });

  res.json({ orderId: order._id, status: order.fulfillmentStatus, eta: order.eta, trackingSteps: steps });
});

router.get('/orders', authOptional, async (req, res) => {
  const filter = req.user?.id ? { userId: req.user.id } : {};
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(20);
  res.json(orders);
});

router.post('/instant', authOptional, async (req, res) => {
  try {
    const { productId, productName, price, quantity = 1, address, paymentMethod = 'default_token' } = req.body;

    if (!productId && !productName) {
      return res.status(400).json({ error: 'productId or productName is required' });
    }

    let orderItem = { productId, name: productName, quantity, price: price || 0, image: null };
    if (productId && productId !== 'null') {
      try {
        const product = await Product.findById(productId);
        if (product) {
          orderItem = {
            productId: product._id,
            name: product.name,
            quantity,
            price: product.price,
            image: product.image
          };
        }
      } catch { /* Use provided data */ }
    }

    const resolvedAddress = address || { street: '123 Main St', city: 'Mumbai', state: 'MH', zip: '400001' };
    const total = orderItem.price * quantity;
    const now = new Date();

    const order = await Order.create({
      userId: req.user?.id || 'guest',
      items: [orderItem],
      total,
      address: resolvedAddress,
      deliverySlot: 'Express - Instant Resolve',
      paymentMethod,
      paymentStatus: 'paid',
      fulfillmentStatus: 'dispatched',
      eta: '11 mins',
      trackingSteps: [
        { label: 'Order placed', time: now, completed: true },
        { label: 'Picker assigned', time: new Date(now.getTime() + 15000), completed: true },
        { label: 'Out for delivery', time: null, completed: false },
        { label: 'Delivered', time: null, completed: false }
      ]
    });

    res.json({
      success: true,
      orderId: order._id,
      mode: 'instant_resolve',
      item: orderItem.name,
      total,
      eta: '11 mins',
      address: resolvedAddress,
      paymentMethod,
      dispatched: true,
      timestamp: now.toISOString(),
      reasoning: 'Swipe-to-Resolve: atomic single-gesture checkout bypassing cart pipeline'
    });
  } catch (err) {
    console.error('Instant Checkout Error:', err);
    res.status(500).json({ error: 'Instant checkout failed', details: err.message });
  }
});

module.exports = router;
