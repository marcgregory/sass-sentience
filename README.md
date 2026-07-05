# Sentience IoT Platform

A full-stack IoT device management platform with real-time telemetry, alerting, role-based access control, and multi-tenant customer isolation.

> **Status:** v1.0.0 GA — Production release

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    apps/web (Next.js 15)                 │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │  Dashboard   │ │  Devices     │ │  Alerts / Reports │  │
│  │  Notifcations│ │  Sites       │ │  RBAC / Admin    │  │
│  └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘  │
│         │                │                  │            │
│  ┌──────┴────────────────┴──────────────────┴─────────┐  │
│  │            TanStack Query + Zustand                 │  │
│  └──────┬──────────────────────────────────────┬───────┘  │
│         │ REST API (api-client.ts)        Socket.IO      │
└─────────┼──────────────────────────────────────┬──────────┘
          │                                      │
┌─────────┴──────────────────────────────────────┴──────────┐
│                 apps/api (Fastify 5)                       │
│          JWT Auth · RBAC · PostgreSQL (Prisma)            │
└─────────┬──────────────────────────────┬───────────────────┘
          │                              │
┌─────────┴──────────┐     ┌─────────────┴──────────────┐
│  PostgreSQL (DB)   │     │  Mosquitto (MQTT Broker)   │
└────────────────────┘     └─────────────┬──────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │  MQTT Simulator     │
                              │  (apps/mock simulate)│
                              └─────────────────────┘
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui |
| **State** | TanStack Query (server state), Zustand (client/UI state) |
| **Real-time** | Socket.IO (events), MQTT (telemetry ingestion) |
| **Backend** | Fastify 5, Prisma ORM |
| **Database** | PostgreSQL |
| **Auth** | JWT (bcrypt hashing), RBAC (4 roles × 14 resources) |
| **Monorepo** | pnpm workspaces, Turborepo |
| **Testing** | Vitest (unit), Playwright (UI regression) |

## Key Features

- **Real-time dashboard** — Live device telemetry with sub-500ms latency
- **Device management** — Register, monitor, and manage IoT devices across sites
- **Alert pipeline** — MQTT → Bridge → Alert evaluation → DB persistence → Socket.IO broadcast
- **Notification system** — Configurable rules, RBAC-scoped delivery, unread tracking
- **Role-based access** — Admin, Support, Installer, Customer — with route guards and nav filtering
- **Multi-tenant** — Customer data isolation across all endpoints
- **Responsive** — Works at 375px, 768px, and 1280px+
- **Dark mode** — Full theme support (light/dark via CSS variables)
- **API Keys** — Programmatic access with create/authenticate/revoke lifecycle

## Repository Structure

```
sass/
├── apps/
│   └── web/                  # Next.js 15 application
│       ├── app/              # App Router pages & layouts
│       ├── components/       # shared/ and feature-specific components
│       ├── hooks/            # TanStack Query hooks
│       ├── lib/              # API client, permissions, services
│       ├── stores/           # Zustand stores (auth, UI, notifications)
│       └── e2e/              # Playwright UI regression tests
├── packages/
│   ├── types/                # @sentience/types — shared domain types
│   ├── utils/                # @sentience/utils — pure functions, formatters
│   ├── ui/                   # @sentience/ui — shared UI components
│   ├── hooks/                # @sentience/hooks — reusable React hooks
│   ├── mock/                 # @sentience/mock — Faker-based mock data
│   └── config/               # @sentience/config — Tailwind preset, TS config
├── docs/
│   ├── implementation/       # Roadmap, changelog, testing strategy, debt
│   ├── adr/                  # Architecture Decision Records
│   └── ...                   # Bridge, backend, deployment docs
```

## Local Development

**Prerequisites:** Node.js >=18, pnpm 10.14

```bash
# Install dependencies
pnpm install

# Start the full stack (web + API — requires Docker for DB)
pnpm dev

# Start just the frontend dev server
pnpm --filter @sentience/web dev
```

**Database (requires Docker):**
```bash
pnpm db:start       # Start PostgreSQL + Mosquitto
pnpm db:migrate     # Run Prisma migrations
pnpm db:seed        # Seed sample data
pnpm simulate       # Start MQTT simulator
```

## Testing

| Layer | Tool | Command | Scope |
|-------|------|---------|-------|
| Unit | Vitest | `pnpm test` | Functions, hooks, store logic |
| UI Regression | Playwright | `pnpm test:e2e` | Frontend rendering, routing, RBAC against mocked API |
| Full-Stack E2E | — | Planned (v1.6.0) | Real backend, DB, MQTT, Socket.IO |

See [TESTING_STRATEGY.md](docs/implementation/TESTING_STRATEGY.md) for the full testing philosophy.

## Documentation Index

| Document | Description |
|----------|-------------|
| [ROADMAP.md](docs/implementation/ROADMAP.md) | Future milestones and in-progress work |
| [CHANGELOG.md](docs/implementation/CHANGELOG.md) | Release history from v0.5.0 through v1.0.0 |
| [TECHNICAL_DEBT.md](docs/implementation/TECHNICAL_DEBT.md) | Known engineering debt and improvement areas |
| [TESTING_STRATEGY.md](docs/implementation/TESTING_STRATEGY.md) | Testing layers, coverage, and selection guide |
| [BUILD_PLAN.md](docs/implementation/BUILD_PLAN.md) | Sprint 1–7 implementation plan (historical) |
| [PRODUCTION_READINESS.md](docs/implementation/PRODUCTION_READINESS.md) | Production readiness checklist |
| [Architecture Decisions](docs/adr/) | ADR-0001 through ADR-0003 |

## Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for infrastructure requirements and deployment instructions.

---

*Built with Next.js, Fastify, PostgreSQL, and MQTT.*
