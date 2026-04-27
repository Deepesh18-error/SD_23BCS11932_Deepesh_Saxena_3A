// src/data/users.js
// In-memory user store — simulates a database
// Passwords are bcrypt hashed. Plain-text passwords for testing:
//   customer@demo.com → password: customer123
//   seller@demo.com   → password: seller123
//   admin@demo.com    → password: admin123

const users = [
  {
    id: 'usr_001',
    name: 'Riya Sharma',
    email: 'customer@demo.com',
    // bcrypt hash of 'customer123' (rounds: 10)
    passwordHash: '$2a$10$bqo7spIfGM9p9TfNAqh2l.iQqjKL4nCEy/GKIDWkMn1g3TtK4NTim',
    role: 'CUSTOMER',
    phoneNumber: '+919876543210',
    address: {
      street: '42 MG Road',
      city: 'Chandigarh',
      state: 'Punjab',
      pincode: '160001',
      country: 'India',
    },
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'usr_002',
    name: 'Arjun Mehta',
    email: 'seller@demo.com',
    // bcrypt hash of 'seller123'
    passwordHash: '$2a$10$WSdoiCriOw8uMxYKlpZdS.A38i8g.GWf09T25A0rrC5fk8UcbEAFq',
    role: 'SELLER',
    phoneNumber: '+919812345678',
    address: {
      street: '12 Nehru Place',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110019',
      country: 'India',
    },
    isActive: true,
    createdAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'usr_003',
    name: 'Priya Nair',
    email: 'admin@demo.com',
    // bcrypt hash of 'admin123'
    passwordHash: '$2a$10$cQeEHJ4RnaYMwS8bMEAeFefEGf1Wn/AnfLAYoPecZauyDpmsOrns6',
    role: 'ADMIN',
    phoneNumber: '+919900112233',
    address: {
      street: '88 BKC',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400051',
      country: 'India',
    },
    isActive: true,
    createdAt: '2025-01-03T00:00:00Z',
  },
];

// Helper — find user by email (simulates DB query)
const findByEmail = (email) =>
  users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;

// Helper — find user by ID
const findById = (id) => users.find((u) => u.id === id) || null;

// Helper — return user object without sensitive fields
const toSafeUser = (user) => {
  const { passwordHash, ...safe } = user;
  return safe;
};

module.exports = { users, findByEmail, findById, toSafeUser };
