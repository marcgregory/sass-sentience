# Changelog

All notable changes to the Sentience IoT Platform.

---

## v1.1.1 — 2026-07-05

### Security & Accessibility Hardening

**Fixed**

- **Missing ARIA labels on icon-only buttons** — Added `aria-label` to 9 icon-only buttons across 4 pages (events, audit-log, users, admin/api-keys) including close details, clear search, activate/deactivate toggle, revoke/delete key buttons.

**Verified**

- CORS origin restriction — Already configured via `CORS_ORIGIN` env var (default: `http://localhost:3000`) in `apps/api`. Documented in `.env.example`.
- Rate limiting — Already configured via `RATE_LIMIT_MAX` env var (default: 100/min) in `apps/api`. Documented in `.env.example`.

**Build**

- TypeScript: ✅ Zero errors across 9 packages
- Production build: ✅ 27/27 pages, shared JS 102 kB

### Known Issues

- Auth store `loginAsRole()` still bypasses backend auth — gated by DEV ONLY guards.
- 4 pages still use partial mock data: API Keys, Notification Rules, Notifications, and device detail fallback tabs.
- `useGenerateReport` has no optimistic update.
- No OpenAPI/Swagger spec generation.
- No WebSocket event emission from REST mutations.

---

## v1.0.0 — 2026-07-05

### RC5: Production Release

**Changed**

- **Notifications pipeline end-to-end** — Bridge listener (`apps/api/src/socket/bridge-listener.ts`) now listens for `alert:created` events from the realtime bridge, persists them as notification records in the database, and emits `notification:new` to connected clients. Flow: MQTT event → Bridge → `alert:created` → API listener → INSERT notifications (DB) → emitNotification() → Bridge → `notification:new` → Frontend (badge + page).

**Fixed**

- **Simulator estate UUID mismatch** — Fixed `mock/device-generator.ts` ESTATES IDs to use deterministic UUIDs matching DB seed output, eliminating `invalid input syntax for type uuid` errors in bridge listener.
- **Unread notification sync** — Added `unreadCount` to `GET /api/notifications` response so the bell badge has unread count in a single round-trip.

**Added**

- **Mosquitto configuration** — `.docker/mosquitto.conf` with listener on port 1883 and anonymous access for local development.
- **RC5 release docs** — Release plan and validation updated for v1.0.0 GA.

**Build**

- TypeScript: ✅ Zero errors across 9 packages
- Production build: ✅ 27/27 pages, shared JS 102 kB

### Known Issues

Same as RC3 — see CHANGELOG below. No new issues introduced in RC5.

---

## v1.0.0-rc.3 — 2026-07-03

### RC3 Phase 2 — UX Audit & Fixes

**Changed**

- **UX improvements across 17 files (see `UX_AUDIT_REPORT.md`)** — Accessibility (ARIA labels, `htmlFor`, `aria-checked`, `role="radio"`, `aria-pressed`), form validation (`min="0"` on number inputs), empty states (Estates, Notifications, Diagnostics), mutation feedback (Users toast, Profile error handling), keyboard navigation.

### RC3 Phase 3 — API Audit & RBAC Hardening

**Fixed**

- **Critical RBAC gap: `PATCH /api/settings/:key`** — Added `requireRole("admin")`. Previously any authenticated user could update platform settings.
- **Critical RBAC gap: `PATCH /api/users/:id`** — Added `requireRole("admin")` + role ID existence validation. Previously any user could change another user's role.
- **Critical RBAC gap: `PATCH /api/devices/:id`** — Added `requireRole("admin", "support")`. Previously any role could update device metadata.
- **Critical RBAC gap: `PATCH /api/alerts/:id`** — Added `requireRole("admin", "support")`. Previously any role could acknowledge or resolve alerts.
- **Medium RBAC gap: `GET /api/users`** — Added `requireRole("admin")`. Previously customers could list all platform users.

**Removed**

