// src/pages/ProductsPage.jsx
// Products page — calls GET /api/v1/products (protected endpoint)
// Features:
//   • Fetches products on mount
//   • Filter by: brand, price range, in-stock
//   • Sort by: new, price asc/desc, rating
//   • Pagination (next/prev)
//   • Loading skeletons
//   • Error handling with retry
//   • Shows which user is logged in + JWT info

import React, { useState, useEffect, useCallback } from 'react';
import { getProducts } from '../api/Product.api.js';
import { useAuth } from '../context/Authcontext.jsx';
import ProductCard from './Productcard.jsx';

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    flex: 1,
    padding: '32px 24px',
    maxWidth: '1280px',
    margin: '0 auto',
    width: '100%',
  },
  pageHeader: {
    marginBottom: '32px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  titleBlock: {},
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  tokenInfo: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-accent)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    maxWidth: '360px',
  },
  tokenDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--success)',
    flexShrink: 0,
    animation: 'pulse 2s ease infinite',
  },
  filtersBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
  },
  filterLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    marginRight: '4px',
  },
  select: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '7px 10px',
    fontSize: '0.83rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    outline: 'none',
  },
  input: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '7px 10px',
    fontSize: '0.83rem',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    width: '90px',
  },
  clearBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    marginLeft: 'auto',
    transition: 'all 0.15s',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  statsText: {
    fontSize: '0.83rem',
    color: 'var(--text-secondary)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  skeletonCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    height: '380px',
  },
  paginationBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '24px 0',
  },
  pageBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pageInfo: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    padding: '0 12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 24px',
  },
  emptyIcon: {
    fontSize: '3.5rem',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginBottom: '20px',
  },
};

