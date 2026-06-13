const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, preferences: user.preferences, household: user.household }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, preferences: user.preferences, household: user.household, addresses: user.addresses }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authRequired, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

router.put('/preferences', authRequired, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, { $set: req.body }, { new: true }).select('-password');
  res.json(user);
});

router.put('/household', authRequired, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, { household: req.body }, { new: true }).select('-password');
  res.json(user);
});

router.put('/budget', authRequired, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, { monthlyBudget: req.body.monthlyBudget }, { new: true }).select('-password');
  res.json(user);
});

module.exports = router;
