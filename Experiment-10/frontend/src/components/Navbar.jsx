// src/components/Navbar.jsx
// Top navigation bar — shows user info and logout button

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext.jsx';

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border)',
    padding: '0 24px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: '1.4rem',
    color: 'var(--text-primary)',
    textDecoration: 'none',
    letterSpacing: '-0.03em',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoAccent: {
    color: 'var(--accent)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '100px',
    padding: '6px 14px 6px 8px',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '0.75rem',
    color: '#fff',
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  roleBadge: {
    fontSize: '0.65rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--accent-light)',
    background: 'var(--accent-subtle)',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '0.83rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'var(--transition)',
    fontFamily: 'var(--font-body)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
};

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav style={styles.nav}>
      {/* Logo */}
      <Link to="/products" style={styles.logo}>
        <span style={{ fontSize: '1.2rem' }}>🛒</span>
        Shop<span style={styles.logoAccent}>Wave</span>
      </Link>

      {/* Right side */}
      <div style={styles.right}>
        {isAuthenticated && user && (
          <>
            {/* User info badge */}
            <div style={styles.userBadge}>
              <div style={styles.avatar}>{getInitials(user.name)}</div>
              <div>
                <div style={styles.userName}>{user.name}</div>
              </div>
              <span style={styles.roleBadge}>{user.role}</span>
            </div>

            {/* Logout */}
            <button
              style={styles.logoutBtn}
              onClick={handleLogout}
              disabled={loggingOut}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                e.currentTarget.style.color = '#fca5a5';
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