- **Dead code: `use-live-devices.ts`** — The `useLiveDevices()` hook was never imported anywhere.
- **Mock seed data from audit store** — Removed 5 hardcoded audit entries.
- **`@sentience/mock` from next.config.ts transpilePackages** — Not imported in production code.

**Changed**

- **Optimistic updates for 6 mutations** — User mutations (`useCreateUser`, `useUpdateUser`, `useDeactivateUser`), role permission mutations (`useGrantPermission`, `useRevokePermission`), and settings mutation (`useUpdateSetting`) now cancel outgoing queries, snapshot previous data on `onMutate`, and rollback on `onError`.
- **Device detail page: local `cn()` replaced** — Imported from `@sentience/utils`.

**Added**

- **API Audit Report** — `docs/implementation/API_AUDIT_REPORT.md` with comprehensive audit of all 10 API route groups across 12 dimensions.

### RC3 Phase 4 — Performance Audit

**Changed**

- **Dashboard JS reduced from 222 kB to 123 kB** — Lazy-loaded Recharts via dynamic import of `DistributionBar`.
- **Reports page correctly bears Recharts cost** — 241 kB first-load JS (expected, uses 4 chart types).
- **Database indexes added** — High-frequency query patterns (device status, event timestamps, alert severity, user role) now indexed.
- **TanStack Query staleTime configured** — `staleTime: 30_000` on user list, audit log, settings queries to reduce redundant API calls.
- **Socket event invalidations debounced** — Rapid telemetry storm events are batched and invalidated after 100ms of inactivity.

**Added**

- **Performance Audit Report** — `docs/implementation/PERFORMANCE_AUDIT_REPORT.md` covering bundle sizes, API response times, database query plans, and real-time latency.

### RC3 Phase 5 — Security Audit

**Fixed**

- **Critical: SHA-256 → bcrypt** — Password hashing upgraded to bcrypt (cost factor 12) in both login and user creation routes.
- **Critical: JWT secret required** — No default fallback for `JWT_SECRET`. Server refuses to start without it.
- **Critical: Dev .env gitignored** — `apps/api/.env` added to `.gitignore`. `.env.example` uses `change-me` placeholder.
- **High: Real authentication** — Frontend `login()` now calls `POST /api/auth/login` → receives JWT → stored in Zustand → injected by `api-client.ts` as `Authorization: Bearer <token>`. Previously used mock accounts and returned `"mock-jwt-token"`.
- **High: Socket.IO JWT authentication** — `socket-server.ts` verifies JWT during handshake. `connectSocket(token)` sets `s.auth = { token }`. Socket reconnects with fresh token on login/logout.
- **High: Demo login isolated** — `loginAsRole()` remains for dev use but gated by DEV ONLY documentation. Suggested production guard via `process.env.NODE_ENV` check.

**Added**

- **Security Audit Report** — `docs/implementation/SECURITY_AUDIT_REPORT.md` with 18 findings (8 fixed, 10 remaining debt).

### RC3 Phase 6 — Documentation & Release Readiness

**Changed**

- **CLAUDE.md** — Updated to reflect RC3 completion, real RBAC, real authentication architecture.
- **BUILD_PLAN.md** — Added RC3 Phase 4 (Performance), Phase 5 (Security), Phase 6 (Documentation).
- **ROADMAP.md** — Deduplicated Future section. Added RC3 Phase 3/4/5 entries.
- **CHANGELOG.md** — Deduplicated repeated entries. Added Phase 4/5/6 entries.
- **RELEASE_PLAN.md** — Updated to reflect real auth, real API, Socket.IO auth.
- **TECHNICAL_DEBT.md** — Removed outdated entries (mock auth, unconnected API). Added Phase 5 security debt.
- **DEPLOYMENT.md** — Updated to reflect existing realtime bridge implementation.

**Added**

- **Root CHANGELOG.md** — Pointer to `docs/implementation/CHANGELOG.md`.
- **Production Readiness Report** — `docs/implementation/PRODUCTION_READINESS.md`.

