# Roadmap

> **Product backlog.** Tracks what is completed, in progress, next, and blocked.
> Engineering sprint details live in `BUILD_PLAN.md`.
> Last updated: 2026-07-02

---

## ✅ Completed — Platform Phase

| Area | Notes |
|------|-------|
| **Monorepo** | pnpm workspaces, Turborepo, shared configs |
| **Shared packages** | `@sentience/types`, `@sentience/utils`, `@sentience/config`, `@sentience/hooks`, `@sentience/ui` (scaffolded) |
| **Design System** | shadcn/ui CSS variables (light + dark), Tailwind preset, custom animations, Inter font |
| **UI Components** | Button, Badge, Card, StatusDot, StatusBadge, EmptyState, PageHeader |
| **Layout** | DashboardShell, Sidebar (collapsible, 13 nav items, mobile drawer), Header (search, theme toggle, notifications, connection indicator) |
| **Providers** | QueryProvider (TanStack Query, 30s staleTime), ThemeProvider (system preference, persisted) |
| **Auth Store** | `useAuthStore`: mock login, role/permission stubs, persisted |
| **UI Store** | `useUIStore`: sidebar, theme, mobile menu (persisted, tested) |
| **Notification Store** | `useNotificationStore`: addNotification, markAsRead/markAllAsRead |
| **Live Device Store** | `useLiveDeviceStore`: ephemeral real-time overlay, ring buffer (max 50) |
| **API Client** | `api-client.ts`, `query-keys.ts` (tested), pagination types |
| **Socket Client** | Singleton Socket.IO client, 14 typed events, auto-reconnect, rooms |
| **MQTT Simulator** | Device generator (4 estates, 8 sites), telemetry simulator, CLI, Docker Mosquitto |
| **Realtime Bridge** | MQTT client, event normalizer (14 tests), device registry (9 tests), Socket.IO server with room routing |
| **Socket Hook** | `useSocket()`: event-to-query invalidation, live-store updates (tested) |
| **Live Devices Hook** | `useLiveDevices()`: merges static data with live store |
| **Dashboard Data Hook** | `useDashboardData()`: live KPIs with mock fallback |
| **Live Dashboard** | KPI cards, System Health gauges, Live Events, Alerts feed, widgets |
| **Device Table** | HTML table with live overlay (status/battery/signal/temp) |
| **Connection Indicator** | Header Wifi/WifiOff icon |
| **Documentation** | ADRs (3), DEPLOYMENT.md, MQTT guide, Realtime bridge guide, CLAUDE.md, CHANGELOG.md, ROADMAP.md, BUILD_PLAN.md |
| **Sprint 1: Device Management** | Device detail page (`/devices/[id]`) with 6 tabs (Overview, Telemetry, I/O, Diagnostics, Events, Config), live telemetry overlay, device table linking, dynamic route |

---

## 🚧 In Progress — Sprint 2: Dashboard

> **Demo:** Dashboard updates automatically as simulator changes. A support engineer can understand the health of an entire estate in 30 seconds.

**Scope:** Upgrade the dashboard from KPIs to an operations center — health scores, charts, estate overview, recent activity, quick actions.

---

## ⏳ Sprint Queue

| Sprint | Module | Priority | Demo |
|--------|--------|----------|------|
| **2** | Dashboard | ⭐⭐⭐⭐⭐ | Dashboard updates automatically as simulator changes |
| **3** | Alerts | ⭐⭐⭐⭐ | Trigger low battery → alert appears instantly |
| **4** | Event History | ⭐⭐⭐⭐ | Search event history and drill into a device |
| **5** | Reports | ⭐⭐⭐⭐ | Export a monthly report to CSV/PDF |
| **6** | User Management | ⭐⭐⭐ | Log in as Customer vs Support vs Admin — different permissions |
| **7** | Admin | ⭐⭐⭐ | View audit logs and change system settings |

---

## 🔮 Future (Infrastructure & Polish)

- Notifications — connect dropdown + full page to Socket.IO feed
- REST API backend — Express/Fastify with CRUD endpoints
- TanStack Query hooks — useQuery/useMutation wrappers
- Repository layer — data-access functions per domain
- E2E Tests — Playwright or Cypress
- Deployment pipeline — CI/CD
- Advanced scaling — Kubernetes, Redis, multi-region

---

## ❌ Blocked

- *Nothing currently blocked.*
