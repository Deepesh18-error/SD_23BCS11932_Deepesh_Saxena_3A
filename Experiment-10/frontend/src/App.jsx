// src/App.jsx
// Root component — defines routes, applies Navbar, handles redirects

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Navbar          from './components/Navbar.jsx';
import ProtectedRoute  from './components/Protectedroute.jsx';
import LoginPage       from './pages/Loginpage.jsx';
import ProductsPage    from './pages/Productspage.jsx';
import { useAuth }     from './context/Authcontext.jsx';

const App = () => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar only shows when authenticated */}
      {isAuthenticated && <Navbar />}

      <main style={{ flex: 1 }}>
        <Routes>
          {/* ── Public routes ── */}
          <Route
            path="/login"
            element={
              // If already logged in, skip login page and go to products
              isAuthenticated && !isLoading
                ? <Navigate to="/products" replace />
                : <LoginPage />
            }
          />

          {/* ── Protected routes — require auth ── */}
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            }
          />

          {/* ── Default redirect ── */}
          <Route path="/" element={<Navigate to="/products" replace />} />

          {/* ── 404 fallback ── */}
          <Route
            path="*"
            element={
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '60vh', gap: '12px',
                fontFamily: 'var(--font-display)',
              }}>
                <span style={{ fontSize: '4rem' }}>404</span>
                <p style={{ color: 'var(--text-secondary)' }}>Page not found.</p>
                <a href="/products" style={{
                  color: 'var(--accent-light)', fontWeight: 600, fontSize: '0.9rem',
                }}>
                  ← Back to Products
                </a>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
