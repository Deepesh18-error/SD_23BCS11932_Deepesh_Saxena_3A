# 🛒 E-Commerce Platform — System Design

> **A production-grade, cloud-native, microservices e-commerce platform**  
> Designed for 500K+ concurrent users | 99.99% SLA | Sub-200ms P99 latency

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Assumptions](#3-assumptions)
4. [Tech Stack & Justification](#4-tech-stack--justification)
5. [Service Breakdown](#5-service-breakdown)
6. [Data Flow Walkthrough](#6-data-flow-walkthrough)
7. [Trade-offs](#7-trade-offs)
8. [Future Improvements](#8-future-improvements)
9. [Document Index](#9-document-index)

---

## 1. Project Overview

This project presents the complete system design for a **scalable, highly available e-commerce platform** — similar in scope to Amazon, Flipkart, or Myntra. The design encompasses the entire user journey from product discovery through to checkout and payment, built on a microservices architecture deployed on cloud infrastructure.

### Key Capabilities

| Capability                  | Detail                                                          |
|-----------------------------|-----------------------------------------------------------------|
| 🔐 Authentication           | JWT-based auth with access/refresh tokens, role-based access   |
| 🔍 Product Search           | Elasticsearch-powered full-text search with faceted filters     |
| 🛍️ Product Catalog          | Multi-category product management with EAV attribute model      |
| 🛒 Shopping Cart            | Persistent cart with real-time price validation                 |
| 📦 Order Management         | Full order lifecycle: placed → confirmed → shipped → delivered  |
| 💳 Payment Processing       | Multi-gateway payment support with idempotency & retry logic    |
| 🔄 Real-time Sync (CDC)     | Debezium CDC pipeline for DB → Elasticsearch synchronization    |
| ⚡ Caching                  | 3-layer cache (CDN → Redis → DB) for read-heavy workloads       |
| 📊 Observability            | Distributed tracing, metrics (Prometheus), centralized logging  |

---

## 2. High-Level Architecture

```
                              ┌────────────────────────────────────────────────────────────┐
                              │                    CLIENT LAYER                             │
                              │         Web App (React) │ Mobile App (Flutter)             │
                              └─────────────────────────┬──────────────────────────────────┘
                                                        │  HTTPS
                              ┌─────────────────────────▼──────────────────────────────────┐
                              │                      CDN                                    │
                              │              (CloudFront / Akamai)                          │
                              │        Static assets, cacheable API responses                │
                              └─────────────────────────┬──────────────────────────────────┘
                                                        │
                              ┌─────────────────────────▼──────────────────────────────────┐
                              │                   API GATEWAY                               │
                              │   Routing │ Auth Validation │ Rate Limiting │ Load Balancing │
                              └──┬────┬──────┬───────┬──────────┬────────────────┬──────────┘
                                 │    │      │       │          │                │
                    ┌────────────▼┐ ┌─▼──────▼┐ ┌───▼─────┐ ┌─▼──────┐ ┌──────▼──┐ ┌──────────────┐
                    │ User Service│ │ Product  │ │ Search  │ │ Cart   │ │ Order   │ │ Checkout /   │
                    │             │ │ Service  │ │ Service │ │ Service│ │ Status  │ │ Payment Svc  │
                    └──────┬──────┘ └────┬─────┘ └────┬────┘ └────┬───┘ └─────────┘ └──────────────┘
                           │             │             │           │
                    ┌──────▼─┐  ┌────────▼──┐  ┌──────▼──────┐ ┌─▼──────┐
                    │ MySQL  │  │PostgreSQL │  │Elasticsearch│ │Postgre │
                    │(Users) │  │(Products) │  │             │ │SQL Cart│
                    └────────┘  └─────┬─────┘  └──────▲──────┘ └────────┘
                                      │                │
                              ┌───────▼────────────────┴──────────────────────────┐
                              │                  CDC PIPELINE                       │
                              │    Debezium Connector → Kafka → Streaming Service  │
                              └────────────────────────────────────────────────────┘
```

---

## 3. Assumptions

The following assumptions were made during the design process:

### Business Assumptions
1. **Platform Type:** B2C marketplace (customers buy from registered sellers)
2. **Geography:** Primarily India-based, with APAC expansion planned
3. **Payment:** Integration with Indian payment gateways (Razorpay, PhonePe, Paytm)
4. **Currency:** Primary currency INR; multi-currency support in Phase 2
5. **Delivery:** Third-party logistics integration (Delhivery, Shiprocket) — not designed here
6. **Tax/GST:** Handled at the application layer (not in this scope)
7. **Reviews & Ratings:** Out of scope for this iteration

### Traffic Assumptions
8. **Peak Traffic:** 500,000 concurrent users during sale events (e.g., Big Billion Day)
9. **Normal Traffic:** 50,000 concurrent users on typical days
10. **Read:Write Ratio:** 80:20 (browsing/search is far more common than purchases)
11. **Data Volume:** 10 million products, 5 million registered users at launch
12. **Order Volume:** Up to 10,000 orders/second during flash sales

### Technical Assumptions
13. **Infrastructure:** AWS (primary cloud provider)
14. **Orchestration:** Kubernetes (EKS) for container management
15. **Service Communication:** REST for external, gRPC for internal service-to-service
16. **Mobile clients** handle JWT refresh independently
17. **Payment Gateway SDK** handles PCI DSS — we never store raw card data
18. **Elasticsearch** is managed (AWS OpenSearch) — no self-hosted cluster management
19. **All services** are independently deployable (CI/CD per service)
20. **Minimum order amount:** ₹1 (prevents test/fraudulent transactions at zero)

---

## 4. Tech Stack & Justification

### 4.1 Core Services

| Component            | Technology        | Justification                                                          |
|----------------------|-------------------|------------------------------------------------------------------------|
| **Backend Language** | Java 21 (Spring Boot 3) | Mature ecosystem, excellent microservices support (Spring Cloud), strong type safety, large talent pool in India |
| **API Framework**    | Spring Web MVC    | Battle-tested, excellent REST support, integrates with Spring Security |
| **Service Mesh**     | Istio             | mTLS between services, traffic management, observability               |
| **Container Orch.**  | Kubernetes (EKS)  | Industry standard, excellent autoscaling, AWS-managed control plane    |

### 4.2 Databases

| Database            | Technology          | Justification                                                     |
|---------------------|---------------------|-------------------------------------------------------------------|
| **User DB**         | MySQL 8.0           | ACID compliance for auth data; excellent for relational user data; strong at single-row lookups by email |
| **Product DB**      | PostgreSQL 16       | JSONB for flexible attributes, LTREE for category hierarchy, strong indexing (GIN, GiST), pg_trgm for fuzzy search fallback |
| **Cart DB**         | PostgreSQL 16       | Consistent transactional cart updates; integrates well with Product queries |
| **Order DB**        | PostgreSQL 16       | Complex joins (order + items + payments), ACID compliance for financial data |
| **Payment DB**      | PostgreSQL 16       | Financial-grade ACID; audit trail; idempotency key constraints     |
| **Search Engine**   | Amazon OpenSearch   | Best-in-class full-text search, faceting, geosearch; managed service eliminates ops overhead |
| **Cache**           | Redis 7 (Cluster)   | Sub-millisecond latency; atomic operations (INCR for rate limit, DECRBY for inventory); pub/sub for real-time events |

**Why not MongoDB?** Our data is highly relational (orders → items → products → inventory). MongoDB's flexible schema would lose the foreign key constraints and transaction guarantees we need for financial correctness.

**Why not DynamoDB?** Limited query flexibility (no complex joins, no full-text search). Better suited for key-value access patterns than our product/order domain.

### 4.3 Messaging & Streaming

| Component             | Technology       | Justification                                                         |
|-----------------------|------------------|-----------------------------------------------------------------------|
| **Message Broker**    | Apache Kafka     | High throughput (millions of events/sec), durable log, replay capability for CDC; industry standard for event streaming |
| **CDC Connector**     | Debezium         | Battle-tested PostgreSQL WAL reader; zero-impact on source DB; exactly-once semantics with Kafka |
| **Stream Processing** | Kafka Streams    | Lightweight; no separate cluster needed; transforms events before ES indexing |

**Why not RabbitMQ?** Kafka's persistent log allows replay (re-index Elasticsearch on demand), which RabbitMQ can't provide. Also, Kafka scales horizontally far better for our CDC use case.

### 4.4 Infrastructure

| Component           | Technology           | Justification                                              |
|---------------------|----------------------|------------------------------------------------------------|
| **CDN**             | AWS CloudFront       | Lowest latency to Indian cities; S3 integration for assets |
| **API Gateway**     | Kong Gateway         | Plugin ecosystem (auth, rate limit, logging); Kubernetes native |
| **Load Balancer**   | AWS ALB              | Layer 7 (HTTP), native EKS integration, WAF attachment     |
| **Observability**   | Prometheus + Grafana | Open-source, Kubernetes-native metrics collection           |
| **Tracing**         | Jaeger               | OpenTelemetry-compatible distributed tracing               |
| **Logging**         | ELK Stack            | Powerful search/filter on logs; Kibana for visualization   |
| **CI/CD**           | GitHub Actions       | Native GitHub integration, matrix builds per service       |
| **IaC**             | Terraform            | Multi-cloud portable, state management, team workflows     |

### 4.5 Security

| Concern            | Solution                                                              |
|--------------------|-----------------------------------------------------------------------|
| **Auth**           | JWT (HS256 for access, RS256 for refresh) + RBAC                     |
| **Secrets**        | AWS Secrets Manager — no hardcoded credentials                       |
| **Transport**      | TLS 1.3 everywhere (client ↔ CDN ↔ Gateway ↔ Services)              |
| **mTLS**           | Istio service mesh for service-to-service                            |
| **PCI Compliance** | Payment SDK handles card data — platform never touches raw card info |
| **SQL Injection**  | Parameterized queries only (JPA/Spring Data)                         |
| **Rate Limiting**  | Kong plugin at API Gateway layer                                     |
| **OWASP Top 10**   | Dependency scanning (Snyk), regular pen-testing, WAF rules           |

---

## 5. Service Breakdown

| Service              | Port | Language   | Database          | Scales To |
|----------------------|------|------------|-------------------|-----------|
| API Gateway (Kong)   | 8080 | —          | Redis (state)     | 20 nodes  |
| User Service         | 8081 | Java/Spring| MySQL             | 10 nodes  |
| Product Service      | 8082 | Java/Spring| PostgreSQL        | 20 nodes  |
| Search Service       | 8083 | Java/Spring| Elasticsearch     | 15 nodes  |
| Cart Service         | 8084 | Java/Spring| PostgreSQL        | 10 nodes  |
| Order Service        | 8085 | Java/Spring| PostgreSQL        | 15 nodes  |
| Checkout Service     | 8086 | Java/Spring| —                 | 15 nodes  |
| Payment Service      | 8087 | Java/Spring| PostgreSQL        | 8 nodes   |
| CDC Connector        | —    | Debezium   | (reads Postgres WAL)| 3 nodes |
| Streaming Service    | —    | Kafka Streams| Kafka           | 6 nodes   |

---

## 6. Data Flow Walkthrough

### 🔐 Flow 1: User Login
```
1. Client → POST /v1/auth/login (email, password)
2. API Gateway → validates request format → routes to User Service
3. User Service → queries MySQL by email → verifies bcrypt password hash
4. If valid → generates JWT (accessToken: 15m, refreshToken: 7d)
5. Stores refreshToken in MySQL (refresh_tokens table)
6. Returns { accessToken, refreshToken } to client
7. Client stores tokens → uses accessToken in Authorization header for all subsequent requests
```

### 🔍 Flow 2: Product Search
```
1. Client → GET /v1/search?q=iPhone+16&minPrice=50000
2. API Gateway → rate check → route to Search Service (no auth required)
3. Search Service → builds Elasticsearch multi-match query
4. ES returns ranked product IDs with relevance scores
5. Search Service → enriches with category/brand facets → returns to client
6. Client displays results with filters
```

### 🛒 Flow 3: Add to Cart → Checkout → Payment
```
1. Add to Cart:
   Client → POST /v1/cart/items { productId, qty }
   Cart Service → checks product exists (Product Service call)
   → checks stock (Inventory Service call)
   → adds to PostgreSQL cart table
   → updates Redis cache
   → returns updated cart

2. Checkout Initiation:
   Client → POST /v1/checkout/initiate
   Checkout Service → validates all cart items still in stock
   → reserves inventory (atomic Redis decrement)
   → creates PENDING order in Order DB
   → initiates payment session with Payment Service
   → returns checkoutSessionId, totalAmount

3. Payment:
   Client SDK (Razorpay/Stripe) → collects card details → returns gateway token
   Client → POST /v1/checkout/{sessionId}/payment { gatewayToken }
   Payment Service → calls Payment Gateway API with token + amount
   Gateway → charges card → returns SUCCESS/FAIL
   Payment Service → updates Payment DB → emits OrderConfirmed event (Kafka)
   Order Service (consumer) → updates Order status to CONFIRMED
   Inventory Service (consumer) → confirms stock deduction
   Email Service (consumer) → sends confirmation email (async)
```

### 🔄 Flow 4: CDC Sync (Product Updates → Elasticsearch)
```
1. Seller updates product price in Product Service
2. PostgreSQL WAL records the UPDATE
3. Debezium reads WAL → publishes to Kafka topic: product.changes
4. Streaming Service consumes → transforms to ES document format
5. Elasticsearch bulk-upserts the product document
6. Search results now reflect updated price (< 1s latency typical)
```

---

## 7. Trade-offs

### 7.1 Microservices vs. Monolith

**Chosen:** Microservices

| Pro ✅                                    | Con ❌                                |
|------------------------------------------|---------------------------------------|
| Each service scales independently        | Higher operational complexity         |
| Teams can own separate services          | Network latency between services      |
| Technology flexibility per service       | Distributed transactions are hard     |
| Fault isolation (one service down ≠ all) | More infrastructure to manage         |

**Decision rationale:** At scale (500K concurrent users, 50+ engineers), the autonomy and scaling benefits outweigh complexity costs. A monolith would create deployment bottlenecks.

### 7.2 Eventual Consistency (CDC Pipeline)

**Chosen:** Eventual consistency for Product DB → Elasticsearch sync

| Pro ✅                                       | Con ❌                                         |
|---------------------------------------------|------------------------------------------------|
| Decoupled — Product Service doesn't know about ES | Up to ~1 second search lag after product update |
| Product Service is not slowed by ES indexing | Complex failure handling (DLQ, replays)        |
| ES can be rebuilt from Kafka history         | Stale search results during incident           |

**Decision rationale:** 1-second search staleness is acceptable for product updates. The decoupling is essential for resilience.

### 7.3 JWT vs. Session Tokens

**Chosen:** JWT

| Pro ✅                                    | Con ❌                                          |
|------------------------------------------|-------------------------------------------------|
| Stateless — no server-side session store | Cannot immediately revoke (until expiry)        |
| Horizontally scalable auth               | Token size larger than opaque tokens            |
| Standard claims (roles, expiry) in token | Key rotation requires careful coordination      |

**Mitigation:** Short-lived access tokens (15min) + JWT blacklist in Redis for immediate revocation on logout/compromise.

### 7.4 Separate Database Per Service vs. Shared DB

**Chosen:** Separate database per service (strict microservice pattern)

| Pro ✅                                       | Con ❌                                        |
|---------------------------------------------|-----------------------------------------------|
| Full data autonomy per service               | Cross-service joins become API calls           |
| Schema changes don't break other services    | Data duplication (productName in cart_items)  |
| Can choose DB technology best for use case   | No cross-service transactions (use Saga)      |

**Decision rationale:** Data autonomy is core to microservices. Duplication is deliberate (snapshot pattern — cart items preserve the price at time of add, not current price).

### 7.5 Synchronous vs. Asynchronous Checkout

**Chosen:** Hybrid — synchronous checkout initiation, asynchronous payment confirmation

| Step                     | Type         | Reason                                   |
|--------------------------|--------------|------------------------------------------|
| Cart validation          | Synchronous  | User needs immediate feedback on stock   |
| Order creation           | Synchronous  | Idempotency key generated immediately    |
| Payment gateway call     | Asynchronous | External network — poll for status       |
| Email confirmation       | Asynchronous | Not on critical path                     |
| Inventory deduction      | Asynchronous | Reserve immediately; deduct on confirm   |

### 7.6 Redis for Cart vs. Database-Only

**Chosen:** Redis as primary cart store with PostgreSQL for persistence

| Pro ✅                                    | Con ❌                                        |
|------------------------------------------|-------------------------------------------------|
| Sub-millisecond cart reads               | Additional infrastructure                      |
| Atomic operations for concurrent updates | Cache invalidation complexity                   |
| Reduced DB load for frequent reads       | Risk of Redis data loss (mitigated by AOF/RDB) |

---

## 8. Future Improvements

### Phase 2 — Near-Term (3–6 months)

| Improvement                      | Benefit                                              |
|----------------------------------|------------------------------------------------------|
| **GraphQL API**                  | Mobile clients can request exactly the fields needed; reduces over-fetching |
| **Product Recommendations**      | Collaborative filtering (ALS) using purchase history; improves discovery |
| **Seller Dashboard**             | Real-time inventory management, order analytics, bulk upload |
| **Coupon & Promotions Engine**   | Rule-based discount system (%, flat, BOGO, category-specific) |
| **Reviews & Ratings Service**    | Separate microservice with ML-based spam detection |
| **Wishlist Service**             | Simple Redis + PostgreSQL backed wishlist |

### Phase 3 — Medium-Term (6–12 months)

| Improvement                      | Benefit                                              |
|----------------------------------|------------------------------------------------------|
| **Event Sourcing (Order Service)**| Full audit log; ability to replay state for debugging/refunds |
| **CQRS Pattern**                 | Separate read/write models for Order/Product service; optimized query paths |
| **ML Personalization**           | Personalized search ranking using user behavior (clicks, purchases) |
| **Real-time Inventory Updates**  | WebSocket push to clients during flash sales (avoid overselling) |
| **Multi-currency Support**       | Forex API integration; currency selection per user   |
| **A/B Testing Platform**         | Feature flags + experiment tracking for UI and ranking tests |

### Phase 4 — Long-Term (12–24 months)

| Improvement                      | Benefit                                              |
|----------------------------------|------------------------------------------------------|
| **Global Expansion**             | Multi-region active-active deployment; GeoDNS routing |
| **Fraud Detection**              | Real-time ML scoring on payment + account events     |
| **Supply Chain Integration**     | Direct integration with warehouse management systems |
| **Voice Search**                 | NLP-powered voice search via Alexa/Google Assistant SDK |
| **AR Product Visualization**     | "Try before you buy" AR feature for fashion/furniture |
| **Autonomous Pricing**           | Dynamic pricing engine based on demand, competition, inventory |
| **Sustainability Tracking**      | Carbon footprint per order; eco-delivery options     |

### Technical Debt to Address

1. **Saga Pattern for distributed transactions** — Currently payment+inventory+order use compensating transactions manually; a proper Saga orchestrator (Temporal.io) would codify this
2. **Service mesh upgrade** — Move from Istio to Cilium eBPF for lower overhead
3. **Database migration strategy** — Formalize schema migration pipeline (Flyway) with zero-downtime requirements documented per service
4. **Chaos engineering** — Implement Chaos Monkey / LitmusChaos to proactively test failure scenarios
5. **Cost optimization** — Spot instances for batch/CDC jobs, reserved capacity for critical services

---

## 9. Document Index

| Document         | Path           | Contents                                              |
|------------------|----------------|-------------------------------------------------------|
| **This file**    | `README.md`    | Overview, assumptions, tech stack, trade-offs         |
| Low-Level Design | `LLD.md`       | Class diagrams, DB schema, sequence diagrams, patterns|
| API Design       | `api.md`       | REST endpoints, request/response formats, rate limits |
| Scalability      | `scaling.md`   | Caching, sharding, circuit breakers, monitoring       |

---

## 10. Quick Reference — Key Design Decisions

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DECISION SUMMARY                                 │
├────────────────────────┬────────────────────────────────────────────┤
│ Architecture           │ Microservices (8 core services)            │
│ Auth                   │ JWT (15min access + 7day refresh)          │
│ User DB                │ MySQL 8.0 (strong relational auth)         │
│ Product/Order/Cart DB  │ PostgreSQL 16 (JSONB, LTREE, ACID)        │
│ Search                 │ Amazon OpenSearch (managed ES)             │
│ Cache                  │ Redis 7 Cluster (3+3 nodes)                │
│ Messaging              │ Apache Kafka (CDC + async events)          │
│ CDC                    │ Debezium → Kafka → OpenSearch              │
│ Container Orch.        │ Kubernetes (AWS EKS)                       │
│ API Gateway            │ Kong (auth, rate limit, routing)           │
│ Consistency Model      │ Strong (payments), Eventual (search sync)  │
│ Deployment Strategy    │ Blue-Green (zero downtime deploys)         │
│ Observability          │ Prometheus + Grafana + Jaeger + ELK        │
└────────────────────────┴────────────────────────────────────────────┘
```

---

*E-Commerce Platform System Design v1.0*  
*Designed for production scale — 500K+ concurrent users*  
*System Design Team | 2025*