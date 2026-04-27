// src/controllers/product.controller.js
// Handles: GET /api/v1/products        (protected — requires auth)
//          GET /api/v1/products/:id    (protected — requires auth)

const { findAll, findById } = require('../data/product');

/**
 * GET /api/v1/products
 *
 * PROTECTED ROUTE — JWT required
 *
 * Query Parameters (all optional):
 *   categoryId  — filter by category ID
 *   brand       — filter by brand name (case-insensitive)
 *   minPrice    — minimum price (inclusive)
 *   maxPrice    — maximum price (inclusive)
 *   inStock     — 'true' | 'false'  show only in-stock or out-of-stock
 *   sortBy      — 'price_asc' | 'price_desc' | 'rating' | 'new' (default)
 *   page        — page number (default: 1)
 *   limit       — items per page (default: 10, max: 50)
 *
 * Response 200:
 *  {
 *    success: true,
 *    data: Product[],
 *    pagination: { total, page, limit, totalPages, hasNextPage, hasPrevPage },
 *    meta: { requestedBy, timestamp }
 *  }
 *
 * Flow:
 *  1. Extract and parse query params
 *  2. Query in-memory product store with filters + sorting + pagination
 *  3. Return results with pagination metadata
 */
const getAllProducts = (req, res, next) => {
  try {
    const {
      categoryId,
      brand,
      minPrice,
      maxPrice,
      inStock,
      sortBy = 'new',
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter object — only include defined params
    const filters = {
      ...(categoryId  && { categoryId }),
      ...(brand       && { brand }),
      ...(minPrice    && { minPrice }),
      ...(maxPrice    && { maxPrice }),
      ...(inStock !== undefined && inStock !== '' && { inStock }),
      sortBy,
      page,
      limit,
    };

    // Query data store
    const { data: products, pagination } = findAll(filters);

    // Log who made the request (useful for audit trails)
    console.log(
      `📦 Products fetched by ${req.user.email} | filters: ${JSON.stringify(filters)} | results: ${pagination.total}`
    );

    return res.status(200).json({
      success: true,
      data: products,
      pagination,
      meta: {
        requestedBy: req.user.id,
        timestamp: new Date().toISOString(),
        filtersApplied: filters,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/products/:id
 *
 * PROTECTED ROUTE — JWT required
 *
 * Returns a single product by ID.
 *
 * Response 200: { success: true, data: Product }
 * Response 404: { success: false, error: { code: 'PRODUCT_NOT_FOUND' } }
 */
const getProductById = (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ID format (simple check)
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Product ID is required and must be a non-empty string.',
        },
      });
    }

    const product = findById(id.trim());

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Product with ID "${id}" was not found.`,
        },
      });
    }

    console.log(`📦 Product "${product.name}" fetched by ${req.user.email}`);

    return res.status(200).json({
      success: true,
      data: product,
      meta: {
        requestedBy: req.user.id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllProducts, getProductById };