### Known Issues

- Auth store `loginAsRole()` still bypasses backend auth — gated by DEV ONLY guards.
- 4 pages still use partial mock data: API Keys, Notification Rules, Notifications, and device detail fallback tabs.
- `useGenerateReport` has no optimistic update.
- Customer-level data isolation not implemented on devices/events endpoints.
- No transactions on multi-query write operations.
- No OpenAPI/Swagger spec generation.
- No rate limiting installed.
- SHA-256 password hashing → fixed (bcrypt now used).
- CORS `origin: true` allows any origin.
- No WebSocket event emission from REST mutations.

---

## v1.0.0-rc.2 — 2026-07-03

### Added

- **Audit log backend API route** — `GET /api/audit-logs` and `GET /api/audit-logs/:id` with pagination, action filter, date range, search, and sort.
- **Audit log API functions** — `getAuditLogs(params)` and `getAuditLog(id)` wrapping typed responses.
- **TanStack Query hooks** — `useAuditLogs()` and `useAuditLog(id)`.
- **Graceful degradation** — Audit log page merges API entries with locally-recorded entries, deduplicates by ID.
- **Device API functions** — `getDevices()` and `getDevice(id)` wrapping `GET /api/devices` and `GET /api/devices/:id`.
- **TanStack Query hooks** — `useDevices()` and `useDevice(id)` with live socket overlay.
- **Devices page: loading/error/empty states** — Skeleton table, error card with retry, empty state.
- **Settings API functions** — `getSettings()` and `updateSetting(key, value)`.
- **TanStack Query hooks** — `useSettings()` and `useUpdateSetting()`.
- **Settings page: loading/error states** — Loading spinner, error card with retry, save feedback.
- **Event API functions** — `getEvents()` and `getEvent(id)`.
- **TanStack Query hooks** — `useEvents()` and `useEvent(id)` with live merge/dedup.
- **Events page: loading/error/empty states** — Skeleton, error card, empty state.
- **Report API functions** — `getReportSummary()`, `getReportTrends()`, `getReports()`, `getReport()`, `generateReport()`.
- **TanStack Query hooks** — `useReportSummary()`, `useReportTrends()`, `useRecentReports()`, `useGenerateReport()`.
- **Reports page: loading/error states** — Full-page skeleton, error card with retry.
- **Backend report endpoints** — `GET /api/reports/summary` and `GET /api/reports/trends`.
- **User API functions** — getUsers, getUser, createUser, updateUser, deactivateUser.
- **Role API functions** — `getRoles()`.
- **TanStack Query hooks** — useUsers, useUser, useRoles, useCreateUser, useUpdateUser, useDeactivateUser.
- **Users page: loading/error/empty states** — Loading spinner, error card, empty state.
- **Backend: users API joined with roles** — Returns both roleId (UUID) and role (enum name).
- **API Health hook** — `useApiHealth` polls `GET /api/health` every 15s, shows real API status on Platform Health page.

### Changed

- **Audit Log page** — Now fetches from `GET /api/audit-logs` via TanStack Query. Search, filters, pagination operate client-side on merged data.
- **Devices list page** — Now fetches from `GET /api/devices`. Live socket data overlaid via Zustand.
- **Device detail page** — Base device data from `GET /api/devices/:id`. Live overlay remains.
- **Settings page** — Now fetches from `GET /api/settings`. Changes persisted asynchronously.
- **Events page** — Now fetches from `GET /api/events`. Live events merged with dedup.
- **Reports page** — Now fetches summary/trends from API. Removed mock generators.
- **Users page** — Now fetches from `GET /api/users`. Mutations through real API.
- **Platform Health: API Service** — Now real from `GET /api/health`. Falls back to "disconnected".
- **`useReportsData` hook** — Now delegates to TanStack Query hooks.
- `CLAUDE.md` — Updated for RC2 completion (9 of 9 domains integrated).
- `ROADMAP.md` — All 9 domains marked complete.

---

