/**
 * ML Models Manager — Trains and serves ML models from database data
 * 
 * Manages the lifecycle of:
 * - TF-IDF index for product search relevance
 * - Collaborative filter for "also bought" recommendations
 * - Naive Bayes classifier for intent categorization
 * - Thompson Sampler for explore/exploit product recommendations
 * - Exponential Smoother instances for per-category restock prediction
 * 
 * Models are trained on startup and refreshed periodically.
 * Synthetic training data is generated if real data is insufficient.
 */

const {
  TfIdfVectorizer,
  CollaborativeFilter,
  NaiveBayesClassifier,
  ThompsonSampler,
  ExponentialSmoother,
  findSimilarProducts,
  productToVector,
  denseCosineSimilarity
} = require('./mlCore');

// ─── Global Model Instances ──────────────────────────────────────────────────

let models = {
  tfidf: null,
  collab: null,
  intentClassifier: null,
  bandit: null,
  smoother: null,
  productVectors: new Map(), // productId → vector
  trained: false,
  lastTrainedAt: null
};

const RETRAIN_INTERVAL = 15 * 60 * 1000; // 15 minutes

// ─── Synthetic Training Data ─────────────────────────────────────────────────

function generateSyntheticIntentData() {
  // Generate realistic training examples for the Naive Bayes classifier
  return [
    // Snacks / Party
    { text: 'movie night snacks for 4 people', label: 'snacks' },
    { text: 'party chips and drinks tonight', label: 'snacks' },
    { text: 'popcorn for watching films', label: 'snacks' },
    { text: 'granola bars for hiking', label: 'snacks' },
    { text: 'cookies and candy for kids', label: 'snacks' },
    { text: 'nachos and dip for game day', label: 'snacks' },
    { text: 'quick snacks for office', label: 'snacks' },
    { text: 'munchies for late night', label: 'snacks' },
    // Medicine / Emergency
    { text: 'my baby has a fever need medicine now', label: 'medicine' },
    { text: 'headache pain relief urgent', label: 'medicine' },
    { text: 'cold and flu remedies', label: 'medicine' },
    { text: 'band aids and first aid supplies', label: 'medicine' },
    { text: 'allergy medication antihistamine', label: 'medicine' },
    { text: 'thermometer for sick child', label: 'medicine' },
    { text: 'stomach pain antacid', label: 'medicine' },
    { text: 'cough syrup for sore throat', label: 'medicine' },
    // Personal Care
    { text: 'running low on toothpaste and shampoo', label: 'personal_care' },
    { text: 'face wash for oily skin', label: 'personal_care' },
    { text: 'deodorant and body wash', label: 'personal_care' },
    { text: 'moisturizer lotion dry skin', label: 'personal_care' },
    { text: 'razor blades shaving cream', label: 'personal_care' },
    { text: 'sunscreen spf for beach', label: 'personal_care' },
    { text: 'dental floss mouthwash oral care', label: 'personal_care' },
    { text: 'conditioner for damaged hair', label: 'personal_care' },
    // Cleaning
    { text: 'laundry detergent and fabric softener', label: 'cleaning' },
    { text: 'deep cleaning the kitchen today', label: 'cleaning' },
    { text: 'disinfectant spray for bathroom', label: 'cleaning' },
    { text: 'dish soap sponges scrubber', label: 'cleaning' },
    { text: 'mop floor cleaner polish', label: 'cleaning' },
    { text: 'all purpose cleaner bleach', label: 'cleaning' },
    { text: 'stain remover for clothes', label: 'cleaning' },
    { text: 'toilet bowl cleaner brush', label: 'cleaning' },
    // Household
    { text: 'paper towels and tissues running out', label: 'household' },
    { text: 'batteries for remote control', label: 'household' },
    { text: 'trash bags and garbage bags', label: 'household' },
    { text: 'light bulbs replacement', label: 'household' },
    { text: 'aluminum foil plastic wrap', label: 'household' },
    { text: 'air freshener candles', label: 'household' },
    { text: 'storage bags ziplock containers', label: 'household' },
    { text: 'household essentials stock up', label: 'household' },
    // Groceries
    { text: 'pasta sauce for dinner tonight', label: 'groceries' },
    { text: 'fresh vegetables for salad', label: 'groceries' },
    { text: 'chicken breast for meal prep', label: 'groceries' },
    { text: 'bread milk eggs basics', label: 'groceries' },
    { text: 'cooking ingredients olive oil garlic', label: 'groceries' },
    { text: 'fruits bananas apples oranges', label: 'groceries' },
    { text: 'cheese yogurt dairy products', label: 'groceries' },
    { text: 'rice noodles asian food', label: 'groceries' },
    // Pantry
    { text: 'coffee beans morning brew', label: 'pantry' },
    { text: 'tea bags herbal green', label: 'pantry' },
    { text: 'sugar flour baking supplies', label: 'pantry' },
    { text: 'cereal oatmeal breakfast', label: 'pantry' },
    { text: 'cooking oil vegetable olive', label: 'pantry' },
    { text: 'spices salt pepper seasoning', label: 'pantry' },
    { text: 'honey maple syrup sweetener', label: 'pantry' },
    { text: 'rice quinoa grains', label: 'pantry' },
    // Baby
    { text: 'diapers and wipes for newborn', label: 'baby' },
    { text: 'baby formula milk powder', label: 'baby' },
    { text: 'infant care rash cream', label: 'baby' },
    { text: 'baby food puree pouches', label: 'baby' },
    { text: 'pacifier bottle nipples', label: 'baby' },
    { text: 'diaper rash ointment', label: 'baby' },
    // Travel
    { text: 'travel size toiletries for flight', label: 'travel' },
    { text: 'packing essentials for vacation', label: 'travel' },
    { text: 'portable charger neck pillow trip', label: 'travel' },
    { text: 'mini shampoo conditioner tsa', label: 'travel' },
    // Office
    { text: 'printer paper and pens for work', label: 'office' },
    { text: 'notebooks highlighters school supplies', label: 'office' },
    { text: 'desk organizer folders', label: 'office' },
    { text: 'markers whiteboard office meeting', label: 'office' }
  ];
}

