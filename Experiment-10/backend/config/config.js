// src/config/config.js
// Central configuration — reads from environment variables
require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_never_use_in_prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  rateLimit: {
    // Auth endpoints — strict
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10,                   // 10 attempts per window
      message: 'Too many login attempts. Please try again after 15 minutes.',
    },
    // General API endpoints
    api: {
      windowMs: 1 * 60 * 1000,  // 1 minute
      max: 60,                   // 60 requests per minute
      message: 'Too many requests. Please slow down.',
    },
  },
};

module.exports = config;