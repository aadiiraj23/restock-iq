require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const intentRoutes = require('./routes/intent');
const recommendationRoutes = require('./routes/recommendations');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const restockRoutes = require('./routes/restock');
const feedbackRoutes = require('./routes/feedback');
const aiRoutes = require('./routes/ai');

// ML Model Manager
const { trainModels, getModelStatus, needsRetraining } = require('./services/mlModels');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Health & ML Status ──────────────────────────────────────────────────────

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date(), ml: getModelStatus() }));
app.get('/api/ml/status', (_, res) => res.json(getModelStatus()));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/intent', intentRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/restock', restockRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/orders', checkoutRoutes);

// ─── ML Model Training Endpoint (manual retrain) ─────────────────────────────

app.post('/api/ml/retrain', async (req, res) => {
  try {
    const Product = require('./models/Product');
    const Order = require('./models/Order');
    const FeedbackEvent = require('./models/FeedbackEvent');
    const IntentRequest = require('./models/IntentRequest');
    const success = await trainModels(Product, Order, FeedbackEvent, IntentRequest);
    res.json({ success, status: getModelStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Server Startup ──────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/amazon_now')
  .then(async () => {
    console.log('MongoDB connected');

    // Train ML models on startup
    try {
      const Product = require('./models/Product');
      const Order = require('./models/Order');
      const FeedbackEvent = require('./models/FeedbackEvent');
      const IntentRequest = require('./models/IntentRequest');
      await trainModels(Product, Order, FeedbackEvent, IntentRequest);
    } catch (err) {
      console.warn('[ML] Initial training skipped:', err.message);
    }

    // Periodic retraining (every 15 minutes)
    setInterval(async () => {
      if (needsRetraining()) {
        try {
          const Product = require('./models/Product');
          const Order = require('./models/Order');
          const FeedbackEvent = require('./models/FeedbackEvent');
          const IntentRequest = require('./models/IntentRequest');
          await trainModels(Product, Order, FeedbackEvent, IntentRequest);
        } catch { /* silent */ }
      }
    }, 15 * 60 * 1000);

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    console.log('Starting server without DB (limited functionality)...');
    app.listen(PORT, () => console.log(`Server running on port ${PORT} (no DB)`));
  });
