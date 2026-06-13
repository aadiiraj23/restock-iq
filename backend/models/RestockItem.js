const mongoose = require('mongoose');

const restockSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  purchaseDate: { type: Date, default: Date.now },
  quantity: { type: Number, default: 1 },
  expectedFinishDate: Date,
  daysRemaining: Number,
  urgency: { type: String, enum: ['safe', 'warning', 'danger'], default: 'safe' },
  confidence: { type: Number, default: 0.8 },
  category: String,
  isWishlist: { type: Boolean, default: false },
  feedbackHistory: [{
    type: { type: String, enum: ['finished_early', 'still_plenty', 'on_track'] },
    note: String,
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('RestockItem', restockSchema);
