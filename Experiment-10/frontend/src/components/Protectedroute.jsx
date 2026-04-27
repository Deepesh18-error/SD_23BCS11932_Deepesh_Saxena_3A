// src/components/ProtectedRoute.jsx
// Wraps routes that require authentication
// If user is not logged in → redirect to /login

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/Authcontext.jsx';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // While restoring session from localStorage — show a loading screen
  // This prevents a flash redirect to /login on page refresh
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        background: 'var(--bg-primary)',
      }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(108,99,255,0.2)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
          Restoring session…
        </p>
      </div>
    );
  }

  // Not authenticated — redirect to login, preserving the intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated — render the child route
  return children;
};

export default ProtectedRoute;
