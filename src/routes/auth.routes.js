const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const validate = require('../middlewares/validate');
const { loginSchema } = require('../validators/schemas');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Stricter limit on login to slow down password-guessing attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.nodeEnv === 'test',
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes' },
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);

module.exports = router;
