const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  brand: String,
  size: String,
  price: { type: Number, required: true },
  originalPrice: Number,
  stock: { type: Number, default: 100 },
  deliveryETA: { type: String, default: '30 mins' },
  rating: { type: Number, default: 4.5 },
  reviewCount: { type: Number, default: 0 },
  image: String,
  description: String,
  tags: [String],
  isPrime: { type: Boolean, default: true },
  avgLifespanDays: { type: Number, default: 30 }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
