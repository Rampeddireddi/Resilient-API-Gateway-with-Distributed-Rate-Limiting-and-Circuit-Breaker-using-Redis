# API Gateway with Distributed Rate Limiting and Circuit Breaker (Redis)

##  Overview

This project implements an **API Gateway** using **Express.js** that provides:

* Distributed **Rate Limiting** using Redis (Token Bucket)
* **Circuit Breaker** for upstream fault tolerance
* Request **proxying** to an upstream service
* Fully **Dockerized** setup

The system ensures **scalability, resilience, and controlled traffic handling** in a distributed environment.

---

##  Architecture

```mermaid
flowchart LR
    Client -->|HTTP Request| Gateway[API Gateway (Express)]
    Gateway -->|Rate Limit Check| Redis[(Redis)]
    Gateway -->|Circuit Breaker Check| Redis
    Gateway -->|Forward Request| Upstream[Upstream Service]
    Upstream --> Gateway
    Gateway --> Client
```

---

## Features

###  1. Distributed Rate Limiting (Token Bucket)

* Uses Redis to maintain shared state across instances
* Implements **Token Bucket algorithm**
* Controls burst traffic efficiently
* Returns:

  * `429 Too Many Requests`
  * Includes `Retry-After` header

---

###  2. Circuit Breaker

* Prevents cascading failures when upstream is unhealthy
* States:

  * **CLOSED** → Normal flow
  * **OPEN** → Blocks requests
  * **HALF_OPEN** → Tests recovery
* Automatically transitions between states

---

###  3. API Proxy

* Forwards requests to upstream service
* Preserves:

  * HTTP method
  * Headers
  * Query params
  * Body
* Returns upstream response **as-is**

---

###  4. Fault Tolerance

* Safe Redis error handling
* Circuit breaker uses **fail-open strategy**
* Prevents system crashes

---

##  Project Structure

```
My-Api-Gateway/
│
├── proxy-service/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── proxy_routes.js
│   │   │   └── health_routes.js
│   │   ├── services/
│   │   │   ├── proxy_service.js
│   │   │   ├── rate_limiter.js
│   │   │   ├── circuit_breaker.js
│   │   │   └── redis_client.js
│   │   ├── config/
│   │   │   └── settings.js
│   │   ├── utils/
│   │   │   └── logger.js
│   │   │
│   │   └── main.js
│   └── Dockerfile
│
├── upstream-service/
│   ├── src/
│   │   └── main.js
│   └── Dockerfile
│
└── docker-compose.yml
```

---

##  Running the Project

### 1. Build and Start

```bash
docker-compose up --build
```

---

### 2. Services

| Service          | Port |
| ---------------- | ---- |
| Proxy Service    | 5000 |
| Upstream Service | 5001 |
| Redis            | 6379 |

---

##  API Endpoints

###  Health Check

```bash
curl http://localhost:5000/health
```

Response:

```json
{
  "status": "healthy"
}
```

---

### Proxy Request

```bash
curl http://localhost:5000/proxy/hello
```

Response:

```json
{
  "message": "Hello from upstream"
}
```

---

##  Rate Limiting Test

```bash
for i in {1..150}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/proxy/hello; done
```

Expected behavior:

* Initial requests → `200`
* After limit → `429`

Check headers:

```bash
curl -i http://localhost:5000/proxy/hello
```

---

##  Circuit Breaker Test

Trigger failures:

```bash
for i in {1..10}; do curl -i http://localhost:5000/proxy/fail; done
```

Expected:

* First few → `500`
* Then → `503`

---

### Recovery Test

Wait ~30 seconds:

```bash
curl http://localhost:5000/proxy/hello
```

---

##  Configuration

Environment variables (via Docker):

```
PORT=5000
UPSTREAM_URL=http://upstream-service:5001

REDIS_HOST=redis
REDIS_PORT=6379

RATE_LIMIT_CAPACITY=100
RATE_LIMIT_REFILL_RATE=10

CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT_SECONDS=30
CIRCUIT_BREAKER_HALF_OPEN_SUCCESS_THRESHOLD=3
```

---

##  Design Decisions

###  Redis for Distributed State

Ensures consistent rate limiting and circuit breaker behavior across multiple instances.

---

###  Token Bucket Algorithm

* Allows bursts
* Smooth refill over time
* Simple and efficient

---

###  Circuit Breaker Strategy

* Prevents system overload
* Uses **fail-open approach** for resilience

---

###  Lua Script Consideration

A Lua-based atomic approach was initially explored to eliminate race conditions.

However:

* Redis client compatibility issues
* Increased debugging complexity in Docker

Led to using **Redis HGET/HSET approach**, which:

* Maintains distributed consistency
* Provides stable and maintainable implementation

---

##  Testing

* Unit testing: **Jest**
* API testing: **Supertest**

Run:

```bash
npm test
```

---

##  Summary

This project demonstrates:

* Distributed systems using Redis
* API Gateway architecture
* Rate limiting implementation
* Circuit breaker pattern
* Fault-tolerant design

---

##  Conclusion

The system is:

*  Scalable
*  Fault-tolerant
*  Distributed
*  Dockerized
*  Production-ready (basic level)

