// server.js
// ─── Main Entry Point ─────────────────────────────────────────────────────────
// E-Commerce API Server
// Implements:
//   POST /api/v1/auth/login     → Authenticate & receive JWT
//   POST /api/v1/auth/refresh   → Renew access token
//   GET  /api/v1/auth/me        → Get logged-in user profile (protected)
//   GET  /api/v1/products       → List products with filters (protected)
//   GET  /api/v1/products/:id   → Get single product by ID (protected)

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config/config');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS — allow requests from the React frontend
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
}));

// Parse JSON request bodies (with size limit for security)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// HTTP request logger (dev format shows method, url, status, response time)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
// Simple endpoint to verify the server is running
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'OK',
      service: 'E-Commerce API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
    },
  });
});

// ─── API Info ─────────────────────────────────────────────────────────────────
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'E-Commerce REST API',
      version: 'v1',
      endpoints: {
        auth: {
          login:   'POST /api/v1/auth/login',
          refresh: 'POST /api/v1/auth/refresh',
          me:      'GET  /api/v1/auth/me       (protected)',
        },
        products: {
          list:   'GET /api/v1/products        (protected)',
          detail: 'GET /api/v1/products/:id   (protected)',
        },
      },
      testCredentials: {
        customer: { email: 'customer@demo.com', password: 'customer123' },
        seller:   { email: 'seller@demo.com',   password: 'seller123'   },
        admin:    { email: 'admin@demo.com',     password: 'admin123'    },
      },
    },
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',     authRoutes);
app.use('/api/v1/products', productRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);       // 404 for any unmatched route
app.use(errorHandler);   // Global error handler

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = config.port;

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║         E-Commerce API Server Running            ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Port    : ${PORT}                                   ║`);
  console.log(`║  Health  : http://localhost:${PORT}/health            ║`);
  console.log(`║  API     : http://localhost:${PORT}/api/v1            ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Test credentials:                               ║');
  console.log('║    customer@demo.com  /  customer123             ║');
  console.log('║    seller@demo.com    /  seller123               ║');
  console.log('║    admin@demo.com     /  admin123                ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
