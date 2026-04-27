// src/middleware/validate.middleware.js
// Simple request body validation helpers (no external lib needed)

/**
 * validateLoginBody — checks login request has email + password
 */
const validateLoginBody = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || email.trim() === '') {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else {
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push({ field: 'email', message: 'Must be a valid email address.' });
    }
  }

  if (!password || typeof password !== 'string' || password.trim() === '') {
    errors.push({ field: 'password', message: 'Password is required.' });
  } else if (password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters.' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: errors,
      },
    });
  }

  // Sanitise
  req.body.email = email.trim().toLowerCase();
  next();
};

module.exports = { validateLoginBody };