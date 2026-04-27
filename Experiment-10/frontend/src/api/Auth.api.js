// src/api/auth.api.js
// All auth-related API calls
// These functions map 1:1 to backend API endpoints

import axiosInstance from './Axiosinstance.js';

/**
 * loginUser
 * Calls: POST /api/v1/auth/login
 *
 * @param {string} email
 * @param {string} password
 * @returns {{ accessToken, refreshToken, tokenType, expiresIn, user }}
 * @throws AxiosError with error.response.data.error containing { code, message, details }
 */
export const loginUser = async (email, password) => {
  const response = await axiosInstance.post('/auth/login', { email, password });
  // response.data = { success: true, data: { accessToken, refreshToken, ... } }
  return response.data.data;
};

/**
 * refreshAccessToken
 * Calls: POST /api/v1/auth/refresh
 *
 * @param {string} refreshToken
 * @returns {{ accessToken, tokenType, expiresIn }}
 */
export const refreshAccessToken = async (refreshToken) => {
  const response = await axiosInstance.post('/auth/refresh', { refreshToken });
  return response.data.data;
};

/**
 * getMe
 * Calls: GET /api/v1/auth/me
 * Requires: valid JWT in Authorization header (set by axiosInstance interceptor)
 *
 * @returns {User} the currently authenticated user
 */
export const getMe = async () => {
  const response = await axiosInstance.get('/auth/me');
  return response.data.data;
};
