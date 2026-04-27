// src/middleware/auth.middleware.js
// Validates JWT on protected routes

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { findById } = require('../data/user');

/**
 * protect — middleware that requires a valid JWT
 * Attaches decoded user to req.user
 */
const protect = (req, res, next) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Access denied. No token provided. Please login first.',
      },
    });
  }

  const token = authHeader.split(' ')[1];

  // 2. Verify the token
  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    // 3. Check user still exists (in a real app, this prevents deleted-user access)
    const user = findById(decoded.sub);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The user belonging to this token no longer exists.',
        },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been deactivated. Contact support.',
        },
      });
    }

    // 4. Attach user to request object (without passwordHash)
    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please login again.',
        },
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Invalid token. Please login again.',
        },
      });
    }
    // Any other JWT error
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_ERROR',
        message: 'Token verification failed.',
      },
    });
  }
};

/**
 * restrictTo — limits access to specific roles
 * Usage: restrictTo('ADMIN', 'SELLER')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. This route is restricted to: ${roles.join(', ')}.`,
        },
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };