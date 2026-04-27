// src/data/products.js
// In-memory product store — simulates a PostgreSQL products table

const products = [
  {
    id: 'prod_001',
    name: 'iPhone 16 Pro',
    description:
      'Apple iPhone 16 Pro with A18 Pro chip, 48MP triple camera, titanium design, and 6.3-inch Super Retina XDR display.',
    price: 119999,
    mrp: 134900,
    brand: 'Apple',
    sku: 'APPL-IP16P-128-BLK',
    category: { id: 'cat_001', name: 'Smartphones' },
    thumbnail: 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-3inch-desertTitanium',
    images: [],
    attributes: {
      storage: '128GB',
      color: 'Black Titanium',
      ram: '8GB',
      display: '6.3 inch OLED',
      battery: '4685 mAh',
      os: 'iOS 18',
    },
    inventory: { quantity: 34, inStock: true },
    rating: 4.7,
    reviewCount: 892,
    sellerId: 'usr_002',
    isActive: true,
    createdAt: '2025-01-05T00:00:00Z',
  },
  {
    id: 'prod_002',
    name: 'Samsung Galaxy S25 Ultra',
    description:
      'Samsung Galaxy S25 Ultra with Snapdragon 8 Elite, built-in S Pen, 200MP camera and 6.9-inch Dynamic AMOLED 2X display.',
    price: 134999,
    mrp: 149999,
    brand: 'Samsung',
    sku: 'SAMS-S25U-256-TITAN',
    category: { id: 'cat_001', name: 'Smartphones' },
    thumbnail: 'https://images.samsung.com/in/smartphones/galaxy-s25-ultra/buy/s25ultra_titanium.jpg',
    images: [],
    attributes: {
      storage: '256GB',
      color: 'Titanium Gray',
      ram: '12GB',
      display: '6.9 inch AMOLED',
      battery: '5000 mAh',
      os: 'Android 15',
    },
    inventory: { quantity: 18, inStock: true },
    rating: 4.6,
    reviewCount: 541,
    sellerId: 'usr_002',
    isActive: true,
    createdAt: '2025-01-06T00:00:00Z',
  },
  {
    id: 'prod_003',
    name: 'Sony WH-1000XM5',
    description:
      'Industry-leading noise canceling headphones with 30-hour battery life, multipoint connection, and crystal clear hands-free calling.',
    price: 24990,
    mrp: 34990,
    brand: 'Sony',
    sku: 'SONY-WH1000XM5-BLK',
    category: { id: 'cat_002', name: 'Audio & Headphones' },
    thumbnail: 'https://www.sony.co.in/image/5d02da5df552836db894cead8a68f764',
    images: [],
    attributes: {
      type: 'Over-Ear',
      color: 'Black',
      battery: '30 hours',
      connectivity: 'Bluetooth 5.2',
      noiseCancellation: 'Active (ANC)',
    },
    inventory: { quantity: 67, inStock: true },
    rating: 4.8,
    reviewCount: 2104,
    sellerId: 'usr_002',
    isActive: true,
    createdAt: '2025-01-07T00:00:00Z',
  },
  {
    id: 'prod_004',
    name: 'MacBook Air M3 13"',
    description:
      'Supercharged by the Apple M3 chip. Up to 18 hours of battery life, 13-inch Liquid Retina display, 8GB unified memory.',
    price: 114900,
    mrp: 124900,
    brand: 'Apple',
    sku: 'APPL-MBA-M3-8GB-256-MDN',
    category: { id: 'cat_003', name: 'Laptops' },
    thumbnail: 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/macbook-air-midnight-select-20220606',
    images: [],
    attributes: {
      chip: 'Apple M3',
      ram: '8GB Unified',
      storage: '256GB SSD',
      display: '13.6 inch Liquid Retina',
      battery: '18 hours',
      os: 'macOS Sequoia',
    },
    inventory: { quantity: 12, inStock: true },
    rating: 4.9,
    reviewCount: 3210,
    sellerId: 'usr_002',
    isActive: true,
    createdAt: '2025-01-08T00:00:00Z',
  },
  {
    id: 'prod_005',
    name: 'Nike Air Max 270',
    description:
      'Lifestyle sneaker featuring a large Air unit in the heel, soft mesh upper, and foam midsole for all-day comfort.',
    price: 12995,
    mrp: 14995,
    brand: 'Nike',
    sku: 'NIKE-AM270-BLK-10',
    category: { id: 'cat_004', name: 'Footwear' },
    thumbnail: 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/01af2f3a-4b38-4ab7-b0f6-e2fd79d5ebb0/air-max-270-shoes-2V5C4p.png',
    images: [],
    attributes: {
      color: 'Black/White',
      size: '10 UK',
      material: 'Mesh + Foam',
      sole: 'Air Max Cushioning',
      gender: 'Unisex',
    },
    inventory: { quantity: 89, inStock: true },
    rating: 4.4,
    reviewCount: 1678,
    sellerId: 'usr_002',
    isActive: true,
    createdAt: '2025-01-09T00:00:00Z',
  },
  {
    id: 'prod_006',
    name: 'Dyson V15 Detect',
    description:
      'The most powerful, most intelligent Dyson cordless vacuum. Laser reveals microscopic dust on hard floors.',
    price: 54900,
    mrp: 64900,
    brand: 'Dyson',
    sku: 'DYSON-V15-DET-YEL',
    category: { id: 'cat_005', name: 'Home Appliances' },
    thumbnail: 'https://dyson-h.assetsadobe2.com/is/image/content/dam/dyson/images/products/primary/394099-01.png',
    images: [],
    attributes: {
      suction: '230 AW',
      battery: '60 minutes',
      dustbin: '0.77L',
      filterType: 'HEPA filtration',
      color: 'Yellow/Nickel',
    },
    inventory: { quantity: 0, inStock: false },
    rating: 4.6,
    reviewCount: 987,
    sellerId: 'usr_002',
    isActive: true,
    createdAt: '2025-01-10T00:00:00Z',
  },
];

// ─── Query helpers ────────────────────────────────────────────────────────────

const findAll = ({ categoryId, brand, minPrice, maxPrice, inStock, sortBy, page, limit }) => {
  let filtered = products.filter((p) => p.isActive);

  // Filters
  if (categoryId) filtered = filtered.filter((p) => p.category.id === categoryId);
  if (brand)      filtered = filtered.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
  if (minPrice)   filtered = filtered.filter((p) => p.price >= Number(minPrice));
  if (maxPrice)   filtered = filtered.filter((p) => p.price <= Number(maxPrice));
  if (inStock !== undefined && inStock !== '') {
    const wantInStock = inStock === 'true' || inStock === true;
    filtered = filtered.filter((p) => p.inventory.inStock === wantInStock);
  }

  // Sorting
  if (sortBy === 'price_asc')  filtered.sort((a, b) => a.price - b.price);
  if (sortBy === 'price_desc') filtered.sort((a, b) => b.price - a.price);
  if (sortBy === 'rating')     filtered.sort((a, b) => b.rating - a.rating);
  // default: 'new' (already ordered by createdAt desc via array order)

  const total = filtered.length;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(limit) || 10));
  const startIdx = (pageNum - 1) * pageSize;
  const paginated = filtered.slice(startIdx, startIdx + pageSize);

  return {
    data: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: startIdx + pageSize < total,
      hasPrevPage: pageNum > 1,
    },
  };
};

const findById = (id) => products.find((p) => p.id === id && p.isActive) || null;

module.exports = { products, findAll, findById };