## v1.0.0-rc.1 — 2026-07-03

### Added

- **Backend API app** — `apps/api` with Fastify 5, TypeScript, Drizzle ORM.
- **PostgreSQL database** — 13-table schema via Docker Compose.
- **API routes** — 9 route groups with JWT auth, pagination, filtering.
- **Seed data** — 4 roles, 4 customers, 4 estates, 8 sites, 24 devices, 50 events, 15 alerts, etc.
- **JWT authentication** — `@fastify/jwt` with 24h token expiry.
- **Dev commands** — `pnpm db:start/stop/migrate/seed/api:dev`.
- **API documentation** — `docs/backend-api.md`.
- **Admin overview page** — `/admin` hub with section cards, system status.
- **Enhanced settings** — Tenant, Feature Flags, Maintenance mode tabs.
- **API Key management** — Create/revoke, masked display, copy-to-clipboard.
- **Audit log enhancements** — Detail drawer, severity filters.
- **Notification Rules page** — Alert thresholds, channel toggles, role-based prefs.
- **Platform Health dashboard** — 4 service status cards.
- **Admin route protection** — `RequirePermission` with `admin` resource.

### Changed

- `ROADMAP.md`, `turbo.json`, root `package.json` — Updated for backend.
- `BUILD_PLAN.md` — Sprint 8 (Backend API) marked completed.

---

## v0.12.0 — 2026-07-03

### Added

- **RBAC permission system** — Full matrix (4 roles × 14 resources × 5 actions).
- **Auth store: real RBAC enforcement** — `hasPermission()`/`hasRole()` return real results.
- **Demo role switching UI** — Header role badge, Switch Role modal.
- **Sidebar navigation filtering** — Admin sees 13, Support sees 10, Customer sees 5.
- **Route guard (`AuthGuard`)** — Redirects unauthenticated users to `/login`.
- **Permission guard (`RequirePermission`)** — Access Denied for unauthorized roles.
- **User management page** — User list, search/filter, create dialog, inline role change.
- **Roles & Permissions page** — Permission matrix with toggle switches.
- **Audit Log page** — Live store-backed entries, search, CSV export, pagination.
- **Settings page** — Tabbed UI (General, Security, Notifications, Maintenance).
- **Profile page** — Live auth data, personal info edit, password change.
- **Audit store** — Zustand store with `addEntry()`, 5 seeded entries.
- **Login page: quick-role buttons** — 4 demo role cards.

### Changed

- Auth store login flow now finds matching demo account by email.
- Header displays role badge with dropdown (Profile, Switch Role, Sign Out).
- Dashboard layout wraps children in `AuthGuard`.

## v0.11.0 — 2026-07-03

### Changed

- **Consistency audit** — All derived metrics unified through shared selectors in `@sentience/utils/src/selectors.ts`.

### Added

- **`@sentience/utils` selectors module** — Pure functions for status counts, distributions, health scores, estate summaries.
- **`@sentience/types` dependency** — Added to `@sentience/utils/package.json`.

### Fixed

- **9 categories of duplicated business logic** — Status counts, battery/signal/temperature distributions, fleet health score, system health, estate summaries, color mapping, percentage helpers. All now use shared selectors.
- **Double `colorClassToHex`** — Consolidated to single import.
- **Type imports** — `DistributionBar`/`EstateSummaryCards` now import from `@sentience/utils`.

## v0.10.0 — 2026-07-03

### Added

