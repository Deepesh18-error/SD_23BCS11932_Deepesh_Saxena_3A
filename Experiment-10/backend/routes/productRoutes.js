// src/routes/product.routes.js
// All product-related routes

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { getAllProducts, getProductById } = require('../controller/productController');
const { protect } = require('../middleware/auth_middleware');
const config = require('../config/config');

// General API rate limiter
const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: config.rateLimit.api.message,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/products
 * PROTECTED — JWT required (must be logged in)
 * Query params: categoryId, brand, minPrice, maxPrice, inStock, sortBy, page, limit
 */
router.get('/', apiRateLimiter, protect, getAllProducts);

/**
 * GET /api/v1/products/:id
 * PROTECTED — JWT required
 * Returns single product by ID
 */
router.get('/:id', apiRateLimiter, protect, getProductById);

module.exports = router;
