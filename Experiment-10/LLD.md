# 🔩 Low-Level Design (LLD) — E-Commerce Platform

> **Version:** 1.0 | **Author:** System Design Team | **Last Updated:** 2025

---

## Table of Contents

1. [Service Decomposition](#1-service-decomposition)
2. [Class Diagrams](#2-class-diagrams)
3. [Database Schema](#3-database-schema)
4. [Relationships & Indexing](#4-relationships--indexing)
5. [Sequence Diagrams](#5-sequence-diagrams)
6. [Design Patterns Used](#6-design-patterns-used)
7. [SOLID Principles Applied](#7-solid-principles-applied)

---

## 1. Service Decomposition

The platform is split into **7 bounded-context microservices**, each owning its own data store.

| Service | Responsibility | Database | Port |
|---|---|---|---|
| `UserService` | Registration, Login, JWT issuance | MySQL | 8001 |
| `SearchService` | Full-text product search | Amazon Elasticsearch | 8002 |
| `ProductService` | Product CRUD, inventory metadata | PostgreSQL | 8003 |
| `CartService` | Cart state management | PostgreSQL | 8004 |
| `OrderStatusService` | Real-time stock check, order state | PostgreSQL | 8005 |
| `CheckoutService` | Checkout orchestration | PostgreSQL | 8006 |
| `PaymentService` | Payment processing, gateway integration | PostgreSQL | 8007 |

---

## 2. Class Diagrams

### 2.1 User Service

```
┌────────────────────────────────────────────────────────────┐
│                        UserService                         │
├────────────────────────────────────────────────────────────┤
│ - userRepository: IUserRepository                          │
│ - tokenService: ITokenService                              │
│ - passwordHasher: IPasswordHasher                          │
├────────────────────────────────────────────────────────────┤
│ + register(dto: RegisterDTO): UserResponseDTO              │
│ + login(dto: LoginDTO): AuthTokenDTO                       │
│ + getUserById(id: UUID): UserResponseDTO                   │
│ + updateProfile(id: UUID, dto: UpdateDTO): UserResponseDTO │
│ + deleteUser(id: UUID): void                               │
└────────────────────────────────────────────────────────────┘
             ▲                          ▲
             │ implements               │ implements
┌────────────────────┐    ┌────────────────────────────┐
│  IUserRepository   │    │      ITokenService          │
├────────────────────┤    ├────────────────────────────┤
│ + findById(UUID)   │    │ + generateJWT(User): string │
│ + findByEmail(str) │    │ + validateJWT(str): Claims  │
│ + save(User)       │    │ + revokeToken(str): void    │
│ + delete(UUID)     │    └────────────────────────────┘
└────────────────────┘

┌──────────────────────────────────┐
│              User                │
├──────────────────────────────────┤
│ - id: UUID (PK)                  │
│ - name: String                   │
│ - email: String (Unique)         │
│ - passwordHash: String           │
│ - phoneNumber: String            │
│ - address: Address (Embedded)    │
│ - createdAt: Timestamp           │
│ - updatedAt: Timestamp           │
│ - isActive: Boolean              │
├──────────────────────────────────┤
│ + validatePassword(raw): Boolean │
│ + toResponseDTO(): UserDTO       │
└──────────────────────────────────┘

┌────────────────────────┐
│        Address         │
├────────────────────────┤
│ - street: String       │
│ - city: String         │
│ - state: String        │
│ - postalCode: String   │
│ - country: String      │
└────────────────────────┘
```

---

### 2.2 Product & Search Service

```
┌─────────────────────────────────────────────────────┐
│                   ProductService                    │
├─────────────────────────────────────────────────────┤
│ - productRepo: IProductRepository                   │
│ - inventoryService: IInventoryService               │
│ - eventPublisher: IEventPublisher                   │
├─────────────────────────────────────────────────────┤
│ + createProduct(dto): ProductDTO                    │
│ + getProductById(id): ProductDTO                    │
│ + updateInventory(id, delta): void                  │
│ + listProducts(filter): Page<ProductDTO>            │
└─────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                    Product                       │
├──────────────────────────────────────────────────┤
│ - id: UUID (PK)                                  │
│ - name: String                                   │
│ - description: String                            │
│ - price: Decimal                                 │
│ - categoryId: UUID (FK)                          │
│ - stockQuantity: Integer                         │
│ - images: List<String>                           │
│ - attributes: Map<String, String>                │
│ - isActive: Boolean                              │
│ - createdAt: Timestamp                           │
├──────────────────────────────────────────────────┤
│ + isInStock(): Boolean                           │
│ + decrementStock(qty): void                      │
│ + incrementStock(qty): void                      │
└──────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│                 SearchService                  │
├────────────────────────────────────────────────┤
│ - esClient: ElasticsearchClient                │
│ - cdcConsumer: ICDCEventConsumer               │
├────────────────────────────────────────────────┤
│ + searchProducts(query, filters): SearchResult │
│ + indexProduct(product): void                  │
│ + deleteIndex(productId): void                 │
│ + syncFromCDC(event: CDCEvent): void           │
└────────────────────────────────────────────────┘
```

---

### 2.3 Cart Service

```
┌────────────────────────────────────────────────────┐
│                    CartService                     │
├────────────────────────────────────────────────────┤
│ - cartRepo: ICartRepository                        │
│ - productClient: ProductServiceClient              │
├────────────────────────────────────────────────────┤
│ + getCart(userId): CartDTO                         │
│ + addItem(userId, productId, qty): CartDTO         │
│ + removeItem(userId, productId): CartDTO           │
│ + updateQuantity(userId, productId, qty): CartDTO  │
│ + clearCart(userId): void                          │
└────────────────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│                   Cart                    │
├───────────────────────────────────────────┤
│ - cartId: UUID (PK)                       │
│ - userId: UUID (FK → User)                │
│ - items: List<CartItem>                   │
│ - updatedAt: Timestamp                    │
├───────────────────────────────────────────┤
│ + totalPrice(): Decimal                   │
│ + itemCount(): Integer                    │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│                 CartItem                  │
├───────────────────────────────────────────┤
│ - productId: UUID (FK → Product)          │
│ - productName: String (snapshot)          │
│ - quantity: Integer                       │
│ - priceAtAddition: Decimal (snapshot)     │
└───────────────────────────────────────────┘
```

---

### 2.4 Order & Checkout Service

```
┌──────────────────────────────────────────────────────────┐
│                    CheckoutService                       │
├──────────────────────────────────────────────────────────┤
│ - orderRepo: IOrderRepository                            │
│ - cartService: CartServiceClient                         │
│ - paymentService: PaymentServiceClient                   │
│ - inventoryService: InventoryServiceClient               │
├──────────────────────────────────────────────────────────┤
│ + initiateCheckout(userId, cartId): CheckoutSessionDTO   │
│ + confirmOrder(sessionId, paymentData): OrderDTO         │
│ + cancelOrder(orderId): void                             │
└──────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│                    Order                      │
├───────────────────────────────────────────────┤
│ - orderId: UUID (PK)                          │
│ - userId: UUID (FK)                           │
│ - items: List<OrderItem>                      │
│ - status: OrderStatus (Enum)                  │
│ - totalAmount: Decimal                        │
│ - shippingAddress: Address                    │
│ - paymentId: UUID (FK)                        │
│ - createdAt: Timestamp                        │
│ - updatedAt: Timestamp                        │
├───────────────────────────────────────────────┤
│ + isPayable(): Boolean                        │
│ + isCancellable(): Boolean                    │
└───────────────────────────────────────────────┘

┌────────────────────────────────────┐
│           OrderStatus (Enum)       │
├────────────────────────────────────┤
│  PENDING                           │
│  PAYMENT_PROCESSING                │
│  PAYMENT_FAILED                    │
│  CONFIRMED                         │
│  SHIPPED                           │
│  DELIVERED                         │
│  CANCELLED                         │
│  REFUNDED                          │
└────────────────────────────────────┘
```

---

### 2.5 Payment Service

```
┌──────────────────────────────────────────────────────────────┐
│                      PaymentService                          │
├──────────────────────────────────────────────────────────────┤
│ - paymentRepo: IPaymentRepository                            │
│ - gatewayFactory: PaymentGatewayFactory                      │
│ - eventPublisher: IEventPublisher                            │
├──────────────────────────────────────────────────────────────┤
│ + processPayment(dto: PaymentRequestDTO): PaymentResultDTO   │
│ + refundPayment(paymentId): RefundResultDTO                  │
│ + getPaymentStatus(paymentId): PaymentStatusDTO              │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          IPaymentGateway (Interface)    │
├─────────────────────────────────────────┤
│ + charge(request): GatewayResponse      │
│ + refund(transactionId): GatewayResponse│
│ + getStatus(txId): GatewayStatus        │
└─────────────────────────────────────────┘
         ▲              ▲             ▲
   ┌─────┴──┐    ┌──────┴──┐   ┌─────┴──┐
   │ Stripe │    │ Razorpay│   │PayPalGW│
   └────────┘    └─────────┘   └────────┘
```

---

## 3. Database Schema

### 3.1 MySQL — `users_db`

```sql
-- Users Table
CREATE TABLE users (
    id            CHAR(36)       PRIMARY KEY DEFAULT (UUID()),
    name          VARCHAR(100)   NOT NULL,
    email         VARCHAR(255)   NOT NULL UNIQUE,
    password_hash VARCHAR(255)   NOT NULL,
    phone_number  VARCHAR(20),
    is_active     BOOLEAN        DEFAULT TRUE,
    created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_active (is_active)
);

-- User Addresses Table
CREATE TABLE user_addresses (
    id            CHAR(36)       PRIMARY KEY DEFAULT (UUID()),
    user_id       CHAR(36)       NOT NULL,
    street        VARCHAR(255)   NOT NULL,
    city          VARCHAR(100)   NOT NULL,
    state         VARCHAR(100),
    postal_code   VARCHAR(20)    NOT NULL,
    country       VARCHAR(100)   NOT NULL,
    is_default    BOOLEAN        DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Refresh Token Blacklist (for JWT revocation)
CREATE TABLE revoked_tokens (
    jti        CHAR(36)  PRIMARY KEY,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_expires (expires_at)
);
```

---

### 3.2 PostgreSQL — `products_db`

```sql
-- Categories
CREATE TABLE categories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    parent_id   UUID         REFERENCES categories(id),
    created_at  TIMESTAMP    DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)   NOT NULL,
    description     TEXT,
    price           NUMERIC(12,2)  NOT NULL CHECK (price >= 0),
    category_id     UUID           REFERENCES categories(id),
    stock_quantity  INTEGER        NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active       BOOLEAN        DEFAULT TRUE,
    created_at      TIMESTAMP      DEFAULT NOW(),
    updated_at      TIMESTAMP      DEFAULT NOW()
);

-- Product Images
CREATE TABLE product_images (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url         TEXT         NOT NULL,
    is_primary  BOOLEAN      DEFAULT FALSE,
    sort_order  INTEGER      DEFAULT 0
);

-- Product Attributes (EAV Pattern for flexibility)
CREATE TABLE product_attributes (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    key         VARCHAR(100) NOT NULL,
    value       TEXT         NOT NULL,
    UNIQUE (product_id, key)
);

-- Inventory Logs (Audit Trail)
CREATE TABLE inventory_logs (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID         NOT NULL REFERENCES products(id),
    delta       INTEGER      NOT NULL,
    reason      VARCHAR(50)  NOT NULL,  -- 'SALE', 'RESTOCK', 'ADJUSTMENT'
    reference   VARCHAR(255),           -- Order ID or batch ID
    created_at  TIMESTAMP    DEFAULT NOW()
);
```

---

### 3.3 PostgreSQL — `cart_db`

```sql
CREATE TABLE carts (
    cart_id     UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID      NOT NULL UNIQUE,  -- One active cart per user
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cart_items (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id             UUID           NOT NULL REFERENCES carts(cart_id) ON DELETE CASCADE,
    product_id          UUID           NOT NULL,
    product_name        VARCHAR(255)   NOT NULL,     -- Snapshot at time of add
    quantity            INTEGER        NOT NULL CHECK (quantity > 0),
    price_at_addition   NUMERIC(12,2)  NOT NULL,     -- Snapshot at time of add
    added_at            TIMESTAMP      DEFAULT NOW(),
    UNIQUE (cart_id, product_id)
);
```

---

### 3.4 PostgreSQL — `orders_db`

```sql
CREATE TABLE orders (
    order_id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID           NOT NULL,
    status           VARCHAR(30)    NOT NULL DEFAULT 'PENDING',
    total_amount     NUMERIC(12,2)  NOT NULL,
    shipping_address JSONB          NOT NULL,   -- Snapshot of address at time of order
    payment_id       UUID,
    created_at       TIMESTAMP      DEFAULT NOW(),
    updated_at       TIMESTAMP      DEFAULT NOW(),
    CHECK (status IN ('PENDING','PAYMENT_PROCESSING','PAYMENT_FAILED',
                      'CONFIRMED','SHIPPED','DELIVERED','CANCELLED','REFUNDED'))
);

CREATE TABLE order_items (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID           NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id      UUID           NOT NULL,
    product_name    VARCHAR(255)   NOT NULL,
    quantity        INTEGER        NOT NULL,
    unit_price      NUMERIC(12,2)  NOT NULL,
    total_price     NUMERIC(12,2)  GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Order Status History (FSM audit trail)
CREATE TABLE order_status_history (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID         NOT NULL REFERENCES orders(order_id),
    from_status VARCHAR(30),
    to_status   VARCHAR(30)  NOT NULL,
    changed_at  TIMESTAMP    DEFAULT NOW(),
    changed_by  VARCHAR(100)
);
```

---

### 3.5 PostgreSQL — `payments_db`

```sql
CREATE TABLE payments (
    payment_id       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID           NOT NULL UNIQUE,
    user_id          UUID           NOT NULL,
    amount           NUMERIC(12,2)  NOT NULL,
    currency         CHAR(3)        NOT NULL DEFAULT 'INR',
    gateway          VARCHAR(50)    NOT NULL,      -- 'STRIPE', 'RAZORPAY', 'PAYPAL'
    gateway_txn_id   VARCHAR(255),                 -- External transaction ID
    status           VARCHAR(30)    NOT NULL DEFAULT 'INITIATED',
    idempotency_key  VARCHAR(255)   UNIQUE,        -- Prevents duplicate charges
    metadata         JSONB,
    created_at       TIMESTAMP      DEFAULT NOW(),
    updated_at       TIMESTAMP      DEFAULT NOW(),
    CHECK (status IN ('INITIATED','PROCESSING','SUCCESS','FAILED','REFUNDED','PARTIALLY_REFUNDED'))
);

CREATE TABLE refunds (
    refund_id        UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id       UUID           NOT NULL REFERENCES payments(payment_id),
    amount           NUMERIC(12,2)  NOT NULL,
    reason           TEXT,
    gateway_refund_id VARCHAR(255),
    status           VARCHAR(20)    DEFAULT 'PENDING',
    created_at       TIMESTAMP      DEFAULT NOW()
);
```

---

### 3.6 Elasticsearch — `products_index`

```json
{
  "mappings": {
    "properties": {
      "id":          { "type": "keyword" },
      "name":        { "type": "text", "analyzer": "standard", "copy_to": "suggest" },
      "description": { "type": "text", "analyzer": "english" },
      "price":       { "type": "double" },
      "category":    { "type": "keyword" },
      "attributes":  { "type": "object", "dynamic": true },
      "stock_qty":   { "type": "integer" },
      "is_active":   { "type": "boolean" },
      "suggest":     { "type": "completion" },
      "created_at":  { "type": "date" }
    }
  },
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "english": {
          "type": "standard",
          "stopwords": "_english_"
        }
      }
    }
  }
}
```

---

## 4. Relationships & Indexing

### 4.1 Entity Relationships (ERD Overview)

```
User ──── 1:1 ──── Cart ──── 1:N ──── CartItem ──── N:1 ──── Product
 │                                                              │
 │                                                           Category
 │
 1:N
 │
Order ──── 1:N ──── OrderItem ──── N:1 ──── Product
  │
  1:1
  │
Payment ──── 1:N ──── Refund
```

### 4.2 Indexing Strategy

| Table | Index | Type | Reason |
|---|---|---|---|
| `users` | `email` | UNIQUE B-Tree | Login lookup |
| `products` | `category_id` | B-Tree | Filter by category |
| `products` | `price` | B-Tree | Range queries |
| `products` | `is_active, created_at` | Composite | Active listing |
| `cart_items` | `cart_id` | B-Tree | Load cart |
| `orders` | `user_id, created_at` | Composite | Order history |
| `orders` | `status` | Partial (pending) | Status polling |
| `payments` | `idempotency_key` | UNIQUE B-Tree | Idempotency |
| `payments` | `gateway_txn_id` | B-Tree | Webhook lookup |
| `order_items` | `order_id` | B-Tree | Load order items |

---

## 5. Sequence Diagrams

### 5.1 — User Login & JWT Issuance

```
Client          API Gateway         UserService         MySQL (users_db)
  │                  │                   │                      │
  │──POST /login────►│                   │                      │
  │                  │──forward request─►│                      │
  │                  │                   │──SELECT by email────►│
  │                  │                   │◄─── User record ─────│
  │                  │                   │                      │
  │                  │                   │  verify password     │
  │                  │                   │  (bcrypt compare)    │
  │                  │                   │                      │
  │                  │                   │  generate JWT        │
  │                  │                   │  (RS256, 15min TTL)  │
  │                  │                   │                      │
  │                  │◄── {token, user}──│                      │
  │◄──200 + JWT ─────│                   │                      │
  │                  │                   │                      │
  │  [Subsequent requests include]       │                      │
  │──GET /products ──►│                   │                      │
  │  Authorization:  │                   │                      │
  │  Bearer <JWT>    │                   │                      │
  │                  │──validate JWT     │                      │
  │                  │  (local, no DB)   │                      │
  │                  │──route to service─►                      │
```

---

### 5.2 — Product Search via Elasticsearch (CDC Flow)

```
ProductService     CDC Connector     Kafka (Buffer)    SearchService    Elasticsearch
     │                   │                 │                 │                │
     │  [Product saved]  │                 │                 │                │
     │──DB write────────►│                 │                 │                │
     │                   │  poll binlog    │                 │                │
     │                   │──CDC Event─────►│                 │                │
     │                   │                 │──Consume───────►│                │
     │                   │                 │                 │──index/update──►│
     │                   │                 │                 │◄─ACK────────────│
     │                   │                 │◄──commit offset─│                │

  [Client Searches]
Client          API Gateway      SearchService         Elasticsearch
  │                  │                 │                      │
  │─GET /search?q=──►│                 │                      │
  │                  │──forward───────►│                      │
  │                  │                 │──DSL query──────────►│
  │                  │                 │◄── product IDs ───────│
  │                  │                 │──fetch product details from ProductService
  │                  │◄──SearchResult──│                      │
  │◄──200 Results────│                 │                      │
```

---

### 5.3 — Checkout & Payment Flow

```
Client      API Gateway   CheckoutService   PaymentService   PaymentGateway   OrderDB
  │               │               │               │               │               │
  │─POST /checkout►│               │               │               │               │
  │               │──────────────►│               │               │               │
  │               │               │ lock inventory │               │               │
  │               │               │ create order   │               │               │
  │               │               │──────────────────────────────►│               │
  │               │               │               │               │──charge card──►│
  │               │               │               │               │◄─Success/Fail──│
  │               │               │               │◄──GW Response─│               │
  │               │               │◄──PaymentResult│               │               │
  │               │               │                               save payment    │
  │               │               │──────────────────────────────────────────────►│
  │               │               │ update order status (CONFIRMED/FAILED)        │
  │               │◄──OrderDTO────│               │               │               │
  │◄──201 Created──│               │               │               │               │
```

---

## 6. Design Patterns Used

### 6.1 Factory Pattern — Payment Gateway Selection

```
PaymentGatewayFactory
  │
  ├── create("STRIPE")   → StripeGateway
  ├── create("RAZORPAY") → RazorpayGateway
  └── create("PAYPAL")   → PayPalGateway
```

Used in `PaymentService` to decouple gateway selection from business logic. New gateways can be added without modifying existing code (Open/Closed Principle).

### 6.2 Singleton Pattern — Database Connection Pool

Each service holds a single, shared connection pool instance. Prevents connection explosion and enables pool reuse across request threads.

### 6.3 Repository Pattern — Data Access Abstraction

All data access goes through an interface (`IProductRepository`, `IOrderRepository`, etc.). Enables:
- Easy test mocking
- Swapping underlying DB without changing business logic

### 6.4 Observer / Event-Driven Pattern — CDC Pipeline

The `ProductService` publishes domain events to the CDC connector whenever the `products` table changes. The `SearchService` is a subscriber. This decouples search indexing from writes.

### 6.5 Strategy Pattern — Search Filtering

`SearchService` uses pluggable filter strategies: `PriceRangeFilter`, `CategoryFilter`, `InStockFilter`. Each filter is an independent strategy that composes into a single Elasticsearch DSL query.

### 6.6 Saga Pattern — Distributed Checkout Transaction

Because `CheckoutService`, `PaymentService`, and `ProductService` span 3 databases, a 2PC is not feasible. Instead, a **Choreography Saga** is used:

```
Step 1: CheckoutService reserves inventory (optimistic lock)
Step 2: PaymentService processes payment
  ├── SUCCESS → CheckoutService confirms order
  └── FAILURE → CheckoutService releases inventory (compensating tx)
```

### 6.7 Circuit Breaker Pattern — Service-to-Service Calls

All inter-service HTTP calls (e.g., CartService calling ProductService for price validation) are wrapped in a circuit breaker (Hystrix/Resilience4j):

```
CLOSED (normal) → failure threshold exceeded → OPEN (fail fast)
OPEN → half-open probe → CLOSED (if recovered)
```

---

## 7. SOLID Principles Applied

| Principle | Implementation |
|---|---|
| **S** — Single Responsibility | `CartService` only manages cart state; pricing lives in `ProductService` |
| **O** — Open/Closed | `PaymentGatewayFactory` adds new gateways without modifying existing code |
| **L** — Liskov Substitution | Any `IPaymentGateway` implementation is substitutable in `PaymentService` |
| **I** — Interface Segregation | `IUserRepository` separated from `ITokenService`; clients only depend on what they need |
| **D** — Dependency Inversion | All services depend on interfaces, not concrete implementations |

---

*End of LLD Document*