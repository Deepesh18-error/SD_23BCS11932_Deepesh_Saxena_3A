# ⚡ Scalability & Reliability — E-Commerce Platform

> **Version:** 1.0 | **Target:** 1M DAU, 10K concurrent users, 99.9% uptime SLA

---

## Table of Contents

1. [System Capacity Estimation](#1-system-capacity-estimation)
2. [Load Balancing Strategy](#2-load-balancing-strategy)
3. [Horizontal vs Vertical Scaling](#3-horizontal-vs-vertical-scaling)
4. [Caching Strategy](#4-caching-strategy)
5. [Database Scaling](#5-database-scaling)
6. [CDC Pipeline Scaling](#6-cdc-pipeline-scaling)
7. [Failure Handling & Resilience](#7-failure-handling--resilience)
8. [Bottlenecks & Optimizations](#8-bottlenecks--optimizations)
9. [Observability & Monitoring](#9-observability--monitoring)
10. [Disaster Recovery](#10-disaster-recovery)

---

## 1. System Capacity Estimation

### Traffic Estimates

| Metric | Value |
|---|---|
| Daily Active Users (DAU) | 1,000,000 |
| Peak Concurrent Users | 10,000 |
| Avg. Requests per User/Day | 30 |
| Total Daily Requests | 30,000,000 |
| Peak QPS (10× avg) | ~3,500 req/s |
| Avg. Request Size | 2 KB |
| Avg. Response Size | 20 KB |

### Storage Estimates (at 1 Year)

| Data Type | Volume |
|---|---|
| Users | 5 GB |
| Products (with images metadata) | 50 GB |
| Orders | 200 GB |
| Payments | 30 GB |
| Elasticsearch Index | 100 GB |
| Logs & Audit Trails | 500 GB/year |
| **Total** | **~900 GB** |

### Peak Events

| Event | Multiplier | Action Required |
|---|---|---|
| Flash Sale | 20× normal traffic | Pre-scale + warm cache |
| Holiday Season | 5× normal traffic | Auto-scale + CDN pre-warm |
| Product Launch | 10× search traffic | ES replica boost |

---

## 2. Load Balancing Strategy

### API Gateway as L7 Load Balancer

The API Gateway (e.g., AWS API Gateway + Kong, or NGINX) serves as the primary L7 load balancer with the following capabilities:

```
Internet
    │
    ▼
[ CloudFront CDN ]           ← Static assets, cacheable API responses
    │
    ▼
[ AWS Application Load Balancer ]  ← L4 entry point, SSL termination
    │
    ▼
[ API Gateway Cluster ]      ← Routing, Auth, Rate Limiting, L7 balancing
    │
    ├──► UserService Pods      (3 replicas)
    ├──► SearchService Pods    (2 replicas)
    ├──► ProductService Pods   (4 replicas)
    ├──► CartService Pods      (3 replicas)
    ├──► CheckoutService Pods  (2 replicas)
    ├──► OrderService Pods     (2 replicas)
    └──► PaymentService Pods   (3 replicas)
```

### Load Balancing Algorithms

| Layer | Algorithm | Reason |
|---|---|---|
| ALB → API Gateway | Least Outstanding Requests | Even distribution considering response times |
| API Gateway → Services | Round Robin | Stateless services; equal capacity nodes |
| Cart/Session Services | Consistent Hashing | Pinning user to node improves Redis hit rate |
| Payment Service | Least Connections | Variable processing times |

### Health Checks

```yaml
healthCheck:
  path: /health/live       # Liveness probe — is process alive?
  readiness: /health/ready # Readiness — is service ready for traffic?
  interval: 15s
  timeout: 5s
  unhealthyThreshold: 2
  healthyThreshold: 3
```

---

## 3. Horizontal vs Vertical Scaling

### Scaling Decision Matrix

| Service | Strategy | Reason |
|---|---|---|
| UserService | Horizontal | Stateless (JWT), scales linearly |
| SearchService | Horizontal | Read-heavy; add ES replicas |
| ProductService | Horizontal | Stateless; DB bottleneck handled separately |
| CartService | Horizontal | Redis handles session state |
| CheckoutService | Horizontal | Saga-based; stateless per request |
| PaymentService | Horizontal | Stateless per transaction; idempotency key in DB |
| API Gateway | Horizontal | Critical path; auto-scale aggressively |

### Kubernetes HPA Configuration (Example: ProductService)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: product-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: product-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65   # Scale up before saturation
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "500"
```

### Vertical Scaling (Databases)

Databases are scaled **vertically first**, then horizontally:

```
Phase 1 (0–100K DAU):   db.t3.medium  →  db.r6g.large
Phase 2 (100K–1M DAU):  db.r6g.large  →  db.r6g.4xlarge
Phase 3 (1M+ DAU):      Read replicas + Sharding
```

---

## 4. Caching Strategy

### Cache Layers Overview

```
Browser Cache
    │  (static assets, product images — max-age: 1 year)
    ▼
CloudFront CDN
    │  (product pages, API responses — TTL: 5 min)
    ▼
API Gateway Response Cache
    │  (search results — TTL: 30s)
    ▼
Redis (Application Cache)
    │  (sessions, cart, product details — TTL: varies)
    ▼
Database / Elasticsearch
```

### Redis Cache Strategy by Entity

| Entity | Cache Key | TTL | Invalidation |
|---|---|---|---|
| Product Detail | `product:{id}` | 10 min | Write-through on update |
| Category List | `categories:all` | 1 hour | Write-through on admin update |
| Search Results | `search:{hash(query)}` | 30 sec | CDC-triggered expiry |
| Cart | `cart:{user_id}` | 24 hours | Write-through on every cart op |
| JWT Blacklist | `revoked:{jti}` | Token TTL | Set on logout |
| Rate Limit | `rate:{user_id}` | 1 min | TTL expiry |
| Flash Sale Stock | `stock:{product_id}` | 30 sec | Write-through |

### Cache-Aside Pattern (Default)

```
Request
  │
  ▼
Check Redis ──► HIT → Return cached data
  │
  MISS
  │
  ▼
Query Database
  │
  ▼
Store in Redis (with TTL)
  │
  ▼
Return to caller
```

### Write-Through Pattern (Product Stock)

Stock updates are critical — stale cache leads to overselling:

```
Update stock in DB
       │
       ▼ (synchronous)
Update Redis cache
       │
       ▼
Return response
```

### CDN Strategy

- **Static Assets** (images, JS, CSS): S3 + CloudFront → `Cache-Control: max-age=31536000, immutable`
- **Product Images**: Served via CDN with image resizing at edge (WebP conversion)
- **API Responses** (product list, categories): Cached at CloudFront with `Vary: Accept-Language`
- **Cache-Control Headers** set on all API Gateway responses

---

## 5. Database Scaling

### MySQL (users_db) — Read Replica Setup

```
MySQL Primary (Writes)
       │
       ├── Replica 1 (Reads — us-east-1a)
       └── Replica 2 (Reads — us-east-1b)
```

- **Write Path:** Always hits primary
- **Read Path:** User profile reads → replica (eventual consistency acceptable)
- **Failover:** Multi-AZ with automatic promotion (RDS)

---

### PostgreSQL (products_db) — Sharding Strategy

At scale (1M+ SKUs, 10M+ orders), shard by domain:

**Products DB:** Sharded by `category_id` (range sharding)
```
Shard 0: categories 0–999         (Electronics, Phones)
Shard 1: categories 1000–1999     (Clothing, Fashion)
Shard 2: categories 2000–2999     (Home, Kitchen)
```

**Orders DB:** Sharded by `user_id` (hash sharding)
```
Shard = hash(user_id) % NUM_SHARDS
```

Advantages:
- All orders for a user are on the same shard
- User-level queries are shard-local (no fan-out)

### Connection Pooling

**PgBouncer** in transaction mode between each microservice and PostgreSQL:

```
ProductService (4 pods × 10 connections) = 40 app connections
       ▼
PgBouncer (pool: 20 server connections)
       ▼
PostgreSQL (max_connections: 200 total)
```

This reduces PostgreSQL connection count by 5–10×.

---

### Elasticsearch Scaling

```
ES Cluster (Production)
├── Master Nodes: 3 (dedicated, not data nodes)
├── Data Nodes: 6 (3 primary + 3 replica shards per index)
└── Coordinating Nodes: 2 (handle search fan-out)
```

- **Read Scaling:** Increase replica count → more parallel search capacity
- **Write Scaling:** Increase shard count → parallel ingestion
- **Hot-Warm Architecture:** Recent products on SSD (hot), archived on HDD (warm)

---

## 6. CDC Pipeline Scaling

### Architecture

```
PostgreSQL (products_db)
    │  (WAL — Write-Ahead Log)
    ▼
Debezium Connector (reads binlog/WAL)
    │
    ▼
Apache Kafka (Streaming Service — Buffer)
    │  Topic: product-changes (partitions: 12)
    ▼
Kafka Consumer (SearchService)
    │
    ▼
Elasticsearch Bulk Indexer
```

### Kafka Throughput

| Parameter | Value |
|---|---|
| Topic Partitions | 12 |
| Replication Factor | 3 |
| Consumer Group Size | 6 (1 consumer per 2 partitions) |
| Max Batch Size | 500 events |
| Commit Interval | 1 second |
| Expected Lag (P99) | < 5 seconds |

### Failure Handling in CDC

- **Debezium offset** stored in Kafka — survives connector restart
- **Dead Letter Queue (DLQ):** Malformed events are routed to `product-changes-dlq` for manual review
- **Exactly-Once Semantics:** Elasticsearch document update is idempotent (upsert by product_id)

---

## 7. Failure Handling & Resilience

### 7.1 Retry Strategy

| Scenario | Strategy | Config |
|---|---|---|
| HTTP timeout between services | Exponential backoff with jitter | Max 3 retries; initial 100ms, max 5s |
| Payment gateway timeout | Retry once after 2s; then DLQ | Idempotency key prevents double charge |
| DB transient error | Retry 2× with linear backoff | 500ms, 1000ms |
| Kafka consumer failure | Auto re-consume from offset | At-least-once delivery |

### Exponential Backoff Formula

```
wait = min(initial_delay × 2^attempt + jitter, max_delay)
jitter = random(0, initial_delay)
```

Example progression (initial=100ms, max=5000ms):
```
Attempt 1: ~100ms
Attempt 2: ~200ms
Attempt 3: ~500ms
```

---

### 7.2 Circuit Breaker Pattern

Implemented using **Resilience4j** for all inter-service HTTP calls:

```
State: CLOSED (normal operations)
   │
   │ ≥5 failures in 10s sliding window
   ▼
State: OPEN (fail fast, no calls made)
   │
   │ After 30s timeout
   ▼
State: HALF-OPEN (single probe call allowed)
   │
   ├─ SUCCESS → CLOSED
   └─ FAILURE → OPEN (reset timer)
```

**Configuration:**
```yaml
circuitBreaker:
  failureRateThreshold: 50        # % failures to open
  waitDurationInOpenState: 30s
  slidingWindowSize: 10
  minimumNumberOfCalls: 5
  permittedCallsInHalfOpenState: 1
```

**Fallback Responses:**
- `ProductService` down → Return cached product from Redis
- `SearchService` down → Return empty results with `503` and `Retry-After`
- `PaymentService` down → Hold order in `PAYMENT_PROCESSING`, retry via queue

---

### 7.3 Bulkhead Pattern

Isolate thread pools per downstream dependency to prevent cascade failures:

```
CheckoutService thread pools:
  ├── pool-payment-service     (max: 10 threads)
  ├── pool-product-service     (max: 20 threads)
  └── pool-cart-service        (max: 10 threads)
```

If PaymentService is slow and fills `pool-payment-service`, it cannot affect threads serving product lookups.

---

### 7.4 Timeout Hierarchy

| Call | Timeout |
|---|---|
| Client → API Gateway | 30 seconds |
| API Gateway → Service | 10 seconds |
| Service → DB | 3 seconds |
| Service → Redis | 200ms |
| Service → Payment Gateway | 15 seconds |

---

### 7.5 Saga Compensating Transactions

Checkout Saga failure handling:

```
Step 1: Reserve Inventory (ProductService)
  └── FAIL → End (no rollback needed)

Step 2: Create Order (CheckoutService)
  └── FAIL → Release Inventory (compensating tx)

Step 3: Charge Payment (PaymentService)
  └── FAIL → Cancel Order + Release Inventory

Step 4: Confirm Order (CheckoutService)
  └── FAIL → Refund Payment + Cancel Order + Release Inventory
```

---

## 8. Bottlenecks & Optimizations

### Identified Bottlenecks

| Bottleneck | Location | Impact |
|---|---|---|
| Inventory check on checkout | DB row-level lock on `products.stock_quantity` | Checkout contention under flash sales |
| Cold search queries | Elasticsearch | Slow first search after index update |
| JWT validation on every request | API Gateway | CPU-intensive RSA verify at high QPS |
| N+1 product fetch in search results | SearchService → ProductService | High latency for search pages |

### Optimizations

**1. Inventory: Optimistic Locking + Redis Stock Counter**
```sql
UPDATE products
SET stock_quantity = stock_quantity - :qty
WHERE id = :id AND stock_quantity >= :qty AND version = :version;
```
For flash sales, maintain stock in Redis (DECR is atomic), sync to DB asynchronously:
```
DECR stock:{product_id}   ← Atomic, no DB hit
```

**2. Search Result Enrichment: Denormalization**
Store essential product data (name, price, image) directly in the Elasticsearch index, eliminating the N+1 call back to ProductService for list views.

**3. JWT: Caching Public Key + Asymmetric Verification**
Cache the JWT public key in API Gateway memory. RS256 verify is CPU-intensive but doesn't require a DB/Redis call — 100% in-memory.

**4. Database Query Optimization**
- Add `EXPLAIN ANALYZE` to all queries in staging before deployment
- Use covering indexes for the most common query patterns
- Materialize expensive aggregates (e.g., order totals) rather than computing on read

**5. Product List: Server-Side Rendering Cache**
Cache full rendered product list pages (JSON) in Redis for 60 seconds. A single cache miss triggers a DB query; subsequent 60s of requests are served from cache. At 1000 req/min, this eliminates 996 DB queries/min.

---

## 9. Observability & Monitoring

### Three Pillars of Observability

**Metrics (Prometheus + Grafana)**
```
Key Metrics Per Service:
  - http_request_duration_seconds (P50, P95, P99)
  - http_requests_total (by endpoint, status code)
  - db_query_duration_seconds
  - cache_hit_ratio
  - circuit_breaker_state
  - kafka_consumer_lag
```

**Logging (Structured JSON → ELK Stack)**
```json
{
  "timestamp": "2025-07-01T12:00:00Z",
  "level": "ERROR",
  "service": "payment-service",
  "trace_id": "abc123",
  "span_id": "def456",
  "user_id": "usr_...",
  "order_id": "ord_...",
  "message": "Payment gateway timeout after 15s",
  "gateway": "RAZORPAY"
}
```

**Distributed Tracing (Jaeger / AWS X-Ray)**

Every request propagates `X-Trace-ID` through all service calls, enabling end-to-end request visualization across 7 microservices.

### Alerting Rules

| Alert | Condition | Severity |
|---|---|---|
| High Error Rate | `error_rate > 1%` for 2 min | Critical |
| Slow API | `P99 latency > 2s` for 5 min | Warning |
| Circuit Breaker Open | Any service circuit open | Critical |
| Kafka Lag | Consumer lag > 10,000 events | Warning |
| DB Connections | `connections > 80%` of max | Warning |
| Redis Memory | `used_memory > 85%` | Warning |

---

## 10. Disaster Recovery

### Recovery Objectives

| Metric | Target |
|---|---|
| RTO (Recovery Time Objective) | < 30 minutes |
| RPO (Recovery Point Objective) | < 5 minutes |
| Uptime SLA | 99.9% (8.7 hours downtime/year) |

### Backup Strategy

| Component | Backup Frequency | Retention | Method |
|---|---|---|---|
| MySQL (users) | Continuous + daily snapshot | 30 days | RDS automated + S3 |
| PostgreSQL (orders) | Continuous WAL + daily | 90 days | WAL archiving to S3 |
| Redis | RDB snapshot every 15min | 7 days | ElastiCache snapshot |
| Elasticsearch | Daily index snapshot | 30 days | S3 snapshot API |

### Multi-AZ Deployment

```
Region: ap-south-1 (Primary)
├── AZ-1 (ap-south-1a): API Gateway, Services, DB Primary
├── AZ-2 (ap-south-1b): Services, DB Replica, Redis
└── AZ-3 (ap-south-1c): Services, DB Replica

Region: us-east-1 (DR)
└── Warm standby — activated on primary region failure
    (DNS failover via Route 53 health checks, ~5 min cutover)
```

---

*End of Scalability & Reliability Document*