const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['intent', 'restock', 'substitution'] },
  accepted: Boolean,
  reason: String,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  intentId: { type: mongoose.Schema.Types.ObjectId, ref: 'IntentRequest' },
  restockItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RestockItem' }
}, { timestamps: true });

module.exports = mongoose.model('FeedbackEvent', feedbackSchema);
