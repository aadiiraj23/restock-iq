const express = require('express');
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch {
  bcrypt = require('bcryptjs');
}
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function buildHouseholdProfile(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    addresses: user.addresses || [],
    preferences: user.preferences || {},
    household: user.household || { size: 1, usageLevel: 'medium' },
    monthlyBudget: user.monthlyBudget ?? 150,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const token = signToken(user);
    const householdProfile = buildHouseholdProfile(user);

    res.status(201).json({
      token,
      householdProfile,
      user: householdProfile
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken(user);
    const householdProfile = buildHouseholdProfile(user);
    res.json({
      token,
      householdProfile,
      user: householdProfile
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ householdProfile: buildHouseholdProfile(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/preferences', authRequired, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { $set: req.body }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ householdProfile: buildHouseholdProfile(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/household', authRequired, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { household: req.body }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ householdProfile: buildHouseholdProfile(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/budget', authRequired, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { monthlyBudget: req.body.monthlyBudget }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ householdProfile: buildHouseholdProfile(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
