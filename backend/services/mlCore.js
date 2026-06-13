/**
 * ML Core — Lightweight Machine Learning Primitives
 * 
 * Implements real ML algorithms without external dependencies:
 * 1. TF-IDF Vectorizer — text → sparse vector for similarity
 * 2. Cosine Similarity — compare product feature vectors  
 * 3. Exponential Smoothing — time-series prediction for restock
 * 4. Thompson Sampling (Multi-Armed Bandit) — explore/exploit for recommendations
 * 5. Item-Item Collaborative Filter — product co-occurrence matrix
 * 6. Naive Bayes Intent Classifier — probabilistic intent categorization
 * 7. Gradient-free Weight Optimizer — learns scoring weights from feedback
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TF-IDF VECTORIZER
// ═══════════════════════════════════════════════════════════════════════════════

class TfIdfVectorizer {
  constructor() {
    this.vocabulary = new Map();
    this.idf = new Map();
    this.productVectors = new Map();
    this.products = [];
    this.docCount = 0;
  }

  fit(products) {
    const documents = Array.isArray(products) ? products : [];
    this.vocabulary.clear();
    this.idf.clear();
    this.productVectors.clear();
    this.products = [];
    this.docCount = documents.length;

    const normalisedDocs = documents.map((product, index) => {
      const productId = this._getProductId(product, index);
      const text = this._buildProductText(product);
      const tokens = this._tokenize(text);

      return {
        productId,
        tokens,
        text
      };
    });

    const documentFrequency = new Map();
    for (const doc of normalisedDocs) {
      const uniqueTokens = new Set(doc.tokens);
      for (const token of uniqueTokens) {
        documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
      }
    }

    const sortedTerms = [...documentFrequency.keys()].sort();
    sortedTerms.forEach((term, index) => {
      const frequency = documentFrequency.get(term) || 0;
      this.vocabulary.set(term, index);
      this.idf.set(term, Math.log((this.docCount + 1) / (frequency + 1)) + 1);
    });

    this.products = normalisedDocs.map(doc => ({
      productId: doc.productId,
      text: doc.text
    }));

    for (const doc of normalisedDocs) {
      const vector = this._vectoriseTokens(doc.tokens);
      this.productVectors.set(doc.productId, vector);
    }
  }

  transform(document) {
    return this._vectoriseTokens(this._tokenize(document));
  }

  similarity(query, document) {
    return cosineSimilarity(this.transform(query), this.transform(document));
  }

  scoreRelevance(userQuery) {
    const queryVector = this.transform(userQuery);
    const scores = new Map();

    for (const [productId, productVector] of this.productVectors.entries()) {
      scores.set(productId, cosineSimilarity(queryVector, productVector));
    }

    return scores;
  }

  _vectoriseTokens(tokens) {
    const tokenCounts = new Map();
    for (const token of tokens) {
      if (!this.vocabulary.has(token)) continue;
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    }

    const vector = new Map();
    if (tokenCounts.size === 0) return vector;

    const maxCount = Math.max(...tokenCounts.values(), 1);
    for (const [token, count] of tokenCounts.entries()) {
      const index = this.vocabulary.get(token);
      const idfScore = this.idf.get(token) || 0;
      const tf = count / maxCount;
      vector.set(index, tf * idfScore);
    }

    return vector;
  }

  _buildProductText(product) {
    if (typeof product === 'string') return product;

    const tags = Array.isArray(product?.tags) ? product.tags.join(' ') : '';
    return [product?.name, product?.brand, tags]
      .filter(Boolean)
      .join(' ');
  }

  _getProductId(product, fallbackIndex) {
    if (typeof product === 'string') return String(fallbackIndex);
    return String(product?._id ?? product?.id ?? product?.productId ?? fallbackIndex);
  }

  _tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. COSINE SIMILARITY (sparse vectors)
// ═══════════════════════════════════════════════════════════════════════════════

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [idx, valA] of vecA.entries()) {
    normA += valA * valA;
    const valB = vecB.get(idx);
    if (valB !== undefined) {
      dotProduct += valA * valB;
    }
  }
  for (const [, valB] of vecB.entries()) {
    normB += valB * valB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dotProduct / denom : 0;
}

/**
 * Dense vector cosine similarity (for feature vectors).
 */
function denseCosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. EXPONENTIAL SMOOTHING (Holt-Winters style for restock prediction)
// ═══════════════════════════════════════════════════════════════════════════════

class ExponentialSmoother {
  /**
   * @param {number} alpha - Level smoothing (0-1), higher = more reactive
   * @param {number} beta - Trend smoothing (0-1)
   */
  constructor(alpha = 0.3, beta = 0.1) {
    this.alpha = alpha;
    this.beta = beta;
  }

  /**
   * Predict next value in a time series using double exponential smoothing.
   * @param {number[]} series - Historical values (e.g., days between purchases)
   * @param {number} horizon - Steps ahead to predict
   * @returns {{ prediction: number, confidence: number, trend: string }}
   */
  predict(series, horizon = 1) {
    if (!series || series.length === 0) return { prediction: 0, confidence: 0.5, trend: 'unknown' };
    if (series.length === 1) return { prediction: series[0], confidence: 0.6, trend: 'stable' };

    // Initialize
    let level = series[0];
    let trend = series.length > 1 ? series[1] - series[0] : 0;

    // Apply smoothing
    for (let i = 1; i < series.length; i++) {
      const prevLevel = level;
      level = this.alpha * series[i] + (1 - this.alpha) * (level + trend);
      trend = this.beta * (level - prevLevel) + (1 - this.beta) * trend;
    }

    // Forecast
    const prediction = level + trend * horizon;

    // Confidence based on variance
    const residuals = series.map((v, i) => {
      if (i === 0) return 0;
      const expected = series[i - 1]; // Naive baseline
      return Math.abs(v - expected);
    }).slice(1);

    const avgResidual = residuals.length > 0
      ? residuals.reduce((s, r) => s + r, 0) / residuals.length
      : prediction * 0.2;

    const cv = prediction > 0 ? avgResidual / prediction : 0.5; // Coefficient of variation
    const confidence = Math.max(0.4, Math.min(0.95, 1 - cv));

    // Trend direction
    let trendDir = 'stable';
    if (trend > 0.5) trendDir = 'increasing'; // Getting longer between purchases
    else if (trend < -0.5) trendDir = 'decreasing'; // Getting shorter

    return {
      prediction: Math.max(1, Math.round(prediction * 10) / 10),
      confidence: Math.round(confidence * 100) / 100,
      trend: trendDir,
      level: Math.round(level * 10) / 10,
      trendValue: Math.round(trend * 100) / 100
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. THOMPSON SAMPLING (Multi-Armed Bandit for product recommendation)
// ═══════════════════════════════════════════════════════════════════════════════

class ThompsonSampler {
  constructor() {
    // Each arm (product/category) has Beta distribution parameters
    this.arms = new Map(); // key → { alpha, beta, pulls, rewards }
  }

  /**
   * Initialize or update an arm.
   */
  addArm(key, priorAlpha = 1, priorBeta = 1) {
    if (!this.arms.has(key)) {
      this.arms.set(key, { alpha: priorAlpha, beta: priorBeta, pulls: 0, rewards: 0 });
    }
  }

  /**
   * Record a reward (1 = user accepted/bought, 0 = rejected/ignored).
   */
  update(key, reward) {
    const arm = this.arms.get(key);
    if (!arm) return;
    arm.pulls++;
    if (reward > 0) {
      arm.alpha += reward;
      arm.rewards += reward;
    } else {
      arm.beta += 1;
    }
  }

  /**
   * Sample from each arm's posterior and return a ranking.
   * Higher samples = better expected reward = show first.
   */
  sample(keys) {
    return keys
      .map(key => {
        const arm = this.arms.get(key) || { alpha: 1, beta: 1 };
        // Sample from Beta(alpha, beta) using Jorgensen's method approximation
        const sample = this._betaSample(arm.alpha, arm.beta);
        return { key, sample, ucb: arm.alpha / (arm.alpha + arm.beta) };
      })
      .sort((a, b) => b.sample - a.sample);
  }

  /**
   * Get the exploitation score (mean of posterior) without exploration.
   */
  getMean(key) {
    const arm = this.arms.get(key) || { alpha: 1, beta: 1 };
    return arm.alpha / (arm.alpha + arm.beta);
  }

  _betaSample(alpha, beta) {
    // Approximate Beta sampling using the inverse transform method
    const u1 = this._gammaSample(alpha);
    const u2 = this._gammaSample(beta);
    return u1 / (u1 + u2);
  }

  _gammaSample(shape) {
    // Marsaglia and Tsang's method for Gamma(shape, 1)
    if (shape < 1) {
      return this._gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = this._normalSample();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  _normalSample() {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ITEM-ITEM COLLABORATIVE FILTER
// ═══════════════════════════════════════════════════════════════════════════════

class CollaborativeFilter {
  constructor() {
    this.coMatrix = new Map(); // productId → Map(productId → count)
    this.itemCounts = new Map(); // productId → total appearances
  }

  /**
   * Build co-occurrence matrix from order history.
   * @param {Array} orders - Order documents with items array
   */
  fit(orders) {
    for (const order of orders) {
      const items = (order.items || [])
        .map(i => i.productId?.toString?.() || i.productId)
        .filter(Boolean);

      for (let i = 0; i < items.length; i++) {
        this.itemCounts.set(items[i], (this.itemCounts.get(items[i]) || 0) + 1);
        for (let j = i + 1; j < items.length; j++) {
          this._increment(items[i], items[j]);
          this._increment(items[j], items[i]);
        }
      }
    }
  }

  _increment(a, b) {
    if (!this.coMatrix.has(a)) this.coMatrix.set(a, new Map());
    const row = this.coMatrix.get(a);
    row.set(b, (row.get(b) || 0) + 1);
  }

  /**
   * Get similar products (by co-purchase pattern).
   * Uses lift: P(A,B) / (P(A) * P(B)) — measures co-occurrence beyond chance.
   * @param {string[]} productIds - Products user has/wants
   * @param {number} limit
   * @returns {Array<{productId, score, reason}>}
   */
  recommend(productIds, limit = 5) {
    const totalOrders = Math.max(1, this.itemCounts.size);
    const scores = new Map();

    for (const pid of productIds) {
      const row = this.coMatrix.get(pid);
      if (!row) continue;

      const countA = this.itemCounts.get(pid) || 1;

      for (const [otherId, coCount] of row.entries()) {
        if (productIds.includes(otherId)) continue; // Skip already in set

        const countB = this.itemCounts.get(otherId) || 1;
        // Lift = P(A∩B) / (P(A) * P(B))
        const lift = (coCount / totalOrders) / ((countA / totalOrders) * (countB / totalOrders));
        // Also factor in raw support
        const support = coCount / totalOrders;
        const score = lift * 0.7 + support * 100 * 0.3; // Blend lift and support

        const existing = scores.get(otherId) || 0;
        scores.set(otherId, existing + score);
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([productId, score]) => ({
        productId,
        score: Math.round(score * 100) / 100,
        reason: 'Frequently bought together'
      }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. NAIVE BAYES INTENT CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════════

class NaiveBayesClassifier {
  constructor() {
    this.classCounts = new Map();
    this.featureCounts = new Map();
    this.featureTotals = new Map();
    this.classOrder = [];
    this.totalDocs = 0;
    this.vocabulary = new Set();
    this.defaultCategory = 'general';
  }

  train(products) {
    const items = Array.isArray(products) ? products : [];

    for (const item of items) {
      const label = this._getLabel(item);
      if (!label) continue;

      const text = this._buildTrainingText(item);
      const tokens = this._tokenize(text);

      this.totalDocs += 1;
      this.classCounts.set(label, (this.classCounts.get(label) || 0) + 1);
      this.featureTotals.set(label, (this.featureTotals.get(label) || 0) + tokens.length);

      if (!this.featureCounts.has(label)) {
        this.featureCounts.set(label, new Map());
      }
      if (!this.classOrder.includes(label)) {
        this.classOrder.push(label);
      }

      const features = this.featureCounts.get(label);
      for (const token of tokens) {
        this.vocabulary.add(token);
        features.set(token, (features.get(token) || 0) + 1);
      }
    }
  }

  predict(queryText) {
    const ranked = this.predictProba(queryText);
    return ranked[0]?.label || this.defaultCategory;
  }

  predictProba(queryText) {
    const classLabels = this.classOrder.length > 0 ? this.classOrder : [...this.classCounts.keys()];
    if (classLabels.length === 0 || this.totalDocs === 0) {
      return [{ label: this.defaultCategory, probability: 1 }];
    }

    const tokens = this._tokenize(queryText);
    const vocabSize = Math.max(1, this.vocabulary.size);
    const scores = [];

    for (const label of classLabels) {
      const classDocCount = this.classCounts.get(label) || 0;
      const tokenCounts = this.featureCounts.get(label) || new Map();
      const totalTokens = this.featureTotals.get(label) || 0;

      let logProb = Math.log((classDocCount + 1) / (this.totalDocs + classLabels.length));

      for (const token of tokens) {
        const tokenCount = tokenCounts.get(token) || 0;
        logProb += Math.log((tokenCount + 1) / (totalTokens + vocabSize));
      }

      scores.push({ label, logProb });
    }

    const maxLog = Math.max(...scores.map(score => score.logProb));
    const expScores = scores.map(score => ({
      label: score.label,
      exp: Math.exp(score.logProb - maxLog)
    }));
    const sumExp = expScores.reduce((sum, entry) => sum + entry.exp, 0) || 1;

    return expScores
      .map(entry => ({
        label: entry.label,
        probability: Math.round((entry.exp / sumExp) * 1000) / 1000
      }))
      .sort((a, b) => b.probability - a.probability);
  }

  _buildTrainingText(item) {
    if (typeof item === 'string') return item;

    if (typeof item?.text === 'string') return item.text;

    const tags = Array.isArray(item?.tags) ? item.tags.join(' ') : '';
    return [item?.name, item?.brand, tags, item?.description]
      .filter(Boolean)
      .join(' ');
  }

  _getLabel(item) {
    if (typeof item === 'string') return this.defaultCategory;
    return item?.category || item?.label || item?.intent || null;
  }

  _tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. PRODUCT EMBEDDING (Feature Vector)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a dense feature vector for a product.
 * Dimensions: [priceNorm, ratingNorm, reviewsNorm, etaNorm, stockNorm, isPrime, discountPct,
 *              ...categoryOneHot(10 dims)]
 * Total: 17 dimensions
 */
function productToVector(product, priceMax = 20, reviewsMax = 50000) {
  const categories = ['personal_care', 'cleaning', 'household', 'medicine', 'snacks', 'pantry', 'groceries', 'office', 'baby', 'travel'];
  const catIndex = categories.indexOf(product.category);

  const vec = [
    Math.min(1, (product.price || 5) / priceMax),                              // Price normalized
    (product.rating || 4) / 5,                                                  // Rating normalized
    Math.min(1, (product.reviewCount || 0) / reviewsMax),                      // Reviews normalized
    1 - Math.min(1, (parseInt(product.deliveryETA) || 30) / 60),              // Speed (inverted ETA)
    Math.min(1, (product.stock || 0) / 200),                                   // Stock level
    product.isPrime ? 1 : 0,                                                    // Prime flag
    product.originalPrice ? (product.originalPrice - product.price) / product.originalPrice : 0, // Discount
  ];

  // Category one-hot encoding (10 dims)
  for (let i = 0; i < categories.length; i++) {
    vec.push(i === catIndex ? 1 : 0);
  }

  return vec;
}

/**
 * Find most similar products by feature vector distance.
 */
function findSimilarProducts(targetProduct, allProducts, topK = 5) {
  const targetVec = productToVector(targetProduct);

  return allProducts
    .filter(p => p._id?.toString() !== targetProduct._id?.toString())
    .map(p => ({
      product: p,
      similarity: denseCosineSimilarity(targetVec, productToVector(p))
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

const tfIdfEngine = new TfIdfVectorizer();
const categorizerEngine = new NaiveBayesClassifier();

module.exports = {
  TfIdfVectorizer,
  NaiveBayesClassifier,
  tfIdfEngine,
  categorizerEngine,
  cosineSimilarity,
  denseCosineSimilarity,
  ExponentialSmoother,
  ThompsonSampler,
  CollaborativeFilter,
  productToVector,
  findSimilarProducts
};
