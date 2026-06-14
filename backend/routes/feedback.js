const express = require('express');
const { processFeedback } = require('../services/feedbackLearner');
const { recordBanditReward } = require('../services/mlModels');
const { authOptional } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/feedback
 * Record user feedback on recommendations and trigger learning.
 */
router.post('/', authOptional, async (req, res) => {
  try {
    const event = await processFeedback({
      userId: req.user?.id,
      ...req.body
    });

    // Update bandit model with reward signal
    if (req.body.productId) {
      const reward = req.body.accepted ? 1.0 : 0;
      recordBanditReward(req.body.productId, reward);
    }

    // If intent feedback, update bandit for all recommended products
    if (req.body.type === 'intent' && req.body.accepted && req.body.intentId) {
      try {
        const { IntentRequest } = require('../dataStore');
        const intent = await IntentRequest.findById(req.body.intentId);
        if (intent?.recommendedProductIds) {
          for (const pid of intent.recommendedProductIds) {
            recordBanditReward(pid.toString(), 0.5);
          }
        }
      } catch { /* non-critical */ }
    }

    res.status(201).json({ stored: true, feedback: event, mlUpdated: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to store feedback', details: err.message });
  }
});

module.exports = router;
