// src/pages/LoginPage.jsx
// Login page — calls POST /api/v1/auth/login via AuthContext
// Shows:
//   • Email + Password inputs with inline validation
//   • Loading state during API call
//   • Error messages from server (invalid creds, rate limit, etc.)
//   • Redirect to /products on success
//   • Quick-fill demo credential buttons

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/Authcontext.jsx';

// ─── Inline styles ────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
  },
  glow: {
    position: 'fixed',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(108,99,255,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    position: 'relative',
    zIndex: 1,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    animation: 'fadeIn 0.4s ease',
  },
  header: {
    marginBottom: '32px',
    textAlign: 'center',
  },
  logoMark: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '1.5rem',
    boxShadow: '0 8px 24px rgba(108,99,255,0.4)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '8px',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '12px 16px 12px 42px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  fieldError: {
    fontSize: '0.78rem',
    color: 'var(--error)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  submitBtn: {
    marginTop: '6px',
    width: '100%',
    padding: '13px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    letterSpacing: '-0.01em',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    margin: '4px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'var(--border)',
  },
  demoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  demoLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginBottom: '2px',
  },
  demoButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  demoBtn: {
    padding: '9px 8px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'center',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
};

// Demo credentials for easy testing
const DEMO_CREDS = [
  { label: 'Customer', email: 'customer@demo.com', password: 'customer123', color: '#6c63ff' },
  { label: 'Seller',   email: 'seller@demo.com',   password: 'seller123',   color: '#22c55e' },
  { label: 'Admin',    email: 'admin@demo.com',     password: 'admin123',    color: '#f59e0b' },
];

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Where to redirect after login (if user was sent to /login from a protected route)
  const from = location.state?.from?.pathname || '/products';

  // Form state
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // UI state
  const [isLoading,  setIsLoading]  = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg,  setSuccessMsg]  = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateForm = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Enter a valid email address.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Handle submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setSuccessMsg('');

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // login() calls POST /api/v1/auth/login and stores tokens
      const user = await login(email.trim().toLowerCase(), password);
      setSuccessMsg(`Welcome back, ${user.name}! Redirecting…`);

      // Short delay so user can see success message
      setTimeout(() => navigate(from, { replace: true }), 800);
    } catch (err) {
      // Extract error message from Axios error
      const serverError = err.response?.data?.error;

      if (serverError?.code === 'VALIDATION_ERROR' && serverError.details) {
        // Map field-level errors from server
        const mapped = {};
        serverError.details.forEach(({ field, message }) => { mapped[field] = message; });
        setFieldErrors(mapped);
      } else if (serverError?.code === 'RATE_LIMIT_EXCEEDED') {
        setGlobalError('Too many login attempts. Please wait 15 minutes before trying again.');
      } else if (serverError?.code === 'ACCOUNT_DISABLED') {
        setGlobalError('Your account has been disabled. Please contact support.');
      } else {
        // Invalid credentials or generic error
        setGlobalError(serverError?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Quick-fill demo credentials ────────────────────────────────────────────
  const fillDemo = (cred) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setFieldErrors({});
    setGlobalError('');
    setSuccessMsg('');
  };

  // ── Input focus styles (applied via inline event handlers) ─────────────────
  const focusStyle = (hasError) => ({
    borderColor: hasError ? 'var(--error)' : 'var(--accent)',
    boxShadow: hasError
      ? '0 0 0 3px rgba(239,68,68,0.12)'
      : '0 0 0 3px var(--accent-glow)',
  });
  const blurStyle = (hasError) => ({
    borderColor: hasError ? 'rgba(239,68,68,0.4)' : 'var(--border)',
    boxShadow: 'none',
  });

  return (
    <div style={s.page}>
      {/* Background glow */}
      <div style={s.glow} />

      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logoMark}>🛒</div>
          <h1 style={s.title}>Welcome back</h1>
          <p style={s.subtitle}>Sign in to your ShopWave account to continue.</p>
        </div>

        {/* Global alert */}
        {globalError && (
          <div className="alert alert--error" style={{ marginBottom: '20px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {globalError}
          </div>
        )}
        {successMsg && (
          <div className="alert alert--success" style={{ marginBottom: '20px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form style={s.form} onSubmit={handleSubmit} noValidate>
          {/* Email field */}
          <div style={s.field}>
            <label htmlFor="email" style={s.label}>Email Address</label>
            <div style={s.inputWrapper}>
              <svg style={s.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); }}
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  ...s.input,
                  ...(fieldErrors.email ? { borderColor: 'rgba(239,68,68,0.4)' } : {}),
                }}
                onFocus={(e) => Object.assign(e.target.style, focusStyle(!!fieldErrors.email))}
                onBlur={(e) => Object.assign(e.target.style, blurStyle(!!fieldErrors.email))}
                disabled={isLoading}
              />
            </div>
            {fieldErrors.email && (
              <span style={s.fieldError}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password field */}
          <div style={s.field}>
            <label htmlFor="password" style={s.label}>Password</label>
            <div style={s.inputWrapper}>
              <svg style={s.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  ...s.input,
                  paddingRight: '44px',
                  ...(fieldErrors.password ? { borderColor: 'rgba(239,68,68,0.4)' } : {}),
                }}
                onFocus={(e) => Object.assign(e.target.style, focusStyle(!!fieldErrors.password))}
                onBlur={(e) => Object.assign(e.target.style, blurStyle(!!fieldErrors.password))}
                disabled={isLoading}
              />
              {/* Toggle password visibility */}
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px', color: 'var(--text-muted)',
                }}
              >
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <span style={s.fieldError}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...s.submitBtn,
              opacity: isLoading ? 0.7 : 1,
              transform: isLoading ? 'scale(0.99)' : 'scale(1)',
            }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = 'var(--accent-light)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            {isLoading ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px' }} />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={{ marginTop: '28px' }}>
          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span>or try a demo account</span>
            <div style={s.dividerLine} />
          </div>
          <div style={{ ...s.demoButtons, marginTop: '12px' }}>
            {DEMO_CREDS.map((cred) => (
              <button
                key={cred.label}
                style={s.demoBtn}
                onClick={() => fillDemo(cred)}
                disabled={isLoading}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = cred.color + '66';
                  e.currentTarget.style.color = cred.color;
                  e.currentTarget.style.background = cred.color + '14';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                }}
              >
                {cred.label}
              </button>
            ))}
          </div>
          <p style={{ ...s.demoLabel, marginTop: '10px' }}>
            Click a role to auto-fill credentials, then hit Sign In
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
