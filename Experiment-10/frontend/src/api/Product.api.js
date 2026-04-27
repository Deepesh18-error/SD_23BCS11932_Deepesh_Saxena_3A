// src/api/product.api.js
// All product-related API calls

import axiosInstance from './Axiosinstance.js';

/**
 * getProducts
 * Calls: GET /api/v1/products
 * PROTECTED — requires authentication (handled automatically by axiosInstance)
 *
 * @param {Object} filters
 * @param {string}  [filters.categoryId]  — filter by category ID
 * @param {string}  [filters.brand]       — filter by brand name
 * @param {number}  [filters.minPrice]    — minimum price
 * @param {number}  [filters.maxPrice]    — maximum price
 * @param {boolean} [filters.inStock]     — show only in-stock items
 * @param {string}  [filters.sortBy]      — 'price_asc' | 'price_desc' | 'rating' | 'new'
 * @param {number}  [filters.page]        — page number (default: 1)
 * @param {number}  [filters.limit]       — items per page (default: 10, max: 50)
 *
 * @returns {{ data: Product[], pagination: Pagination, meta: Meta }}
 */
export const getProducts = async (filters = {}) => {
  // Build query string — only include defined, non-empty values
  const params = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      params[key] = value;
    }
  });

  const response = await axiosInstance.get('/products', { params });
  // Returns { success, data: [], pagination: {}, meta: {} }
  return response.data;
};

/**
 * getProductById
 * Calls: GET /api/v1/products/:id
 * PROTECTED — requires authentication
 *
 * @param {string} id — product ID
 * @returns {Product}
 */
export const getProductById = async (id) => {
  const response = await axiosInstance.get(`/products/${id}`);
  return response.data.data;
};
