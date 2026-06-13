const mongoose = require('mongoose');

const intentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rawText: String,
  parsedIntent: String,
  category: String,
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  quantity: Number,
  confidence: { type: Number, default: 0.85 },
  occasion: String,
  recommendedProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });

module.exports = mongoose.model('IntentRequest', intentSchema);
