// src/components/ProductCard.jsx
// Renders a single product card in the products grid

import React from 'react';

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'default',
    position: 'relative',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: '4 / 3',
    background: 'var(--bg-elevated)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  imagePlaceholder: {
    width: '56px',
    height: '56px',
    opacity: 0.12,
  },
  body: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  },
  category: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--accent-light)',
    background: 'var(--accent-subtle)',
    padding: '2px 8px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  name: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '1rem',
    color: 'var(--text-primary)',
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  brand: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  stars: {
    fontSize: '0.75rem',
    letterSpacing: '-1px',
  },
  ratingText: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginTop: 'auto',
  },
  price: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: '1.2rem',
    color: 'var(--text-primary)',
  },
  mrp: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textDecoration: 'line-through',
  },
  discount: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--success)',
    background: 'rgba(34,197,94,0.1)',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  outOfStock: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(239,68,68,0.9)',
    color: '#fff',
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '3px 8px',
    borderRadius: '4px',
  },
};

const StarRating = ({ rating }) => {
  const full = Math.floor(rating);
  const partial = rating % 1;
  const stars = [];

  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push('★');
    else if (i === full && partial >= 0.5) stars.push('★');
    else stars.push('☆');
  }

  return (
    <span style={{ ...styles.stars, color: '#f59e0b' }}>
      {stars.join('')}
    </span>
  );
};

const formatPrice = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(amount);

const ProductCard = ({ product }) => {
  const discountPct =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  return (
    <div
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'var(--border-accent)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(108,99,255,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Product image area */}
      <div style={styles.imageWrapper}>
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'block';
            }}
          />
        ) : null}
        {/* Fallback icon */}
        <svg style={{ ...styles.imagePlaceholder, display: product.thumbnail ? 'none' : 'block' }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>

        {/* Out of stock overlay */}
        {!product.inventory.inStock && (
          <div style={styles.outOfStock}>Out of stock</div>
        )}
      </div>

      {/* Card body */}
      <div style={styles.body}>
        <div style={styles.topRow}>
          <span style={styles.category}>{product.category.name}</span>
        </div>

        <div style={styles.name}>{product.name}</div>
        <div style={styles.brand}>{product.brand}</div>

        {/* Rating */}
        <div style={styles.ratingRow}>
          <StarRating rating={product.rating} />
          <span style={styles.ratingText}>
            {product.rating} ({product.reviewCount.toLocaleString()})
          </span>
        </div>

        {/* Price row */}
        <div style={styles.priceRow}>
          <span style={styles.price}>{formatPrice(product.price)}</span>
          {product.mrp > product.price && (
            <>
              <span style={styles.mrp}>{formatPrice(product.mrp)}</span>
              <span style={styles.discount}>{discountPct}% off</span>
            </>
          )}
        </div>

        {/* Stock status */}
        {product.inventory.inStock && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
              In stock ({product.inventory.quantity} left)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;