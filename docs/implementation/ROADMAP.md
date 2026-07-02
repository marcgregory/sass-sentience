# Roadmap

> **Product backlog.** Tracks what is completed, in progress, next, and blocked.
> Engineering sprint details live in `BUILD_PLAN.md`.
> Last updated: 2026-07-03

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

## ✅ Completed — Sprint 2: Dashboard

| Area | Notes |
|------|-------|
| **Fleet Health Score** | Composite gauge (online% × 0.4 + battery × 0.3 + signal × 0.3) with green/amber thresholding |
| **Live KPI cards** | Total, Online, Offline, Fault, Warning counts from live device store |
| **Battery Distribution** | Horizontal bar chart (Good/Fair/Low) via recharts |
| **Signal Distribution** | Horizontal bar chart (Excellent/Good/Fair/Poor) via recharts |
| **Temperature Distribution** | Horizontal bar chart (Normal/High/Critical) via recharts |
| **Devices by Estate** | Summary cards per estate with status dots and drill-down links |
| **Recent Activity feed** | Live event stream from ring buffer with severity icons |
| **Offline Device list** | Recently offline devices with name, site, last-seen links |
| **Quick Action cards** | View Offline, View Faults, Open Diagnostics, Export Report (placeholder) |
| **Simulator banner** | Informational card when no live data is present |
| **Today's Overview** | Side panel with events count, connection status, health score |
| **Shared components** | `FleetHealthGauge`, `DistributionBar`, `RecentActivity`, `EstateSummaryCards`, `QuickActions` |

---

## ✅ Completed — Sprint 3: Alerts

| Area | Notes |
|------|-------|
| **Live Alert Store** | Zustand store with ring buffer (max 100), acknowledge/resolve actions, history tracking |
| **Alert Emission** | Bridge emits `alert:created` for battery_low/signal_weak/device_offline/device_fault |
| **Alert Resolution** | Bridge emits `alert:updated` for status transitions (acknowledge/resolve) |
| **Socket Wiring** | `useSocket` pushes `alert:created`/`alert:updated` to live alert store |
| **Alerts Page** | Severity filters (critical/warning/info), status filters (open/acknowledged/resolved) |
| **Alert Detail Panel** | Side sheet with full alert info, acknowledge/resolve actions, timeline |
| **Empty State** | EmptyState component when no alerts exist |
| **Live Alerts Demo** | Start simulator → low battery/fault → alert appears → acknowledge → resolve |

---

---

## ✅ Completed — Sprint 4: Event History

| Area | Notes |
|------|-------|
| **Event History Page** | Full event log with severity, category, device, and date filters |
| **Search** | Text search across event titles and descriptions |
| **Event Detail Panel** | Side panel with full event info, device/site/estate context, links to device detail |
| **CSV Export** | Client-side CSV export of filtered events |
| **Pagination** | Server-style page navigation through event list |
| **Empty State** | EmptyState when no events match filters |

## ✅ Completed — Sprint 5: Reports

| Area | Notes |
|------|-------|
| **Report Dashboard** | Filter bar with date range (today/7d/30d/90d), estate, site, device cascade filters |
| **Fleet Summary Cards** | Total devices, avg battery, avg signal, open alerts — computed from live store |
| **Fleet Health Gauge** | Composite health score with status breakdown bars |
| **Alert Trends Chart** | Stacked area chart (critical/warning/info) over selected time range |
| **Device Availability Chart** | Stacked bar chart (online/offline/fault) over time |
| **Battery Health Chart** | Distribution bar (Good/Fair/Low) — reuse from dashboard pattern |
| **Signal Quality Chart** | Distribution bar (Excellent/Good/Fair/Poor) — reuse from dashboard pattern |
| **Fault Distribution Chart** | Donut pie chart with 6 fault categories and percentage labels |
| **CSV Export** | Client-side CSV generation with full metric, distribution, and alert data |
| **PDF Export (placeholder)** | Button disabled with "Coming soon" tooltip |
| **Scheduling UI (placeholder)** | Daily/Weekly/Monthly badges with coming-soon state |
| **Recent Exports List** | In-memory list of recently exported reports with re-download buttons |

## ✅ Completed — Sprint 6: User Management (RBAC)

| Area | Notes |
|------|-------|
| **Permission system** | Full matrix (4 roles × 14 resources × 5 actions) in `@/lib/permissions` |
| **Auth store: real RBAC** | `hasPermission()`/`hasRole()` return real results; `loginAsRole()` for instant switching |
| **Sidebar nav filtering** | Admin sees 13 items, Support sees 10, Customer sees 5 |
| **Route guards** | `AuthGuard` (unauthenticated redirect) + `RequirePermission` (Access Denied for unauthorized) |
| **User management** | User list, search/filter, create dialog, inline role change, activate/deactivate |
| **Roles & Permissions** | Role summary cards, expandable permission matrix with toggle switches |
| **Audit Log** | Live store, search, action filter, CSV export, pagination |
| **Settings** | Tabbed UI (General/Security/Notifications/Maintenance), mock fields, save feedback |
| **Profile** | Live auth data, personal info edit, password change, notification prefs |
| **Demo role switching** | Header role badge, Switch Role modal, quick-login on login page |

## ✅ Completed — Sprint 6: User Management (RBAC)

| Area | Notes |
|------|-------|
| **Permission system** | Full matrix (4 roles × 14 resources × 5 actions) in `@/lib/permissions` |
| **Auth store: real RBAC** | `hasPermission()`/`hasRole()` return real results; `loginAsRole()` for instant switching |
| **Sidebar nav filtering** | Admin sees 13 items, Support sees 10, Customer sees 5 |
| **Route guards** | `AuthGuard` (unauthenticated redirect) + `RequirePermission` (Access Denied for unauthorized) |
| **User management** | User list, search/filter, create dialog, inline role change, activate/deactivate |
| **Roles & Permissions** | Role summary cards, expandable permission matrix with toggle switches |
| **Audit Log** | Live store, search, action filter, CSV export, pagination |
| **Settings** | Tabbed UI (General/Security/Notifications/Maintenance), mock fields, save feedback |
| **Profile** | Live auth data, personal info edit, password change, notification prefs |
| **Demo role switching** | Header role badge, Switch Role modal, quick-login on login page |

## ✅ In Progress — Sprint 7: Admin

| Area | Notes |
|------|-------|
| **Admin overview page** | Hub page with admin module cards and system-wide status |
| **Tenant settings** | Platform name, org profile, timezone, branding in enhanced settings |
| **Feature flags** | Toggle-based feature flag management UI |
| **Maintenance mode** | Global maintenance mode with toggle and status indicator |
| **API key management** | Create/revoke API keys, masked display, last used tracking |
| **Audit log enhancements** | Detail drawer, severity filters, improved export |
| **Notification rules** | Alert thresholds, channel toggles, role-based preferences |
| **Platform health** | Bridge, MQTT, Simulator, DB/API status cards |
| **Admin route protection** | Non-admin roles blocked from admin pages |

| Sprint | Module | Demo |
|--------|--------|------|
| **7** | **Admin (In Progress)** | ⭐⭐⭐ | Log in as Admin → manage feature flags, API keys, platform health |

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