// ─── Model Training ──────────────────────────────────────────────────────────

/**
 * Train all ML models using database data.
 * Call on server startup and periodically.
 */
async function trainModels(Product, Order, FeedbackEvent, IntentRequest) {
  try {
    console.log('[ML] Training models...');
    const startTime = Date.now();

    // 1. Train TF-IDF on product corpus
    const products = await Product.find({}).lean();
    const tfidf = new TfIdfVectorizer();
    const productTexts = products.map(p =>
      `${p.name} ${p.brand || ''} ${(p.tags || []).join(' ')} ${p.description || ''} ${p.category}`
    );
    tfidf.fit(productTexts);

    // 2. Build product vectors
    const productVectors = new Map();
    for (const p of products) {
      productVectors.set(p._id.toString(), productToVector(p));
    }

    // 3. Train Collaborative Filter on orders
    const orders = await Order.find({}).lean().limit(500);
    const collab = new CollaborativeFilter();
    if (orders.length > 0) {
      collab.fit(orders);
    }

    // 4. Train Intent Classifier
    const intentClassifier = new NaiveBayesClassifier();
    // Use synthetic data as base
    const syntheticData = generateSyntheticIntentData();
    intentClassifier.train(syntheticData);

    // Augment with real intent history if available
    const realIntents = await IntentRequest.find({}).lean().limit(200);
    if (realIntents.length > 5) {
      const realTraining = realIntents
        .filter(i => i.rawText && i.category && i.category !== 'general')
        .map(i => ({ text: i.rawText, label: i.category }));
      intentClassifier.train(realTraining);
    }

    // 5. Initialize Thompson Sampler with product feedback
    const bandit = new ThompsonSampler();
    for (const p of products) {
      // Initialize with prior based on rating
      const priorAlpha = Math.round((p.rating || 4) * 2); // Good rating = higher prior
      bandit.addArm(p._id.toString(), priorAlpha, 2);
    }

    // Update from feedback events
    const feedbacks = await FeedbackEvent.find({ type: 'intent' }).lean().limit(500);
    for (const fb of feedbacks) {
      if (fb.productId) {
        bandit.update(fb.productId.toString(), fb.accepted ? 1 : 0);
      }
    }

    // 6. Exponential Smoother (stateless, just instantiate)
    const smoother = new ExponentialSmoother(0.3, 0.1);

    // Store trained models
    models = {
      tfidf,
      collab,
      intentClassifier,
      bandit,
      smoother,
      productVectors,
      products, // Cache for similarity lookups
      trained: true,
      lastTrainedAt: Date.now()
    };

    console.log(`[ML] Models trained in ${Date.now() - startTime}ms (${products.length} products, ${orders.length} orders, ${feedbacks.length} feedbacks)`);
    return true;
  } catch (err) {
    console.error('[ML] Training failed:', err.message);
    return false;
  }
}

