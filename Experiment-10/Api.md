# 🌐 API Design — E-Commerce Platform

> **Version:** v1 | **Base URL:** `https://api.ecommerce.com/v1` | **Protocol:** HTTPS only

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Versioning Strategy](#3-versioning-strategy)
4. [Rate Limiting Strategy](#4-rate-limiting-strategy)
5. [Idempotency Handling](#5-idempotency-handling)
6. [User Endpoints](#6-user-endpoints)
7. [Product & Search Endpoints](#7-product--search-endpoints)
8. [Cart Endpoints](#8-cart-endpoints)
9. [Order & Checkout Endpoints](#9-order--checkout-endpoints)
10. [Payment Endpoints](#10-payment-endpoints)
11. [Status Codes Reference](#11-status-codes-reference)
12. [Error Response Format](#12-error-response-format)

---

## 1. API Conventions

| Convention | Rule |
|---|---|
| **Style** | RESTful, resource-oriented |
| **Data Format** | `application/json` (request & response) |
| **Timestamps** | ISO 8601 — `2025-07-01T12:00:00Z` |
| **Identifiers** | UUID v4 strings |
| **Pagination** | Cursor-based (default) / Offset-based (search) |
| **Filtering** | Query params: `?category=electronics&minPrice=100` |
| **Sorting** | `?sort=price&order=asc` |
| **Naming** | `snake_case` for fields, `kebab-case` for URLs |

### Standard Pagination Response

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6Ijc4YWIifQ==",
    "prev_cursor": null,
    "has_next": true,
    "total_count": 2450
  }
}
```

---

## 2. Authentication & Authorization

All protected endpoints require:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### JWT Token Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "usr_f3b8e5a1-...",
    "email": "user@example.com",
    "roles": ["CUSTOMER"],
    "iat": 1751356800,
    "exp": 1751357700,
    "jti": "tok_9c2a..."
  }
}
```

- **Access Token TTL:** 15 minutes
- **Refresh Token TTL:** 7 days (stored securely, HTTP-only cookie)
- **Algorithm:** RS256 (asymmetric — public key distributed to all services)

### Token Refresh Flow

```http
POST /auth/refresh
Cookie: refresh_token=<REFRESH_TOKEN>

Response 200:
{
  "access_token": "<NEW_JWT>",
  "expires_in": 900
}
```

---

## 3. Versioning Strategy

### URL Path Versioning (Primary)

```
https://api.ecommerce.com/v1/products
https://api.ecommerce.com/v2/products   ← breaking changes only
```

### Rules

- **Non-breaking changes** (new optional fields, new endpoints): no version bump; backward compatible
- **Breaking changes** (field removal, response restructure): new major version
- **Deprecation Policy:** Old version supported for **6 months** after new version release
- **Deprecation Header:** Included on all deprecated endpoints

```http
Deprecation: true
Sunset: Sat, 01 Jan 2026 00:00:00 GMT
Link: <https://api.ecommerce.com/v2/products>; rel="successor-version"
```

---

## 4. Rate Limiting Strategy

### Limits by Tier

| Tier | Limit | Window | Applies To |
|---|---|---|---|
| Anonymous | 30 req | 1 minute | Public endpoints (search, product list) |
| Authenticated | 300 req | 1 minute | All user endpoints |
| Premium | 1000 req | 1 minute | Enterprise clients |
| Internal Service | Unlimited | — | Service-to-service (validated by IP + internal key) |

### Implementation

- Rate limits enforced at **API Gateway** using a **Token Bucket** algorithm
- State stored in **Redis** (shared across gateway nodes)
- Key: `rate_limit:{ip}` or `rate_limit:{user_id}` (authenticated)

### Response Headers (always returned)

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 247
X-RateLimit-Reset: 1751357760
Retry-After: 23          ← Only present on 429
```

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 23 seconds.",
    "retry_after": 23
  }
}
```

---

## 5. Idempotency Handling

All **mutating** operations (POST, PUT, PATCH) that involve money or state changes **must** use idempotency keys.

### How It Works

1. Client generates a unique key (UUID) and sends it in the header
2. Server checks Redis for prior execution of that key
3. If found → return cached response (no duplicate operation)
4. If not found → execute, cache result for **24 hours**, return response

```http
POST /v1/payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{ ... }
```

### Cached Response Header

```http
X-Idempotency-Replay: true
```

### Endpoints Requiring Idempotency Keys

| Endpoint | Reason |
|---|---|
| `POST /payments` | Prevents double charging |
| `POST /orders` | Prevents duplicate orders |
| `POST /cart/checkout` | Prevents double inventory deduction |
| `POST /refunds` | Prevents double refund |

---

## 6. User Endpoints

### 6.1 Register a New User

```http
POST /v1/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Riya Sharma",
  "email": "riya@example.com",
  "password": "SecurePass@123",
  "phone_number": "+919876543210",
  "address": {
    "street": "21 MG Road",
    "city": "Chandigarh",
    "state": "Punjab",
    "postal_code": "160001",
    "country": "IN"
  }
}
```

**Response `201 Created`:**
```json
{
  "data": {
    "user_id": "f3b8e5a1-0d44-4f3b-a9c2-1234abcd5678",
    "name": "Riya Sharma",
    "email": "riya@example.com",
    "created_at": "2025-07-01T10:00:00Z"
  }
}
```

**Errors:** `400 Bad Request`, `409 Conflict` (email already exists)

---

### 6.2 User Login

```http
POST /v1/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "riya@example.com",
  "password": "SecurePass@123"
}
```

**Response `200 OK`:**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiJ9...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "user_id": "f3b8e5a1-...",
      "name": "Riya Sharma",
      "email": "riya@example.com"
    }
  }
}
```

**Errors:** `401 Unauthorized`, `423 Locked` (too many failed attempts)

---

### 6.3 Get User Profile

```http
GET /v1/users/me
Authorization: Bearer <token>
```

**Response `200 OK`:**
```json
{
  "data": {
    "user_id": "f3b8e5a1-...",
    "name": "Riya Sharma",
    "email": "riya@example.com",
    "phone_number": "+919876543210",
    "addresses": [
      {
        "address_id": "...",
        "street": "21 MG Road",
        "city": "Chandigarh",
        "is_default": true
      }
    ]
  }
}
```

---

### 6.4 Update User Profile

```http
PATCH /v1/users/me
Authorization: Bearer <token>
Idempotency-Key: <uuid>
```

**Request Body (partial update):**
```json
{
  "phone_number": "+918888888888"
}
```

**Response `200 OK`:** Updated user object

---

## 7. Product & Search Endpoints

### 7.1 List Products (Paginated)

```http
GET /v1/products?category=electronics&minPrice=500&maxPrice=50000&sort=price&order=asc&limit=20&cursor=<cursor>
```

**Response `200 OK`:**
```json
{
  "data": [
    {
      "product_id": "prod_abc123...",
      "name": "iPhone 16 Pro",
      "price": 129900.00,
      "category": "Smartphones",
      "stock_quantity": 48,
      "images": ["https://cdn.example.com/prod_abc123_1.jpg"],
      "is_active": true
    }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6...",
    "has_next": true,
    "total_count": 1240
  }
}
```

---

### 7.2 Get Single Product

```http
GET /v1/products/{product_id}
```

**Response `200 OK`:**
```json
{
  "data": {
    "product_id": "prod_abc123...",
    "name": "iPhone 16 Pro",
    "description": "Apple iPhone 16 Pro with A18 chip...",
    "price": 129900.00,
    "category": { "id": "cat_001", "name": "Smartphones" },
    "stock_quantity": 48,
    "attributes": {
      "color": "Titanium Black",
      "storage": "256GB",
      "display": "6.3 inch Super Retina XDR"
    },
    "images": ["https://cdn.example.com/..."],
    "created_at": "2025-01-15T08:00:00Z"
  }
}
```

**Errors:** `404 Not Found`

---

### 7.3 Search Products (Elasticsearch)

```http
GET /v1/search?q=iphone+16&category=smartphones&minPrice=50000&inStock=true&page=1&size=20
```

**Response `200 OK`:**
```json
{
  "data": {
    "hits": [
      {
        "product_id": "prod_abc123...",
        "name": "iPhone 16 Pro",
        "price": 129900.00,
        "score": 9.87,
        "highlight": {
          "name": ["<em>iPhone 16</em> Pro"]
        }
      }
    ],
    "total": 14,
    "page": 1,
    "size": 20,
    "suggestions": ["iphone 16 plus", "iphone 16 case"]
  }
}
```

---

### 7.4 Create Product (Admin Only)

```http
POST /v1/products
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Samsung Galaxy S25",
  "description": "Flagship Android smartphone...",
  "price": 89999.00,
  "category_id": "cat_001",
  "stock_quantity": 200,
  "attributes": {
    "color": "Phantom Black",
    "storage": "128GB"
  }
}
```

**Response `201 Created`:** Full product object

---

## 8. Cart Endpoints

### 8.1 Get Current Cart

```http
GET /v1/cart
Authorization: Bearer <token>
```

**Response `200 OK`:**
```json
{
  "data": {
    "cart_id": "cart_xyz789...",
    "user_id": "f3b8e5a1-...",
    "items": [
      {
        "product_id": "prod_abc123...",
        "product_name": "iPhone 16 Pro",
        "quantity": 1,
        "price_at_addition": 129900.00,
        "current_price": 129900.00,
        "price_changed": false
      }
    ],
    "total_items": 1,
    "total_price": 129900.00,
    "updated_at": "2025-07-01T12:30:00Z"
  }
}
```

---

### 8.2 Add Item to Cart

```http
POST /v1/cart/items
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "product_id": "prod_abc123...",
  "quantity": 2
}
```

**Response `200 OK`:** Updated cart object

**Errors:** `404` (product not found), `422` (insufficient stock)

---

### 8.3 Update Item Quantity

```http
PATCH /v1/cart/items/{product_id}
Authorization: Bearer <token>
```

**Request Body:**
```json
{ "quantity": 3 }
```

**Response `200 OK`:** Updated cart object

---

### 8.4 Remove Item from Cart

```http
DELETE /v1/cart/items/{product_id}
Authorization: Bearer <token>
```

**Response `204 No Content`**

---

### 8.5 Clear Entire Cart

```http
DELETE /v1/cart
Authorization: Bearer <token>
```

**Response `204 No Content`**

---

## 9. Order & Checkout Endpoints

### 9.1 Initiate Checkout

Validates stock, locks inventory, creates a pending order.

```http
POST /v1/checkout
Authorization: Bearer <token>
Idempotency-Key: <uuid>
Content-Type: application/json
```

**Request Body:**
```json
{
  "cart_id": "cart_xyz789...",
  "shipping_address_id": "addr_001...",
  "payment_method": "CARD"
}
```

**Response `201 Created`:**
```json
{
  "data": {
    "order_id": "ord_111abc...",
    "checkout_session_id": "sess_aaa...",
    "status": "PENDING",
    "total_amount": 129900.00,
    "payment_intent_client_secret": "pi_..._secret_...",
    "expires_at": "2025-07-01T12:45:00Z"
  }
}
```

**Errors:** `409 Conflict` (stock changed), `422 Unprocessable` (cart empty)

---

### 9.2 Get Order Status

```http
GET /v1/orders/{order_id}
Authorization: Bearer <token>
```

**Response `200 OK`:**
```json
{
  "data": {
    "order_id": "ord_111abc...",
    "status": "CONFIRMED",
    "items": [...],
    "total_amount": 129900.00,
    "payment": {
      "payment_id": "pay_xyz...",
      "status": "SUCCESS",
      "gateway": "RAZORPAY"
    },
    "shipping_address": { ... },
    "created_at": "2025-07-01T12:35:00Z",
    "status_history": [
      { "status": "PENDING",   "timestamp": "2025-07-01T12:35:00Z" },
      { "status": "CONFIRMED", "timestamp": "2025-07-01T12:36:12Z" }
    ]
  }
}
```

---

### 9.3 List User Orders

```http
GET /v1/orders?status=CONFIRMED&limit=10&cursor=<cursor>
Authorization: Bearer <token>
```

**Response `200 OK`:** Paginated list of orders

---

### 9.4 Cancel Order

```http
POST /v1/orders/{order_id}/cancel
Authorization: Bearer <token>
```

**Response `200 OK`:**
```json
{
  "data": {
    "order_id": "ord_111abc...",
    "status": "CANCELLED",
    "refund_initiated": true
  }
}
```

**Errors:** `422` (order already shipped, cannot cancel)

---

## 10. Payment Endpoints

### 10.1 Process Payment

```http
POST /v1/payments
Authorization: Bearer <token>
Idempotency-Key: <uuid>
Content-Type: application/json
```

**Request Body:**
```json
{
  "order_id": "ord_111abc...",
  "gateway": "RAZORPAY",
  "payment_details": {
    "razorpay_payment_id": "pay_...",
    "razorpay_signature": "sha256_hmac_sig..."
  },
  "amount": 129900.00,
  "currency": "INR"
}
```

**Response `200 OK`:**
```json
{
  "data": {
    "payment_id": "pay_xyz...",
    "status": "SUCCESS",
    "amount": 129900.00,
    "currency": "INR",
    "gateway_transaction_id": "rzp_txn_...",
    "processed_at": "2025-07-01T12:36:10Z"
  }
}
```

**Errors:** `402 Payment Required` (payment failed), `422` (invalid signature)

---

### 10.2 Get Payment Status

```http
GET /v1/payments/{payment_id}
Authorization: Bearer <token>
```

**Response `200 OK`:** Full payment object

---

### 10.3 Initiate Refund

```http
POST /v1/payments/{payment_id}/refund
Authorization: Bearer <token>
Idempotency-Key: <uuid>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 129900.00,
  "reason": "Customer cancelled order"
}
```

**Response `202 Accepted`:**
```json
{
  "data": {
    "refund_id": "ref_...",
    "status": "PENDING",
    "estimated_completion": "3-5 business days"
  }
}
```

---

## 11. Status Codes Reference

| Code | Meaning | When Used |
|---|---|---|
| `200 OK` | Success | GET, PATCH, PUT operations |
| `201 Created` | Resource created | POST creating a new resource |
| `202 Accepted` | Async operation queued | Refunds, async processing |
| `204 No Content` | Success, no body | DELETE operations |
| `400 Bad Request` | Validation failure | Missing required fields, bad format |
| `401 Unauthorized` | Missing/invalid token | No or expired JWT |
| `403 Forbidden` | Insufficient permissions | User accessing another user's resource |
| `404 Not Found` | Resource doesn't exist | Wrong ID |
| `409 Conflict` | State conflict | Duplicate email, out-of-stock race |
| `422 Unprocessable Entity` | Business rule violation | Cart empty, order not cancellable |
| `429 Too Many Requests` | Rate limit hit | See Rate Limiting section |
| `500 Internal Server Error` | Unhandled server error | Unexpected exception |
| `502 Bad Gateway` | Upstream service error | Downstream service unavailable |
| `503 Service Unavailable` | Circuit breaker open | Service degraded |

---

## 12. Error Response Format

All errors follow a consistent envelope:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable explanation",
    "request_id": "req_a1b2c3d4",
    "timestamp": "2025-07-01T12:00:00Z",
    "details": [
      {
        "field": "email",
        "issue": "Must be a valid email address"
      }
    ]
  }
}
```

### Common Error Codes

| `code` | HTTP | Scenario |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Field validation failed |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `TOKEN_EXPIRED` | 401 | JWT past TTL |
| `ACCESS_DENIED` | 403 | Insufficient role |
| `RESOURCE_NOT_FOUND` | 404 | Entity not found |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `INSUFFICIENT_STOCK` | 409 | Product out of stock |
| `PAYMENT_FAILED` | 402 | Gateway declined charge |
| `INVALID_SIGNATURE` | 422 | Payment HMAC mismatch |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

*End of API Design Document*