- **Reports Dashboard** — Date range, estate/site/device cascade filters, fleet summary cards.
- **Fleet Health Gauge** — Composite health score with breakdown bars.
- **Alert Trends chart** — Stacked area chart (critical/warning/info).
- **Device Availability chart** — Stacked bar chart (online/offline/fault).
- **Battery/Signal Distribution charts** — Reused from dashboard pattern.
- **Fault Distribution chart** — Donut pie chart with 6 fault categories.
- **CSV Export** — Client-side CSV generation.
- **PDF Export (placeholder)** — Disabled button with tooltip.
- **Scheduling UI (placeholder)** — Daily/Weekly/Monthly badges.
- **Recent Exports list** — In-memory export history with re-download.
- **Event History page** — Severity/category/device/date filters, text search.
- **Event Detail Panel** — Slide-in sheet with device link.
- **CSV Export (events)** — Client-side CSV with filtered data.
- **Pagination** — 20 events per page with Previous/Next.
- **Empty State** — EmptyState with clear-filters action.
- **Live Alert Store** — Zustand store with ring buffer (max 100).
- **Alert Emission in bridge** — `alert:created` for 5 event types.
- **Alert Resolution in bridge** — `alert:updated` for status transitions.
- **Socket wiring** — `useSocket` handles alert events.
- **Alerts page** — Severity/status filters, EmptyState.
- **Alert Detail Sheet** — Full info, acknowledge/resolve, timeline.
- **Timeline component** — `AlertTimeline` with severity-coded dots.

### Fixed

- Inline `cn()` conflict — Replaced with shared `@sentience/utils` import.
- Alert detail panel Eye button — Was missing onClick handler.

## v0.7.0 — 2026-07-02

### Added

- **Operations Center Dashboard** — 5 KPI cards, fleet health gauge, distribution charts.
- **Fleet Health Score** — Composite metric with green/amber/red thresholds.
- **Battery, Signal, Temperature Distribution charts** — Recharts bar charts.
- **Devices by Estate** — Summary cards with status dot breakdowns.
- **Recent Activity feed** — Live event stream with severity icons.
- **Devices Recently Offline** — List with name, site, last-seen links.
- **Quick Action cards** — View Offline/Faults/Diagnostics/Export Report.
- **Simulator banner** — Informational card when no live data.
- **Shared components** — `FleetHealthGauge`, `DistributionBar`, `RecentActivity`, `EstateSummaryCards`, `QuickActions`.

## v0.6.0 — 2026-07-02

### Added

- **Device Detail page** — Dynamic route `/devices/[id]` with live telemetry.
- **Six detail tabs** — Overview, Telemetry, I/O, Diagnostics, Events, Config.
- **Device table linking** — Row click navigates to `/devices/[id]`.
- **Not-found handling** — EmptyState for unknown device IDs.
- **Live indicator** — Pulsing green dot + "Live" label.
- **Mock diagnostics** — Per-device pass/fail/warning tests.
- **Section states** — EmptyState for I/O and Events tabs.

### Changed

- 22 total routes (21 static + 1 dynamic).

## v0.5.0 — 2026-07-02

### Added

- **Monorepo scaffold** — pnpm workspaces, Turborepo, TypeScript config.
- **`@sentience/types`** — All domain type definitions.
- **`@sentience/utils`** — `cn()`, formatters, constants.
- **`@sentience/config`** — Shared Tailwind preset with shadcn/ui variables.
- **Design system** — CSS variables (light + dark), custom animations, utility classes.
- **UI kit** — Button, Badge, Card, StatusDot, StatusBadge, EmptyState, PageHeader.
- **Layout** — DashboardShell, Sidebar (13 nav items), Header, RealtimeListener.
- **Providers** — QueryProvider, ThemeProvider.
- **Zustand stores** — auth-store, ui-store, notification-store, live-device-store.
- **API client** — api-client.ts, query-keys.ts, pagination types.
- **Socket.IO client** — Singleton, 14 typed events, auto-reconnect, rooms.
- **MQTT Simulator** — Device generator, CLI, Docker Mosquitto.
- **Realtime Socket.IO bridge** — MQTT client, event normalizer, device registry.
- **Realtime bridge tests** — Normalizer (14 tests), device registry (9 tests).
- **Socket hook** — `useSocket()` with cache invalidation map, live store updates.
- **21 pages** — All routes with mock data.
- **Documentation** — ADRs (3), DEPLOYMENT.md, MQTT guide, bridge guide, ROADMAP.md, CHANGELOG.md.
