const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['restock', 'sale', 'order', 'system'], default: 'restock' },
  title: String,
  message: String,
  triggerTime: Date,
  status: { type: String, enum: ['active', 'dismissed', 'acted'], default: 'active' },
  relatedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RestockItem' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
