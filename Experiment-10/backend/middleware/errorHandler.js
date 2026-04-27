// src/middleware/errorHandler.js
// Global error handler — catches all unhandled errors

const errorHandler = (err, req, res, next) => {
  // Log the error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('─── ERROR ───────────────────────────────');
    console.error(`${req.method} ${req.originalUrl}`);
    console.error(err.stack || err.message);
    console.error('─────────────────────────────────────────');
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred. Please try again.';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
};

// 404 handler — for routes that don't exist
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found.`,
    },
  });
};

module.exports = { errorHandler, notFound };