// ─── Model Inference Functions ───────────────────────────────────────────────

/**
 * Get TF-IDF relevance score between a query and product.
 * Returns 0-1 normalized score.
 */
function getTfIdfScore(query, product) {
  if (!models.tfidf) return 0;
  const productText = `${product.name} ${product.brand || ''} ${(product.tags || []).join(' ')} ${product.description || ''} ${product.category}`;
  return models.tfidf.similarity(query, productText);
}

/**
 * Classify intent from text using trained Naive Bayes.
 * Returns top predictions with probabilities.
 */
function classifyIntent(text) {
  if (!models.intentClassifier) return [{ label: 'general', probability: 1.0 }];
  return models.intentClassifier.predict(text);
}

/**
 * Get collaborative filtering recommendations.
 * "Products frequently bought with X"
 */
function getCollabRecommendations(productIds, limit = 5) {
  if (!models.collab) return [];
  return models.collab.recommend(productIds.map(id => id.toString()), limit);
}

/**
 * Get Thompson Sampling exploration score for a product.
 * Balances showing popular items vs exploring less-shown ones.
 */
function getBanditScore(productId) {
  if (!models.bandit) return 0.5;
  return models.bandit.getMean(productId.toString());
}

/**
 * Record a bandit reward (user interacted positively with product).
 */
function recordBanditReward(productId, reward) {
  if (!models.bandit) return;
  models.bandit.update(productId.toString(), reward);
}

/**
 * Predict next purchase interval using exponential smoothing.
 * @param {number[]} intervals - Past days-between-purchase values
 * @returns {Object} prediction with confidence
 */
function predictRestockInterval(intervals) {
  if (!models.smoother) {
    const smoother = new ExponentialSmoother();
    return smoother.predict(intervals);
  }
  return models.smoother.predict(intervals);
}

/**
 * Find similar products using dense vector cosine similarity.
 */
function getSimilarProducts(productId, limit = 5) {
  if (!models.products) return [];
  const targetProduct = models.products.find(p => p._id.toString() === productId.toString());
  if (!targetProduct) return [];
  return findSimilarProducts(targetProduct, models.products, limit);
}

/**
 * Check if models need retraining.
 */
function needsRetraining() {
  if (!models.trained) return true;
  if (!models.lastTrainedAt) return true;
  return (Date.now() - models.lastTrainedAt) > RETRAIN_INTERVAL;
}

/**
 * Get model status for debugging.
 */
function getModelStatus() {
  return {
    trained: models.trained,
    lastTrainedAt: models.lastTrainedAt ? new Date(models.lastTrainedAt).toISOString() : null,
    productCount: models.products?.length || 0,
    vocabSize: models.tfidf?.vocabulary?.size || 0,
    collabItems: models.collab?.itemCounts?.size || 0,
    banditArms: models.bandit?.arms?.size || 0,
    classifierClasses: models.intentClassifier?.classCounts?.size || 0
  };
}

module.exports = {
  trainModels,
  getTfIdfScore,
  classifyIntent,
  getCollabRecommendations,
  getBanditScore,
  recordBanditReward,
  predictRestockInterval,
  getSimilarProducts,
  needsRetraining,
  getModelStatus,
  models // Expose for testing
};
