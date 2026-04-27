

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { findByEmail, findById, toSafeUser } = require('../data/user');

// ─── Token helpers ────────────────────────────────────────────────────────────

/**
 * generateAccessToken
 * Creates a short-lived JWT (15 minutes by default)
 * Payload contains the user's ID, email, and role
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,       // subject = user ID (JWT standard claim)
      email: user.email,
      role: user.role,
      name: user.name,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

/**
 * generateRefreshToken
 * Creates a longer-lived JWT (7 days by default)
 * Only contains user ID — minimises data in the token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 *
 * Request body: { email: string, password: string }
 *
 * Flow:
 *  1. Validate email + password are present (done by validate middleware)
 *  2. Find user by email in the data store
 *  3. Compare submitted password with stored bcrypt hash
 *  4. Generate access token + refresh token
 *  5. Return tokens and safe user profile
 *
 * Response 200:
 *  { success, data: { accessToken, refreshToken, expiresIn, user } }
 *
 * Response 401:
 *  { success: false, error: { code: 'INVALID_CREDENTIALS', message } }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ── Step 1: Find user ──────────────────────────────────────────────
    const user = findByEmail(email);

    // IMPORTANT: We always run bcrypt.compare even if user not found.
    // This prevents timing attacks where an attacker could detect whether
    // an email exists by comparing response times.
    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const hashToCompare = user ? user.passwordHash : dummyHash;

    // ── Step 2: Compare password ───────────────────────────────────────
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);

    // ── Step 3: Reject if user not found OR password wrong ─────────────
    // Single error message — don't reveal WHICH one is wrong (security)
    if (!user || !isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password. Please check your credentials and try again.',
        },
      });
    }

    // ── Step 4: Check account is active ───────────────────────────────
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled. Please contact support.',
        },
      });
    }

    // ── Step 5: Generate tokens ────────────────────────────────────────
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    // In a real app: store refreshToken in DB (refresh_tokens table)
    // with userId, expiry, revoked flag, device info
    // Here we skip that for simplicity

    // ── Step 6: Return response ────────────────────────────────────────
    console.log(`✅ Login success: ${user.email} (${user.role})`);

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 900, // 15 minutes in seconds
        user: toSafeUser(user),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err); // Pass to global error handler
  }
};

/**
 * POST /api/v1/auth/refresh
 *
 * Request body: { refreshToken: string }
 *
 * Returns a new accessToken without requiring the user to login again.
 */
const refresh = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required.',
        },
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.secret);
    } catch {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is invalid or expired. Please login again.',
        },
      });
    }

    // Ensure it's a refresh token (not an access token being reused)
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Invalid token type.',
        },
      });
    }

    // Get user
    const user = findById(decoded.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or account disabled.',
        },
      });
    }

    // Issue new access token
    const newAccessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        tokenType: 'Bearer',
        expiresIn: 900,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 * Protected — requires valid JWT
 * Returns the currently logged-in user's profile
 */
const getMe = (req, res) => {
  // req.user is set by the protect middleware
  return res.status(200).json({
    success: true,
    data: req.user,
    meta: { timestamp: new Date().toISOString() },
  });
};

module.exports = { login, refresh, getMe };