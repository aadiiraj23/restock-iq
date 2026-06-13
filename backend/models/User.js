const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  addresses: [{
    label: String,
    street: String,
    city: String,
    state: String,
    zip: String,
    isDefault: { type: Boolean, default: false }
  }],
  preferences: {
    savedBrands: [String],
    dietary: [String],
    allergies: [String],
    budget: { type: Number, default: 100 },
    deliveryDefault: { type: String, default: 'express' }
  },
  household: {
    size: { type: Number, default: 1 },
    usageLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  },
  monthlyBudget: { type: Number, default: 150 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
