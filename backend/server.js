require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Initialize data store (loads JSON dataset)
const dataStore = require('./dataStore');

const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const intentRoutes = require('./routes/intent');
const recommendationRoutes = require('./routes/recommendations');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const restockRoutes = require('./routes/restock');
const feedbackRoutes = require('./routes/feedback');
const aiRoutes = require('./routes/ai');
const consumptionRoutes = require('./routes/consumption');

// ML Model Manager
const { trainModels, getModelStatus, needsRetraining } = require('./services/mlModels');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Health & ML Status ──────────────────────────────────────────────────────

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date(), ml: getModelStatus(), dataSource: 'json_dataset' }));
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
app.use('/api/items', consumptionRoutes);
app.use('/api/orders', checkoutRoutes);

// ─── ML Model Training Endpoint (manual retrain) ─────────────────────────────

app.post('/api/ml/retrain', async (req, res) => {
  try {
    const success = await trainModels(dataStore.Product, dataStore.Order, dataStore.FeedbackEvent, dataStore.IntentRequest);
    res.json({ success, status: getModelStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Server Startup ──────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('[Server] Using JSON dataset as data source (no MongoDB required)');
  console.log(`[Server] ${dataStore.collections.products.length} products loaded`);

  // Train ML models on startup using the data store
  try {
    await trainModels(dataStore.Product, dataStore.Order, dataStore.FeedbackEvent, dataStore.IntentRequest);
  } catch (err) {
    console.warn('[ML] Initial training skipped:', err.message);
  }

  // Periodic retraining (every 15 minutes)
  setInterval(async () => {
    if (needsRetraining()) {
      try {
        await trainModels(dataStore.Product, dataStore.Order, dataStore.FeedbackEvent, dataStore.IntentRequest);
      } catch { /* silent */ }
    }
  }, 15 * 60 * 1000);

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