// ─── Loading skeleton component ───────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={s.skeletonCard}>
    <div className="skeleton" style={{ height: '180px', borderRadius: 0 }} />
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="skeleton" style={{ height: '12px', width: '60%' }} />
      <div className="skeleton" style={{ height: '18px', width: '90%' }} />
      <div className="skeleton" style={{ height: '12px', width: '40%' }} />
      <div className="skeleton" style={{ height: '12px', width: '55%' }} />
      <div className="skeleton" style={{ height: '20px', width: '50%', marginTop: '8px' }} />
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ProductsPage = () => {
  const { user } = useAuth();

  // Products data from API
  const [products, setProducts]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');

  // Filter state (these map directly to API query params)
  const [filters, setFilters] = useState({
    brand:    '',
    minPrice: '',
    maxPrice: '',
    inStock:  '',
    sortBy:   'new',
    page:     1,
    limit:    6,
  });

  // ── Fetch products ──────────────────────────────────────────────────────────
  // Calls GET /api/v1/products with current filters
  // The axiosInstance automatically attaches the JWT token
  const fetchProducts = useCallback(async (currentFilters) => {
    setIsLoading(true);
    setError('');

    try {
      // getProducts() calls GET /api/v1/products?brand=...&page=...
      const result = await getProducts(currentFilters);
      setProducts(result.data);
      setPagination(result.pagination);
    } catch (err) {
      const errorCode = err.response?.data?.error?.code;

      if (errorCode === 'MISSING_TOKEN' || errorCode === 'TOKEN_INVALID') {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else if (!err.response) {
        setError('Cannot connect to server. Make sure the backend is running on port 5000.');
      } else {
        setError(err.response?.data?.error?.message || 'Failed to load products. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchProducts(filters);
  }, [filters, fetchProducts]);

  // ── Filter handlers ────────────────────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // reset to page 1 on filter change
    }));
  };

  const clearFilters = () => {
    setFilters({ brand: '', minPrice: '', maxPrice: '', inStock: '', sortBy: 'new', page: 1, limit: 6 });
  };

  const hasActiveFilters =
    filters.brand || filters.minPrice || filters.maxPrice || filters.inStock || filters.sortBy !== 'new';

  // ── Get short token preview for display ────────────────────────────────────
  const tokenPreview = (() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return 'No token';
    const parts = token.split('.');
    return `${parts[0].slice(0, 8)}…${parts[2]?.slice(-6) || ''}`;
  })();

  return (
    <div style={s.page}>
      {/* Page header */}
      <div style={s.pageHeader}>
        <div style={s.titleBlock}>
          <h1 style={s.title}>
            Product Catalogue
            <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>✦</span>
          </h1>
          <p style={s.subtitle}>
            Browse {pagination?.total ?? '…'} products — fetched via{' '}
            <code style={{ color: 'var(--accent-light)', fontSize: '0.82rem', background: 'var(--accent-subtle)', padding: '1px 5px', borderRadius: '3px' }}>
              GET /api/v1/products
            </code>{' '}
            with JWT auth
          </p>
        </div>

        {/* JWT status indicator */}
        <div style={s.tokenInfo}>
          <div style={s.tokenDot} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
              Authenticated as {user?.name}
            </div>
            <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
              JWT: {tokenPreview}
            </div>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div style={s.filtersBar}>
        <span style={s.filterLabel}>Filters</span>

        {/* Brand filter */}
        <select
          style={s.select}
          value={filters.brand}
          onChange={(e) => handleFilterChange('brand', e.target.value)}
        >
          <option value="">All Brands</option>
          <option value="Apple">Apple</option>
          <option value="Samsung">Samsung</option>
          <option value="Sony">Sony</option>
          <option value="Nike">Nike</option>
          <option value="Dyson">Dyson</option>
        </select>

        {/* Price range */}
        <input
          style={s.input}
          type="number"
          placeholder="Min ₹"
          value={filters.minPrice}
          onChange={(e) => handleFilterChange('minPrice', e.target.value)}
          min="0"
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
        <input
          style={s.input}
          type="number"
          placeholder="Max ₹"
          value={filters.maxPrice}
          onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
          min="0"
        />

        {/* In stock */}
        <select
          style={s.select}
          value={filters.inStock}
          onChange={(e) => handleFilterChange('inStock', e.target.value)}
        >
          <option value="">All Stock</option>
          <option value="true">In Stock</option>
          <option value="false">Out of Stock</option>
        </select>

        {/* Sort */}
        <select
          style={{ ...s.select, marginLeft: 'auto' }}
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
        >
          <option value="new">Newest First</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="rating">Top Rated</option>
        </select>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            style={s.clearBtn}
            onClick={clearFilters}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = '#fca5a5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Stats row */}
      {!isLoading && !error && pagination && (
        <div style={s.statsRow}>
          <p style={s.statsText}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{products.length}</strong> of{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> products
            {hasActiveFilters && ' (filtered)'}
          </p>
          <p style={s.statsText}>
            Page {pagination.page} of {pagination.totalPages}
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="alert alert--error" style={{ marginBottom: '24px', maxWidth: '500px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Error loading products</strong>
            <div style={{ marginTop: '4px', opacity: 0.85 }}>{error}</div>
            <button
              onClick={() => fetchProducts(filters)}
              style={{
                marginTop: '8px', background: 'none', border: '1px solid rgba(239,68,68,0.4)',
                color: '#fca5a5', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Product grid */}
      <div style={s.grid}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((product, i) => (
              <div
                key={product.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <ProductCard product={product} />
              </div>
            ))
        }
      </div>

      {/* Empty state */}
      {!isLoading && !error && products.length === 0 && (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>🔍</div>
          <h3 style={s.emptyTitle}>No products found</h3>
          <p style={s.emptyText}>Try adjusting your filters or clearing them to see all products.</p>
          <button
            onClick={clearFilters}
            style={{
              background: 'var(--accent)', border: 'none', color: '#fff',
              padding: '10px 20px', borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-display)',
              cursor: 'pointer',
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && pagination && pagination.totalPages > 1 && (
        <div style={s.paginationBar}>
          <button
            style={{
              ...s.pageBtn,
              opacity: pagination.hasPrevPage ? 1 : 0.35,
              cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
            }}
            onClick={() => pagination.hasPrevPage && handleFilterChange('page', filters.page - 1)}
            disabled={!pagination.hasPrevPage}
            onMouseEnter={(e) => { if (pagination.hasPrevPage) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-light)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Previous
          </button>

          <span style={s.pageInfo}>
            Page <strong style={{ color: 'var(--text-primary)' }}>{pagination.page}</strong> of{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{pagination.totalPages}</strong>
          </span>

          <button
            style={{
              ...s.pageBtn,
              opacity: pagination.hasNextPage ? 1 : 0.35,
              cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
            }}
            onClick={() => pagination.hasNextPage && handleFilterChange('page', filters.page + 1)}
            disabled={!pagination.hasNextPage}
            onMouseEnter={(e) => { if (pagination.hasNextPage) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-light)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
