# Deployment Guide

Covers three deployment modes for the Sentience IoT platform:

1. **Frontend-only demo** — static UI on Vercel with mock data, no backend required.
2. **Full demo with real-time simulator** — interactive demo with live MQTT telemetry.
3. **Production-style deployment** — managed services, real auth, production MQTT.

---

## 1. Frontend-Only Demo

Deploy just the Next.js app to Vercel. All pages render with inline mock/static data. No database, MQTT broker, or API service needed.

### Prerequisites

- A [Vercel](https://vercel.com) account (free tier works)
- The repository pushed to GitHub (or another supported Git provider)
- Node.js 18+ locally for build verification

### Vercel configuration

| Setting | Value |
|---------|-------|
| **Root directory** | `apps/web` |
| **Build command** | `pnpm build` |
| **Install command** | `pnpm install` |
| **Output directory** | Next.js default (`.next`) |
| **Node version** | 18.x or 20.x |

### Environment variables

None required. The app uses default values when variables are absent:

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | Not used during static generation |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | Not used without real-time layer |

### Steps

1. Push the repository to GitHub.
2. In Vercel, import the repo. Select the `sass` monorepo.
3. Set **Root Directory** to `apps/web`.
4. Set **Framework Preset** to `Next.js`.
5. Vercel detects `pnpm` from the lockfile automatically.
6. Deploy. No environment variables are needed for the static build.

### What works

- All 21 pages render (login, dashboard, devices, alerts, etc.)
- Dark/light theme toggle
- Navigation and layout
- All charts and tables display static/mock data
- Login accepts any email (mock auth — persists session to localStorage)

### What does not work (without a backend)

- Real API data (TanStack Query fetches return empty)
- Real-time socket updates
- MQTT telemetry streaming
- Actual authentication (login is mocked, no JWT validation)
- Export/CSV/PDF generation
- Notification persistence

### Build output (reference)

```
Route (app)                              Size  First Load JS
┌ ○ /                                   123 B         102 kB
├ ○ /dashboard                         3.98 kB         113 kB
├ ○ /devices                           3.87 kB         112 kB
... (21 pages total)
+ First Load JS shared by all          102 kB
```

---

## 2. Full Demo with Real-Time Simulator

Deploy the complete stack: Next.js frontend, Socket.IO service, MQTT broker, and database.

### Service Architecture

```
┌──────────────┐      HTTP/WS      ┌──────────────┐
│   Vercel     │ ◄───────────────►  │  Socket.IO   │
│  (Next.js)   │                    │   Service    │
└──────────────┘                    └──────┬───────┘
       │                                    │
       │ REST API                           │ MQTT subscription
       ▼                                    ▼
┌──────────────┐                    ┌──────────────┐
│   Supabase   │                    │   Mosquitto  │
│  or Neon DB  │                    │  (MQTT bkr)  │
└──────────────┘                    └──────┬───────┘
                                           │
                                    ┌──────┴───────┐
                                    │  Simulator   │
                                    │ (local/rail) │
                                    └──────────────┘
```

### Service options

| Component | Platform | Options | Cost |
|-----------|----------|---------|------|
| Frontend (Next.js) | Vercel | Vercel Pro | Free tier sufficient |
| Socket.IO + API | Railway / Render | Web service, Node 18+ | ~$5–10/month |
| MQTT broker | HiveMQ Cloud / Railway / VPS | HiveMQ free tier covers 10 devices | Free starter tier |
| Database | Supabase / Neon | PostgreSQL, vector optional | Free tier (500 MB) |
| Device simulator | Local machine or Railway | pnpm simulate | — |

### 2a. MQTT Broker

**Option A: HiveMQ Cloud (recommended for simplicity)**

1. Sign up at [hivemq.cloud](https://www.hivemq.cloud/) (free tier: 10 devices, 5 GB transfer).
2. Create a cluster. Note the broker URL (e.g., `a1b2c3d4e5f6.s1.eu.hivemq.cloud`).
3. Create MQTT credentials (username + password).
4. The broker is ready immediately.

**Option B: Mosquitto on a VPS (for unlimited devices)**

```bash
# Deploy using the existing docker-compose on a VPS with Docker
git clone https://github.com/your-org/sentience.git
cd sass
docker compose -f docker/docker-compose.yml up -d

# Configure TLS + auth (edit mosquitto.conf before starting)
```

> **Note:** The `docker/docker-compose.yml` is configured for **development only** (anonymous access, no TLS). For any public deployment, you **must**:
> - Set `allow_anonymous false` in `mosquitto.conf`
> - Use `password_file` or an auth plugin
> - Enable TLS on both ports 1883 and 9001
> - See the HiveMQ option above if you want managed security.

**Option C: Deploy Mosquitto on Railway**

Deploy the `eclipse-mosquitto:2` image as a Railway service. Mount a custom `mosquitto.conf` with password auth and TLS if you add a Railway TCP proxy.

### 2b. Database

**Supabase (recommended for demo)**

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the connection string (`postgresql://...`).
3. Run migrations (from `apps/api/prisma/schema.prisma` if available, or apply SQL manually).
4. Enable Row-Level Security for multi-tenant data isolation.

**Neon (alternative)**

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string.
3. Same migration process.

### 2c. Socket.IO + API Service

This service is **implemented** in `apps/api` (REST API) and `apps/realtime` (Socket.IO bridge). The API service hosts:

- REST API endpoints consumed by TanStack Query hooks (9 domain route groups)
- JWT authentication (`POST /api/auth/login`, JWT verification on all protected routes)
- PostgreSQL database via Drizzle ORM (13 tables)

The realtime service (`apps/realtime`) provides:

- The Socket.IO server that bridges MQTT → browser WebSocket
- MQTT client that subscribes to `sentience/#` on the broker
- Event normalizer that transforms MQTT payloads into Socket.IO events
- Device registry for site/estate filtering
- Room management by estate/site/device
- JWT validation on socket handshake

To deploy on **Railway** or **Render**:

1. Create a new web service from the repo.
2. Set **Root Directory** to the relevant app directory.
3. Build command: `pnpm build`
4. Start command: `node dist/server.js`
5. Add the environment variables below.

### 2d. Frontend (Vercel)

Same configuration as the frontend-only demo (Section 1), plus environment variables pointing to the live services.

### Environment variables

#### Vercel (Next.js)

```
NEXT_PUBLIC_API_URL=https://api.sentience-demo.com/api
NEXT_PUBLIC_SOCKET_URL=https://socket.sentience-demo.com
```

#### Socket.IO / API service

```
PORT=3001
MQTT_BROKER_URL=mqtts://a1b2c3d4e5f6.s1.eu.hivemq.cloud
MQTT_USERNAME=sentience-service
MQTT_PASSWORD=<from-hivemq>
DATABASE_URL=postgresql://user:pass@host:5432/sentience
JWT_SECRET=<generate-a-secure-random-string>
CORS_ORIGIN=https://sentience-demo.vercel.app
```

#### MQTT Simulator (local or Railway batch job)

```
# If connecting to a remote broker instead of localhost:
pnpm simulate -- --broker mqtts://user:pass@a1b2c3d4e5f6.s1.eu.hivemq.cloud --count 10
```

### Running the full demo

```bash
# Terminal 1: Start the MQTT simulator (local machine)
pnpm --filter @sentience/mock simulate -- --count 10

# Terminal 2: Start the Socket.IO service (if running locally)
pnpm --filter @sentience/api dev

# Terminal 3: Start the frontend (local dev)
pnpm --filter @sentience/web dev
# or deploy to Vercel for a public URL

# Verify: subscribe to MQTT topics
docker exec -it sentience-mosquitto mosquitto_sub -t "sentience/#" -v
```

### What works (full demo)

- Real-time device telemetry streaming to the browser
- Status changes (online/offline/fault/warning) reflected live
- Dashboard KPIs update from MQTT data
- Alert creation from threshold breaches
- Persistent event and audit log in PostgreSQL
- Multi-tenant data isolation via database RLS

### What is still simulated

- **Device hardware** — the MQTT payloads come from the `@sentience/mock` simulator, not real sensors
- **User authentication** — login is still mocked unless a real auth provider is configured
- **Alert rules** — rules exist in the type system but no rule engine evaluates them
- **RBAC** — role-based access is stubbed (admin always returns `true`)

---

## 3. Production-Style Deployment

For a production Sentience deployment, replace simulated components with managed services.

### Architecture

```
                          ┌──────────────────┐
                          │   Vercel / Cloudflare   │  CDN + Edge
                          │   (Next.js SSR)   │
                          └────────┬─────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │               │
                    ▼              ▼               ▼
           ┌────────────┐ ┌──────────────┐ ┌──────────────┐
           │  Auth0 /   │ │  Socket.IO   │ │  REST API    │
           │  Clerk     │ │  Gateway     │ │  (Node/Go)   │
           └────────────┘ └──────┬───────┘ └──────┬───────┘
                                 │                 │
                                 │ MQTT sub       │ HTTP
                                 ▼                 ▼
                          ┌──────────────┐ ┌──────────────┐
                          │  Mosquitto   │ │  PostgreSQL  │
                          │  (Managed)   │ │  (RDS/Aurora)│
                          └──────┬───────┘ └──────────────┘
                                 │
                                 │ MQTT
                                 ▼
                          ┌──────────────┐
                          │  Field       │
                          │  Devices     │
                          └──────────────┘
```

### Required production services

| Service | Production option | Purpose |
|---------|------------------|---------|
| **CDN / hosting** | Vercel Enterprise, Cloudflare Pages, or AWS Amplify | Static assets, SSR, edge caching |
| **REST API** | Node.js (Express/Fastify), Go, or Python on Railway, Render, Fly.io, or ECS | Business logic, CRUD endpoints |
| **Socket.IO gateway** | Same as API or separate service on Railway/Render | Real-time event fan-out, room management |
| **Database** | AWS RDS (PostgreSQL), Aurora, Google Cloud SQL, or Supabase Pro | Persistent storage, multi-tenant isolation |
| **MQTT broker** | HiveMQ Dedicated, AWS IoT Core, Azure IoT Hub, or self-hosted Mosquitto (HA) | Device ingestion, topic routing, QoS |
| **Auth provider** | Auth0, Clerk, Supabase Auth, or AWS Cognito | Authentication, MFA, SSO, RBAC |
| **Secrets management** | Doppler, AWS Secrets Manager, or HashiCorp Vault | Environment variable encryption, rotation |
| **Logging / monitoring** | DataDog, Grafana Cloud, or Sentry + Loki | APM, error tracking, structured logging |
| **Alerting** | PagerDuty, Opsgenie, or Slack webhooks | Incident response for device faults |

### Environment variables (production)

#### Next.js (Vercel)

```
# Required
NEXT_PUBLIC_API_URL=https://api.sentience.io/v1
NEXT_PUBLIC_SOCKET_URL=https://socket.sentience.io

# Auth (choose one provider)
NEXT_PUBLIC_AUTH_DOMAIN=sentience.auth0.com
NEXT_PUBLIC_AUTH_CLIENT_ID=<auth0-client-id>

# Optional overrides
NEXT_PUBLIC_DEFAULT_TENANT_ID=tenant-01
```

#### REST API service

```
# Required
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://...?sslmode=require
JWT_SECRET=<from-secrets-manager>
JWT_ISSUER=sentience.io
JWT_AUDIENCE=https://api.sentience.io

# MQTT
MQTT_BROKER_URL=mqtts://broker.sentience.io:8883
MQTT_USERNAME=sentience-service
MQTT_PASSWORD=<from-secrets-manager>
MQTT_TOPIC_PREFIX=sentience

# CORS
CORS_ORIGIN=https://app.sentience.io

# Logging
LOG_LEVEL=info
SENTRY_DSN=<sentry-dsn>
```

#### Socket.IO gateway

```
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://app.sentience.io
REDIS_URL=redis://...  # Required for multi-instance scale-out
MQTT_BROKER_URL=mqtts://broker.sentience.io:8883
MQTT_USERNAME=sentience-gateway
MQTT_PASSWORD=<from-secrets-manager>
JWT_SECRET=<shared-with-api>
```

### Deployment checklist

- [ ] **Database migrations applied** — Run `pnpm db:migrate` or equivalent against the production database
- [ ] **Secrets stored in a secrets manager** — No secrets in env files, `.env` files, or git history
- [ ] **Auth provider configured** — JWT signing keys rotated, MFA enforced for admin roles
- [ ] **MQTT broker secured** — `allow_anonymous false`, TLS 1.2+ required, client certificates for field devices
- [ ] **CORS restricted** — `CORS_ORIGIN` set to the exact app domain, not `*`
- [ ] **Database SSL enforced** — `sslmode=require` or `?sslmode=require` in connection string
- [ ] **Logging pipeline live** — Application logs streaming to DataDog/Sentry/Grafana
- [ ] **Uptime monitoring configured** — Health check endpoints for API and Socket.IO
- [ ] **Rate limiting enabled** — API rate limits per tenant, MQTT rate limits per device
- [ ] **Backup schedule established** — Daily database backups with point-in-time recovery
- [ ] **Staging environment deployed** — Isolated staging for integration testing before production

### Local vs production differences

| Aspect | Local development | Production |
|--------|-------------------|------------|
| MQTT broker | `docker compose` Mosquitto, anonymous | Managed broker, TLS + client certs |
| Database | SQLite or local PostgreSQL | Managed PostgreSQL with HA |
| Auth | Mock login, no validation | Auth0/Clerk with JWT, MFA, SSO |
| API layer | Simulated inline data | Real REST API with auth middleware |
| Real-time | Manual simulator + `useSocket` hook | Socket.IO gateway with Redis adapter |
| Secrets | `.env` file (gitignored) | Doppler / AWS Secrets Manager |
| Logging | `console.log` | Structured JSON logs to DataDog/Grafana |
| Scale | Single process | Horizontal scaling, Redis pub/sub |
| HTTPS | `http://localhost` | TLS termination, HSTS headers |

### What is still simulated (even in production)

| Feature | Current state | Path to real |
|---------|---------------|--------------|
| **Field device hardware** | `@sentience/mock` generator | Replace with real MQTT clients on physical controllers/cameras |
| **MQTT → Socket.IO bridge** | Implemented in `apps/realtime` — MQTT client + normalizer + Socket.IO server | Event logging, alert rule engine, device shadow |
| **Alert rule engine** | Types exist, no evaluator | Implement rule evaluation service |
| **REST API endpoints** | Not built — TanStack Query hooks ready for them | Build Express/Fastify API with CRUD routes |
| **CSV/PDF exports** | UI buttons present, no backend | Add server-side report generation (Puppeteer, PDFKit) |
| **Notification delivery** | Zustand store + socket feed | Connect to email/SMS/push provider |
| **Real RBAC** | Admin always returns true | Wire to Auth0 roles/permissions |
| **Multi-tenancy** | No tenant isolation | Add tenant ID to all queries and row-level security |

### Scaling considerations

| Bottleneck | Local limit | Production mitigations |
|------------|-------------|----------------------|
| MQTT connections | ~1,000 (single Mosquitto) | Cluster Mosquitto with message persistence, or use HiveMQ Enterprise |
| Socket.IO connections | ~10,000 (single node) | Scale horizontally with Redis adapter (socket.io-redis) |
| Database reads | ~200 QPS (single Postgres) | Read replicas, connection pooling (pgBouncer), caching layer (Redis) |
| WebSocket bandwidth | ~100 Mbps | CDN for HTTP, dedicated WebSocket gateway for WS traffic |
| Build artifacts | ~102 kB JS | Code splitting, dynamic imports, CDN edge caching |
| Auth token refresh | 1,000 RPM | Token rotation with refresh tokens, short-lived access tokens |

### Monitoring SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard initial load | <2 s | Lighthouse / RUM |
| Telemetry latency | <500 ms (MQTT → browser) | End-to-end timing |
| Socket.IO reconnect | <5 s | Client-side reconnect timer |
| API uptime | 99.9% | External health check |
| Database query P99 | <100 ms | pg_stat_statements + APM |
| Authentication P99 | <500 ms | Auth0/Clerk dashboard |

### Rollback procedure

1. **Frontend**: Vercel instant rollback — previous deployment is one click away in the Vercel dashboard
2. **API/Socket.IO**: Revert the commit and redeploy, or use container image tags to roll back to a previous version
3. **Database**: Use point-in-time recovery (PITR) — never roll back a database schema without a reverse migration
4. **MQTT**: Broker is stateless for routing — previous config is in git; revert and reload
5. **Full stack**: Keep the previous container image tag running; swap DNS back if the new version fails health checks
