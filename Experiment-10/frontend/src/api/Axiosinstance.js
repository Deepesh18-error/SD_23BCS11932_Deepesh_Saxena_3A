// src/api/axiosInstance.js
// Central Axios instance — handles:
//   • Base URL configuration
//   • Automatic JWT attachment to every request
//   • Token refresh on 401 (access token expired)
//   • Automatic logout on refresh failure

import axios from 'axios';

// ─── Create the Axios instance ────────────────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: '/api/v1',           // Proxied to http://localhost:5000 by Vite
  timeout: 10000,               // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Runs BEFORE every outgoing request
// Automatically attaches the JWT access token from localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add a unique request ID for tracing (helps with debugging)
    config.headers['X-Request-ID'] = crypto.randomUUID();

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
// Runs AFTER every response comes back
// Handles silent token refresh when access token expires (401 TOKEN_EXPIRED)

let isRefreshing = false;          // Lock to prevent multiple refresh calls
let failedQueue = [];              // Queue of requests that failed while refreshing

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  // Success — just return the response data
  (response) => response,

  // Error — handle 401 (token expired) with silent refresh
  async (error) => {
    const originalRequest = error.config;
    const errorCode = error.response?.data?.error?.code;

    // ── Handle token expiry ────────────────────────────────────────────
    if (
      error.response?.status === 401 &&
      errorCode === 'TOKEN_EXPIRED' &&
      !originalRequest._retried   // prevent infinite retry loop
    ) {
      // If already refreshing, queue this request until refresh completes
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retried = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token — user must login again
        isRefreshing = false;
        clearAuthStorage();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint (without going through our interceptor to avoid loop)
        const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });

        const newAccessToken = data.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);

        // Update default header for future requests
        axiosInstance.defaults.headers['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // Unblock queued requests
        processQueue(null, newAccessToken);

        // Retry the original failed request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed — force logout
        processQueue(refreshError, null);
        clearAuthStorage();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Handle other auth errors ───────────────────────────────────────
    if (
      error.response?.status === 401 &&
      (errorCode === 'TOKEN_INVALID' || errorCode === 'MISSING_TOKEN')
    ) {
      clearAuthStorage();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// ─── Helper ──────────────────────────────────────────────────────────────────
const clearAuthStorage = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export default axiosInstance;