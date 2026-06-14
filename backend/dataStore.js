/**
 * JSON-Based Data Store
 * 
 * Replaces MongoDB/Mongoose with in-memory data loaded from restock_iq_dataset_150.json.
 * Provides Mongoose-like query methods for compatibility with existing routes.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ─── Load Dataset ────────────────────────────────────────────────────────────

const datasetPath = path.join(__dirname, '..', 'restock_iq_dataset_150.json');
let rawDataset = [];
try {
  rawDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  console.log(`[DataStore] Loaded ${rawDataset.length} products from dataset`);
} catch (err) {
  console.error('[DataStore] Failed to load dataset:', err.message);
}

// ─── Transform Dataset Products to App Schema ────────────────────────────────

function transformProduct(item) {
  return {
    _id: item.product_id,
    name: item.name,
    brand: item.brand,
    category: item.category,
    subcategory: item.subcategory,
    size: `${item.variant.size} ${item.variant.size_unit}`,
    price: item.pricing.selling_price,
    originalPrice: item.pricing.mrp,
    pricePerUnit: item.pricing.price_per_unit,
    unitLabel: item.pricing.unit_label,
    stock: 100,
    deliveryETA: `${item.amazon_fulfillment.avg_delivery_days * 24 * 60} mins`,
    rating: item.rating,
    reviewCount: item.review_count,
    image: item.image_url,
    description: `${item.name} - ${item.brand} ${item.subcategory}`,
    tags: item.tags || [],
    isPrime: item.amazon_fulfillment.prime_eligible,
    avgLifespanDays: item.consumption.avg_lifespan_days_per_person,
    // Extra fields from dataset
    variant: item.variant,
    consumption: item.consumption,
    household: item.household,
    fulfillment: item.amazon_fulfillment,
    sustainability: item.sustainability,
    mlSignals: item.ml_signals,
    subscribeAndSave: item.amazon_fulfillment.subscribe_and_save,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

const products = rawDataset.map(transformProduct);

// ─── In-Memory Collections ───────────────────────────────────────────────────

const collections = {
  products: [...products],
  users: [],
  carts: [],
  orders: [],
  restockItems: [],
  notifications: [],
  feedbackEvents: [],
  intentRequests: []
};

// ─── Query Helper: Matches a filter object against a document ────────────────

function matchesFilter(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or') {
      const orMatches = value.some(subFilter => matchesFilter(doc, subFilter));
      if (!orMatches) return false;
      continue;
    }
    if (key === '$and') {
      const andMatches = value.every(subFilter => matchesFilter(doc, subFilter));
      if (!andMatches) return false;
      continue;
    }

    // Nested key access (e.g., 'items.productId')
    const docValue = getNestedValue(doc, key);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // MongoDB operators
      if ('$regex' in value) {
        const regex = new RegExp(value.$regex, value.$options || '');
        if (Array.isArray(docValue)) {
          if (!docValue.some(v => regex.test(String(v)))) return false;
        } else {
          if (!regex.test(String(docValue || ''))) return false;
        }
        continue;
      }
      if ('$gt' in value) {
        if (!(docValue > value.$gt)) return false;
        continue;
      }
      if ('$gte' in value) {
        if (!(docValue >= value.$gte)) return false;
        continue;
      }
      if ('$lt' in value) {
        if (!(docValue < value.$lt)) return false;
        continue;
      }
      if ('$lte' in value) {
        if (!(docValue <= value.$lte)) return false;
        continue;
      }
      if ('$in' in value) {
        if (Array.isArray(docValue)) {
          if (!docValue.some(v => value.$in.includes(v))) return false;
        } else {
          if (!value.$in.includes(docValue)) return false;
        }
        continue;
      }
      if ('$nin' in value) {
        if (Array.isArray(docValue)) {
          if (docValue.some(v => value.$nin.includes(v))) return false;
        } else {
          if (value.$nin.includes(docValue)) return false;
        }
        continue;
      }
      if ('$ne' in value) {
        if (docValue === value.$ne) return false;
        continue;
      }
    }

    // Direct equality
    if (docValue !== value) return false;
  }
  return true;
}

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

// ─── Collection Class (Mongoose-like interface) ──────────────────────────────

class Collection {
  constructor(name, data) {
    this.name = name;
    this.data = data;
  }

  // Chainable query builder
  find(filter = {}) {
    return new Query(this.data, filter);
  }

  findOne(filter = {}) {
    const results = this.data.filter(doc => matchesFilter(doc, filter));
    return new SingleQuery(results[0] || null);
  }

  findById(id) {
    const doc = this.data.find(d => String(d._id) === String(id));
    return new SingleQuery(doc || null);
  }

  async create(docData) {
    const doc = {
      _id: docData._id || uuidv4(),
      ...docData,
      createdAt: docData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.push(doc);
    return doc;
  }

  async insertMany(docs) {
    const inserted = docs.map(d => ({
      _id: d._id || uuidv4(),
      ...d,
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    this.data.push(...inserted);
    return inserted;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const idx = this.data.findIndex(d => String(d._id) === String(id));
    if (idx === -1) return null;

    if (update.$set) {
      Object.assign(this.data[idx], update.$set);
    } else {
      Object.assign(this.data[idx], update);
    }
    this.data[idx].updatedAt = new Date().toISOString();
    return this.data[idx];
  }

  async findByIdAndDelete(id) {
    const idx = this.data.findIndex(d => String(d._id) === String(id));
    if (idx === -1) return null;
    const [removed] = this.data.splice(idx, 1);
    return removed;
  }

  async deleteMany(filter = {}) {
    if (Object.keys(filter).length === 0) {
      const count = this.data.length;
      this.data.length = 0;
      return { deletedCount: count };
    }
    const before = this.data.length;
    const remaining = this.data.filter(doc => !matchesFilter(doc, filter));
    this.data.length = 0;
    this.data.push(...remaining);
    return { deletedCount: before - this.data.length };
  }

  async distinct(field) {
    const values = new Set();
    for (const doc of this.data) {
      const val = getNestedValue(doc, field);
      if (val != null) values.add(val);
    }
    return [...values];
  }

  async countDocuments(filter = {}) {
    return this.data.filter(doc => matchesFilter(doc, filter)).length;
  }
}

// ─── Query Builder (chainable) ───────────────────────────────────────────────

class Query {
  constructor(data, filter = {}) {
    this._data = data;
    this._filter = filter;
    this._limit = null;
    this._sort = null;
    this._select = null;
    this._populateFields = [];
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  populate(field, selectFields) {
    this._populateFields.push({ field, selectFields });
    return this;
  }

  lean() {
    return this; // Already plain objects
  }

  // Execute the query (thenable)
  async then(resolve, reject) {
    try {
      let results = this._data.filter(doc => matchesFilter(doc, this._filter));

      if (this._sort) {
        const sortEntries = Object.entries(this._sort);
        results.sort((a, b) => {
          for (const [key, dir] of sortEntries) {
            const aVal = getNestedValue(a, key);
            const bVal = getNestedValue(b, key);
            if (aVal < bVal) return dir === -1 ? 1 : -1;
            if (aVal > bVal) return dir === -1 ? -1 : 1;
          }
          return 0;
        });
      }

      if (this._limit) {
        results = results.slice(0, this._limit);
      }

      // Populate: resolve references
      if (this._populateFields.length > 0) {
        results = results.map(doc => populateDoc(doc, this._populateFields));
      }

      resolve(results);
    } catch (err) {
      if (reject) reject(err);
    }
  }
}

class SingleQuery {
  constructor(doc) {
    this._doc = doc;
    this._populateFields = [];
    this._select = null;
  }

  populate(field, selectFields) {
    this._populateFields.push({ field, selectFields });
    return this;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  lean() {
    return this;
  }

  async then(resolve, reject) {
    try {
      let doc = this._doc;
      if (doc && this._populateFields.length > 0) {
        doc = populateDoc(doc, this._populateFields);
      }
      if (doc && this._select && this._select.startsWith('-')) {
        const excludeField = this._select.slice(1);
        doc = { ...doc };
        delete doc[excludeField];
      }
      resolve(doc);
    } catch (err) {
      if (reject) reject(err);
    }
  }
}

// ─── Populate Helper ─────────────────────────────────────────────────────────

function populateDoc(doc, populateFields) {
  const populated = { ...doc };
  for (const { field, selectFields } of populateFields) {
    const refId = populated[field];
    if (!refId) continue;

    // Determine which collection to look in based on field name
    let refCollection = null;
    if (field === 'productId' || field === 'products') {
      refCollection = collections.products;
    } else if (field === 'userId') {
      refCollection = collections.users;
    }

    if (refCollection && refId) {
      const refDoc = refCollection.find(d => String(d._id) === String(refId));
      if (refDoc) {
        if (selectFields) {
          const fields = selectFields.split(' ').filter(f => !f.startsWith('-'));
          const exclude = selectFields.split(' ').filter(f => f.startsWith('-')).map(f => f.slice(1));
          if (fields.length > 0 && fields[0] !== '') {
            const filtered = {};
            fields.forEach(f => { filtered[f] = refDoc[f]; });
            filtered._id = refDoc._id;
            populated[field] = filtered;
          } else if (exclude.length > 0) {
            const filtered = { ...refDoc };
            exclude.forEach(f => delete filtered[f]);
            populated[field] = filtered;
          } else {
            populated[field] = refDoc;
          }
        } else {
          populated[field] = refDoc;
        }
      }
    }
  }

  // Also add toObject method for compatibility
  populated.toObject = () => populated;
  return populated;
}

// ─── Create Collection Instances ─────────────────────────────────────────────

const Product = new Collection('products', collections.products);
const User = new Collection('users', collections.users);
const Cart = new Collection('carts', collections.carts);
const Order = new Collection('orders', collections.orders);
const RestockItem = new Collection('restockItems', collections.restockItems);
const Notification = new Collection('notifications', collections.notifications);
const FeedbackEvent = new Collection('feedbackEvents', collections.feedbackEvents);
const IntentRequest = new Collection('intentRequests', collections.intentRequests);

// ─── Seed Default Users ──────────────────────────────────────────────────────

const bcrypt = require('bcryptjs');

async function seedDefaultUsers() {
  if (collections.users.length > 0) return;

  const adminPw = bcrypt.hashSync('admin123', 10);
  const userPw = bcrypt.hashSync('test123', 10);

  collections.users.push(
    {
      _id: 'user-admin-001',
      name: 'Admin User',
      email: 'admin@amazon.com',
      password: adminPw,
      preferences: { savedBrands: ['Dove', 'Colgate', 'Nivea'], dietary: [], allergies: [], budget: 200, deliveryDefault: 'express' },
      household: { size: 4, usageLevel: 'high' },
      monthlyBudget: 200,
      addresses: [{ label: 'Home', street: '123 Admin St', city: 'Mumbai', state: 'MH', zip: '400001', isDefault: true }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'user-test-001',
      name: 'Test User',
      email: 'user@test.com',
      password: userPw,
      preferences: { savedBrands: ['Sunsilk', 'Pears', 'Garnier'], dietary: [], allergies: [], budget: 100, deliveryDefault: 'express' },
      household: { size: 2, usageLevel: 'medium' },
      monthlyBudget: 150,
      addresses: [{ label: 'Home', street: '456 User Ave', city: 'Delhi', state: 'DL', zip: '110001', isDefault: true }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  );
  console.log('[DataStore] Seeded default users (admin@amazon.com/admin123, user@test.com/test123)');
}

// Auto-seed on load
seedDefaultUsers();

// ─── Export ──────────────────────────────────────────────────────────────────

module.exports = {
  Product,
  User,
  Cart,
  Order,
  RestockItem,
  Notification,
  FeedbackEvent,
  IntentRequest,
  collections,
  rawDataset
};
