const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    quantity: Number,
    price: Number,
    image: String
  }],
  total: Number,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  deliverySlot: String,
  paymentMethod: String,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'paid' },
  fulfillmentStatus: { type: String, enum: ['processing', 'packed', 'shipped', 'delivered'], default: 'processing' },
  eta: String,
  trackingSteps: [{
    label: String,
    time: Date,
    completed: Boolean
  }]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
