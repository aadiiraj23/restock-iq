const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    substitution: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    price: Number
  }],
  total: { type: Number, default: 0 },
  eta: String,
  status: { type: String, enum: ['active', 'checked_out'], default: 'active' },
  source: { type: String, enum: ['manual', 'intent', 'restock'], default: 'manual' },
  intentSummary: String
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
