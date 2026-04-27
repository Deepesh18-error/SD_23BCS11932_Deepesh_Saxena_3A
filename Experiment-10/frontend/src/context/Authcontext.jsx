// src/context/AuthContext.jsx
// Global auth state — provides login/logout and user to the whole app
// Persists tokens in localStorage so user stays logged in on refresh

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, getMe } from '../api/Auth.api.js';

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);   // true while restoring session
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ── Restore session from localStorage on app start ────────────────────
  // If a valid access token exists, fetch the user profile to verify it
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('accessToken');
      const cachedUser = localStorage.getItem('user');

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Try to get fresh user data from server to confirm token is still valid
        // The axiosInstance will auto-attach the token from localStorage
        const freshUser = await getMe();
        setUser(freshUser);
        setIsAuthenticated(true);

        // Update cached user data
        localStorage.setItem('user', JSON.stringify(freshUser));
      } catch {
        // Token invalid or expired and refresh failed — clear storage
        if (cachedUser) {
          // If getMe fails, try showing cached user briefly
          // (axiosInstance interceptor will attempt refresh automatically)
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ── login ─────────────────────────────────────────────────────────────
  /**
   * login — call the API, store tokens, update state
   *
   * @param {string} email
   * @param {string} password
   * @returns {Object} user object
   * @throws Error with message if login fails
   */
  const login = useCallback(async (email, password) => {
    // loginUser calls POST /api/v1/auth/login
    const authData = await loginUser(email, password);

    // Store tokens in localStorage for persistence across refreshes
    localStorage.setItem('accessToken',  authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);
    localStorage.setItem('user',         JSON.stringify(authData.user));

    // Update React state
    setUser(authData.user);
    setIsAuthenticated(true);

    return authData.user;
  }, []);

  // ── logout ────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    // Clear all stored auth data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Reset state
    setUser(null);
    setIsAuthenticated(false);

    // In a real app: also call POST /api/v1/auth/logout to revoke refresh token on server
  }, []);

  // ── Context value ─────────────────────────────────────────────────────
  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useAuth — consume auth context in any component
 *
 * Usage:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
};
