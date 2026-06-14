const jwt = require('jsonwebtoken');

function authOptional(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'restock-iq-secret-key');
  } catch (_) {}
  next();
}

function authRequired(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'restock-iq-secret-key');
    next();
  } catch (_) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authOptional, authRequired };
