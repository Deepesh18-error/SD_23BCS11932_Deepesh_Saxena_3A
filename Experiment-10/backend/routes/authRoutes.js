// src/routes/auth.routes.js
// All authentication-related routes

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { login, refresh, getMe } = require('../controller/authController');
const { protect } = require('../middleware/auth_middleware');
const { validateLoginBody } = require('../middleware/validate_middleware');
const config = require('../config/config');

// Rate limiter specific to auth routes (strict — prevents brute force)
const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: config.rateLimit.auth.message,
    },
  },
  standardHeaders: true,  // Return X-RateLimit-* headers
  legacyHeaders: false,
});

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 * Public — no JWT required
 * Rate limited: 10 requests / 15 min
 * Validates body before hitting controller
 */
router.post(
  '/login',
  authRateLimiter,       // 1. Rate limit first
  validateLoginBody,     // 2. Validate request body
  login                  // 3. Process login
);

/**
 * POST /api/v1/auth/refresh
 * Public — used to get a new access token using a refresh token
 * Rate limited
 */
router.post('/refresh', authRateLimiter, refresh);

/**
 * GET /api/v1/auth/me
 * Protected — must send valid JWT in Authorization header
 * Returns the currently authenticated user's profile
 */
router.get('/me', protect, getMe);

module.exports = router;