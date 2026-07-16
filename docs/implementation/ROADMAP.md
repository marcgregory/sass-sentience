# Roadmap

> **Product backlog.** Tracks what is completed, in progress, next, and blocked.
> Engineering sprint details live in `BUILD_PLAN.md`.
> Last updated: 2026-07-15

---

## ✅ Completed — v1.0.0 GA (2026-07-05)

**v1.0.0** tagged and released. Full release validation completed across all 15 RC5 checks.

See `docs/implementation/RELEASE_PLAN.md` and `docs/implementation/CHANGELOG.md`.

---

## ✅ Completed — v1.1.1 Security & Accessibility Hardening (2026-07-05)

| Area                             | Status                | Notes                                                                                                 |
| -------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| ARIA labels on icon-only buttons | ✅ Done               | 9 buttons across 4 pages — close details, clear search, activate/deactivate toggle, revoke/delete key |
| CORS origin restriction          | ✅ Already configured | `CORS_ORIGIN` env var in `apps/api`, defaults to `http://localhost:3000`                              |
| Rate limiting                    | ✅ Already configured | `@fastify/rate-limit` in `apps/api`, `RATE_LIMIT_MAX` env var defaults to 100/min                     |
| TypeScript check                 | ✅ Passed             | Zero errors across 9 packages                                                                         |
| Production build                 | ✅ Passed             | 27/27 pages, shared JS 102 kB                                                                         |
| Tagged                           | ✅ `v1.1.1`           |

---

## ✅ Completed — v1.4.0 Replace Mock Data With Real Backend (2026-07-05)

| Area                                   | Status      | Notes                                                                                                                               |
| -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Notifications page                     | ✅ Verified | Already uses `useNotifications()` hook, fetches `GET /api/notifications`, supports simulated notification merge                     |
| API Keys page                          | ✅ Verified | Already uses `useApiKeys()` hook, create/revoke/delete persist through `GET/POST/PATCH/DELETE /api/api-keys`                        |
| Notification Rules page                | ✅ Verified | Already uses `useNotificationRules()` hook, loads from `GET /api/notification-rules`, saves via `PATCH /api/notification-rules/:id` |
| All mock data removed from admin pages | ✅ Verified | Zero mock/hardcoded references in notifications, api-keys, or notification-rules pages                                              |
| Known issues updated                   | ✅ Done     | Removed "4 pages still use partial mock data" from v1.2.0 changelog                                                                 |
| TypeScript check                       | ✅ Passed   | Zero errors across 9 packages                                                                                                       |
| Production build                       | ✅ Passed   | 28/28 pages, shared JS 102 kB                                                                                                       |
| Tagged                                 | ✅ `v1.4.0` |

---

## ✅ Completed — v1.3.0 Report PDF Export (2026-07-05)

| Area                      | Status      | Notes                                                  |
| ------------------------- | ----------- | ------------------------------------------------------ |
| PDF export button enabled | ✅ Done     | Previously disabled, now generates PDF                 |
| `usePdfExport` hook       | ✅ Done     | Dynamic imports of html2canvas + jsPDF, multi-page A4  |
| PDF header with metadata  | ✅ Done     | Report title, date range, filters, generated timestamp |
| Loading/error states      | ✅ Done     | "Generating PDF…" button + notification toast feedback |
| Notification integration  | ✅ Done     | Success (info) and failure (alert) toasts              |
| Filename format           | ✅ Done     | `report-YYYY-MM-DD.pdf`                                |
| TypeScript check          | ✅ Passed   | Zero errors                                            |
| Production build          | ✅ Passed   | 27/27 pages, shared JS 102 kB                          |
| Tagged                    | ✅ `v1.3.0` |

---

## ✅ Completed — v1.2.0 Audit Log Filtering (2026-07-05)

| Area                            | Status      | Notes                                                             |
| ------------------------------- | ----------- | ----------------------------------------------------------------- |
| Server-side filters wired       | ✅ Done     | Search, action, pagination params passed to `GET /api/audit-logs` |
| Client-side filtering removed   | ✅ Done     | No more downloading 200 rows and filtering in the browser         |
| Accurate pagination counts      | ✅ Done     | `total` and `totalPages` reflect filtered queries                 |
| CSV export fetches full dataset | ✅ Done     | Up to 10,000 rows from API, merged with local entries             |
| Loading/empty/error states      | ✅ Verified | All three states preserved with server-side data                  |
| Severity filter removed         | ✅ Done     | Not a DB field — action filter covers the use case                |
| TypeScript check                | ✅ Passed   | Zero errors                                                       |
| Production build                | ✅ Passed   | 27/27 pages, shared JS 102 kB                                     |
| Tagged                          | ✅ `v1.2.0` |

---

## ✅ Completed — v1.0 RC1: Backend API + PostgreSQL

| Area                    | Notes                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend app**         | `apps/api` — Fastify 5 + TypeScript                                                                                                    |
| **Database**            | PostgreSQL 16 via Docker, persistent volume                                                                                            |
| **ORM**                 | Drizzle ORM with auto-generated migrations                                                                                             |
| **Schema**              | 13 tables: users, roles, role_permissions, customers, estates, sites, devices, events, alerts, audit_logs, reports, api_keys, settings |
| **API Routes**          | /health, /auth/login, /users, /roles, /devices, /events, /alerts, /reports, /settings — all with pagination, filtering, JWT auth       |
| **Seed data**           | 4 roles, 4 customers, 4 estates, 8 sites, 24 devices, 50 events, 15 alerts, 8 audit logs, 10 settings, 1 API key, 5 demo users         |
| **JWT Auth**            | `@fastify/jwt` — login endpoint returns Bearer token, all routes protected                                                             |
| **Dev commands**        | `pnpm db:start/stop/migrate/seed/api:dev` — convenience scripts at root                                                                |
| **Docs**                | `docs/backend-api.md` — full API reference with examples                                                                               |
| **No frontend changes** | Existing frontend untouched — still builds full 26 pages                                                                               |

---

## ✅ Completed — Platform Phase

| Area                            | Notes                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo**                    | pnpm workspaces, Turborepo, shared configs                                                                                                                            |
| **Shared packages**             | `@sentience/types`, `@sentience/utils`, `@sentience/config`, `@sentience/hooks`, `@sentience/ui` (scaffolded)                                                         |
| **Design System**               | shadcn/ui CSS variables (light + dark), Tailwind preset, custom animations, Inter font                                                                                |
| **UI Components**               | Button, Badge, Card, StatusDot, StatusBadge, EmptyState, PageHeader                                                                                                   |
| **Layout**                      | DashboardShell, Sidebar (collapsible, 13 nav items, mobile drawer), Header (search, theme toggle, notifications, connection indicator)                                |
| **Providers**                   | QueryProvider (TanStack Query, 30s staleTime), ThemeProvider (system preference, persisted)                                                                           |
| **Auth Store**                  | `useAuthStore`: mock login, role/permission stubs, persisted                                                                                                          |
| **UI Store**                    | `useUIStore`: sidebar, theme, mobile menu (persisted, tested)                                                                                                         |
| **Notification Store**          | `useNotificationStore`: addNotification, markAsRead/markAllAsRead                                                                                                     |
| **Live Device Store**           | `useLiveDeviceStore`: ephemeral real-time overlay, ring buffer (max 50)                                                                                               |
| **API Client**                  | `api-client.ts`, `query-keys.ts` (tested), pagination types                                                                                                           |
| **Socket Client**               | Singleton Socket.IO client, 14 typed events, auto-reconnect, rooms                                                                                                    |
| **MQTT Simulator**              | Device generator (4 estates, 8 sites), telemetry simulator, CLI, Docker Mosquitto                                                                                     |
| **Realtime Bridge**             | MQTT client, event normalizer (14 tests), device registry (9 tests), Socket.IO server with room routing                                                               |
| **Socket Hook**                 | `useSocket()`: event-to-query invalidation, live-store updates (tested)                                                                                               |
| **Devices Hook**                | `useDevices()`: TanStack Query + live overlay; `useDevice(id)`: single device detail + live overlay                                                                   |
| **Dashboard Data Hook**         | `useDashboardData()`: live KPIs with mock fallback                                                                                                                    |
| **Live Dashboard**              | KPI cards, System Health gauges, Live Events, Alerts feed, widgets                                                                                                    |
| **Device Table**                | HTML table with live overlay (status/battery/signal/temp)                                                                                                             |
| **Connection Indicator**        | Header Wifi/WifiOff icon                                                                                                                                              |
| **Documentation**               | ADRs (3), DEPLOYMENT.md, MQTT guide, Realtime bridge guide, CLAUDE.md, CHANGELOG.md, ROADMAP.md, BUILD_PLAN.md                                                        |
| **Sprint 1: Device Management** | Device detail page (`/devices/[id]`) with 6 tabs (Overview, Telemetry, I/O, Diagnostics, Events, Config), live telemetry overlay, device table linking, dynamic route |

---

## ✅ Completed — Sprint 2: Dashboard

| Area                         | Notes                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| **Fleet Health Score**       | Composite gauge (online% × 0.4 + battery × 0.3 + signal × 0.3) with green/amber thresholding  |
| **Live KPI cards**           | Total, Online, Offline, Fault, Warning counts from live device store                          |
| **Battery Distribution**     | Horizontal bar chart (Good/Fair/Low) via recharts                                             |
| **Signal Distribution**      | Horizontal bar chart (Excellent/Good/Fair/Poor) via recharts                                  |
| **Temperature Distribution** | Horizontal bar chart (Normal/High/Critical) via recharts                                      |
| **Devices by Estate**        | Summary cards per estate with status dots and drill-down links                                |
| **Recent Activity feed**     | Live event stream from ring buffer with severity icons                                        |
| **Offline Device list**      | Recently offline devices with name, site, last-seen links                                     |
| **Quick Action cards**       | View Offline, View Faults, Open Diagnostics, Export Report (placeholder)                      |
| **Simulator banner**         | Informational card when no live data is present                                               |
| **Today's Overview**         | Side panel with events count, connection status, health score                                 |
| **Shared components**        | `FleetHealthGauge`, `DistributionBar`, `RecentActivity`, `EstateSummaryCards`, `QuickActions` |

---

## ✅ Completed — Sprint 3: Alerts

| Area                   | Notes                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **Live Alert Store**   | Zustand store with ring buffer (max 100), acknowledge/resolve actions, history tracking |
| **Alert Emission**     | Bridge emits `alert:created` for battery_low/signal_weak/device_offline/device_fault    |
| **Alert Resolution**   | Bridge emits `alert:updated` for status transitions (acknowledge/resolve)               |
| **Socket Wiring**      | `useSocket` pushes `alert:created`/`alert:updated` to live alert store                  |
| **Alerts Page**        | Severity filters (critical/warning/info), status filters (open/acknowledged/resolved)   |
| **Alert Detail Panel** | Side sheet with full alert info, acknowledge/resolve actions, timeline                  |
| **Empty State**        | EmptyState component when no alerts exist                                               |
| **Live Alerts Demo**   | Start simulator → low battery/fault → alert appears → acknowledge → resolve             |

---

---

## ✅ Completed — Sprint 4: Event History

| Area                   | Notes                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **Event History Page** | Full event log with severity, category, device, and date filters                    |
| **Search**             | Text search across event titles and descriptions                                    |
| **Event Detail Panel** | Side panel with full event info, device/site/estate context, links to device detail |
| **CSV Export**         | Client-side CSV export of filtered events                                           |
| **Pagination**         | Server-style page navigation through event list                                     |
| **Empty State**        | EmptyState when no events match filters                                             |

## ✅ Completed — Sprint 5: Reports

| Area                            | Notes                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| **Report Dashboard**            | Filter bar with date range (today/7d/30d/90d), estate, site, device cascade filters |
| **Fleet Summary Cards**         | Total devices, avg battery, avg signal, open alerts — computed from live store      |
| **Fleet Health Gauge**          | Composite health score with status breakdown bars                                   |
| **Alert Trends Chart**          | Stacked area chart (critical/warning/info) over selected time range                 |
| **Device Availability Chart**   | Stacked bar chart (online/offline/fault) over time                                  |
| **Battery Health Chart**        | Distribution bar (Good/Fair/Low) — reuse from dashboard pattern                     |
| **Signal Quality Chart**        | Distribution bar (Excellent/Good/Fair/Poor) — reuse from dashboard pattern          |
| **Fault Distribution Chart**    | Donut pie chart with 6 fault categories and percentage labels                       |
| **CSV Export**                  | Client-side CSV generation with full metric, distribution, and alert data           |
| **PDF Export (placeholder)**    | Button disabled with "Coming soon" tooltip                                          |
| **Scheduling UI (placeholder)** | Daily/Weekly/Monthly badges with coming-soon state                                  |
| **Recent Exports List**         | In-memory list of recently exported reports with re-download buttons                |

## ✅ Completed — Sprint 6: User Management (RBAC)

| Area                      | Notes                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **Permission system**     | Full matrix (4 roles × 14 resources × 5 actions) in `@/lib/permissions`                       |
| **Auth store: real RBAC** | `hasPermission()`/`hasRole()` return real results; `loginAsRole()` for instant switching      |
| **Sidebar nav filtering** | Admin sees 13 items, Support sees 10, Customer sees 5                                         |
| **Route guards**          | `AuthGuard` (unauthenticated redirect) + `RequirePermission` (Access Denied for unauthorized) |
| **User management**       | User list, search/filter, create dialog, inline role change, activate/deactivate              |
| **Roles & Permissions**   | Role summary cards, expandable permission matrix with toggle switches                         |
| **Audit Log**             | Live store, search, action filter, CSV export, pagination                                     |
| **Settings**              | Tabbed UI (General/Security/Notifications/Maintenance), mock fields, save feedback            |
| **Profile**               | Live auth data, personal info edit, password change, notification prefs                       |
| **Demo role switching**   | Header role badge, Switch Role modal, quick-login on login page                               |

## ✅ Completed — v1.0 RC2: Frontend Integration

All 9 domains integrated with the backend API. The frontend no longer relies on mock data for core data flows. Settings load from `GET /api/settings` and persist changes via `PATCH /api/settings/:key` through TanStack Query.

| Domain           | Status  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Health**    | ✅ Done | Platform Health polls `GET /api/health`, shows real API status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **2. Devices**   | ✅ Done | Devices list and detail load from `GET /api/devices` + `GET /api/devices/:id`, live Socket.IO telemetry overlaid via Zustand, fallback error/loading/empty states, pagination count from API                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **3. Events**    | ✅ Done | Event history loads from `GET /api/events` + `GET /api/events/:id` via TanStack Query. Live Socket.IO events merged on top via Zustand ring buffer. Deduplication by eventId. Loading skeleton, error state with retry, empty state preserved. Client-side filters (severity/category/device/date/search) and CSV export preserved. Query keys add `events.detail`. New files: `lib/events.ts` (API types + functions), `hooks/use-events.ts` (`useEvents` + `useEvent`).                                                                                                                                                                                                                                                                                  |
| **4. Alerts**    | ✅ Done | Alerts load from `GET /api/alerts` + `GET /api/alerts/:id` via TanStack Query. Live `alert:created`/`alert:updated` Socket.IO events merged on top via Zustand store. Acknowledge/resolve via `PATCH /api/alerts/:id` with optimistic mutations. Deduplication by alert ID. Loading skeleton, error state with retry, empty state preserved. Filters (severity/status) preserved. New files: `lib/alerts.ts` (API types + functions + mutations), `hooks/use-alerts.ts` (`useAlerts`, `useAlert`, `useAcknowledgeAlert`, `useResolveAlert`).                                                                                                                                                                                                               |
| **5. Reports**   | ✅ Done | Report summary and trends load from `GET /api/reports/summary` + `GET /api/reports/trends` via TanStack Query. Live device/alert overlay preserved for freshness. Client-side filters (date range, estate, site, device) preserved. CSV export unchanged. PDF export placeholder preserved. Loading skeleton with summary/gauge/chart placeholders. Error state with retry. New files: `lib/reports.ts` (API types + functions), `hooks/use-reports.ts` (`useReportSummary`, `useReportTrends`, `useRecentReports`, `useGenerateReport`). Backend: `GET /api/reports/summary` and `GET /api/reports/trends` endpoints added to compute aggregate data from devices/events/alerts tables with optional estate/site/device filtering.                        |
| **6. Users**     | ✅ Done | Users list loads from `GET /api/users` via TanStack Query. Role drop-down populated from `GET /api/roles`. Create/edit/deactivate via `POST/PATCH/DELETE /api/users` with mutations. Backend users route updated to join with `roles` table so API returns both `roleId` (UUID) and `role` (enum name). Loading spinner, error state with retry, empty state preserved. Search, filters, pagination, dialog, role badges all preserved. New files: `lib/users.ts` (API types + functions), `lib/roles.ts` (API types + functions), `hooks/use-users.ts` (`useUsers`, `useUser`, `useRoles`, `useCreateUser`, `useUpdateUser`, `useDeactivateUser`). No mock user records remain in users page.                                                             |
| **7. Roles**     | ✅ Done | Role list loads from `GET /api/roles`, permission detail from `GET /api/roles/:id`. Inline toggle to grant/revoke permissions via `POST/DELETE /api/roles/:id/permissions` with admin-only mutations. Backend: added `POST /api/roles/:id/permissions` and `DELETE /api/roles/:id/permissions` endpoints, Zod validation, duplicate checking, admin role guard. New files: `hooks/use-roles.ts` (`useRole`, `useGrantPermission`, `useRevokePermission`). Updated: `lib/roles.ts` (`getRole`, `grantPermission`, `revokePermission`), `query-keys.ts` (`roles.detail`). Loading spinner, error state with retry (falls back to static matrix), empty state for no roles. Role card granted-resources badges reflect live permission data during expansion. |
| **8. Audit Log** | ✅ Done | Audit log loads from `GET /api/audit-logs` via TanStack Query. Backend: `apps/api/src/routes/audit-logs.ts` with pagination, action/resource/date/search filters. New files: `lib/audit-logs.ts` (`getAuditLogs`, `getAuditLog`, `AuditLogApiItem`, `AuditLogListResponse`), `hooks/use-audit-logs.ts` (`useAuditLogs`, `useAuditLog`), `query-keys.ts` (`auditLogs.all/list/detail`). Merges API entries with locally-recorded entries (for write-back visibility). Deduplicates by ID. Client-side search, action filter, severity filter, pagination, CSV export, detail drawer preserved. Loading spinner, error state with retry (falls back to local entries), empty state preserved.                                                                |
| **9. Settings**  | ✅ Done | Settings page loads from `GET /api/settings` via TanStack Query. Changed settings persist through `PATCH /api/settings/:key` mutations. Platform name, timezone, password policy, session timeout, MFA toggle, data retention, maintenance mode, and feature flags (CSV export, MFA) all read/write through the API. Loading spinner, error state with retry, save feedback with error handling. Table-driven local state hydration from API response. New files: `lib/settings.ts` (`getSettings`, `updateSetting`, `SettingApiItem`, `SettingListResponse`), `hooks/use-settings.ts` (`useSettings`, `useUpdateSetting`), `query-keys.ts` (`settings.all`).                                                                                              |

---

## ✅ Completed — v1.0 RC1: Backend API + PostgreSQL

| Area                       | Notes                                                               |
| -------------------------- | ------------------------------------------------------------------- |
| **Admin overview page**    | Hub page with admin module cards and system-wide status             |
| **Tenant settings**        | Platform name, org profile, timezone, branding in enhanced settings |
| **Feature flags**          | Toggle-based feature flag management UI                             |
| **Maintenance mode**       | Global maintenance mode with toggle and status indicator            |
| **API key management**     | Create/revoke API keys, masked display, last used tracking          |
| **Audit log enhancements** | Detail drawer, severity filters, improved export                    |
| **Notification rules**     | Alert thresholds, channel toggles, role-based preferences           |
| **Platform health**        | Bridge, MQTT, Simulator, DB/API status cards                        |
| **Admin route protection** | Non-admin roles blocked from admin pages                            |

| Sprint | Module    | Demo   |
| ------ | --------- | ------ |
| **7**  | **Admin** | ⭐⭐⭐ | Log in as Admin → manage feature flags, API keys, platform health |

---

## ✅ Completed — RC3 Phase 1: Application Audit

| Checklist Item                                      | Status    | Notes                                                                                                |
| --------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| Find remaining mock data                            | ✅ Done   | Found in 4 pages + auth store + audit store (partial fix applied to audit store)                     |
| Verify every page uses backend APIs                 | ✅ Done   | 15/19 pages use real APIs — api-keys, notification-rules, notifications, device detail tabs use mock |
| Verify TanStack Query owns server state             | ✅ Done   | No server state leaked into Zustand                                                                  |
| Verify Zustand only holds UI/realtime/session state | ✅ Done   | All stores correctly scoped                                                                          |
| Verify query invalidation after mutations           | ✅ Done   | All mutations properly invalidate                                                                    |
| Verify optimistic mutations and rollback            | ✅ Fixed  | 6 mutations were missing optimistic rollback — **all fixed**                                         |
| Find duplicated business logic                      | ✅ Fixed  | `use-live-devices.ts` dead code deleted, local `cn()` replaced                                       |
| Find dead code from old mock implementations        | ✅ Fixed  | 1 dead file deleted, 1 config entry cleaned, 1 mock seed data removed                                |
| Confirm shared selectors for derived metrics        | ✅ Done   | All metrics use `@sentience/utils` selectors                                                         |
| **Deliverable: Audit Report**                       | ✅ Done   | `docs/implementation/APPLICATION_AUDIT_REPORT.md`                                                    |
| TypeScript clean                                    | ✅ Passed | Zero errors                                                                                          |
| Production build clean                              | ✅ Passed | 26/26 pages, no bundle errors                                                                        |

### Issues Fixed

- Deleted dead `use-live-devices.ts` hook (never imported)
- Removed `@sentience/mock` from next.config.ts transpilePackages
- Replaced local `cn()` with `@sentience/utils` import
- Removed 5 mock seed entries from audit store
- Added optimistic updates + rollback to 3 user mutations, 2 role permission mutations, 1 settings mutation

### Known Remaining Debt

- Auth store mock login (no backend auth endpoint)
- `useGenerateReport` missing optimistic update (low priority)

---

## ✅ Completed — RC3 Phase 2: UX Audit

| Checklist Item                                     | Status     | Notes                                                      |
| -------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| Loading states on all data-driven views            | ✅ Done    | 14/20 pages covered (6 mock-data pages excluded)           |
| Empty states on all data-driven views              | ✅ Done    | 15/20 pages covered (5 mock-data pages excluded)           |
| Error states with retry actions                    | ✅ Done    | 14/20 pages covered (6 mock-data pages excluded)           |
| Offline/connection handling                        | ✅ Done    | 100% of API-backed pages have connection banners           |
| Responsive layouts (375px, 768px, 1280px+)         | ✅ Done    | 20/20 pages pass                                           |
| Dark mode rendering                                | ✅ Done    | 20/20 pages pass                                           |
| Keyboard navigation                                | ⚠️ Partial | 12/20 pages covered                                        |
| Accessibility labels (ARIA, htmlFor, radio groups) | ⚠️ Partial | 10/20 pages; 14 issues fixed, ~20 icon-only buttons remain |
| Form validation (number bounds, required fields)   | ✅ Done    | 15/20 pages covered                                        |
| Toast/save feedback after mutations                | ✅ Done    | 7/15 mutation-capable pages covered                        |
| **Deliverable: UX Audit Report**                   | ✅ Done    | `docs/implementation/UX_AUDIT_REPORT.md`                   |
| TypeScript clean                                   | ✅ Passed  | Zero errors                                                |
| Production build clean                             | ✅ Passed  | 26/26 pages                                                |

### Issues Fixed

- 5 search inputs missing `aria-label` — Added labels
- Back button on device detail icon-only — Added `aria-label`
- Event/Alert severity filter buttons — Added `role="radio"` + `aria-pressed`
- Settings number inputs — Added `min="0"` constraints
- Users page — Added success feedback after mutations
- Profile page — Added error state for save failure
- Estates, Notifications, Diagnostics — Added EmptyState components

### Remaining UX Debt

- Connection banners use `<div>` instead of `role="status"`
- Devices table pagination "Previous" always disabled (no server-side pagination wired)
- Estates, Sites, Notifications, Diagnostics, API Keys use hardcoded mock data (need API integration)

---

## ✅ Completed — RC3 Phase 3: API Audit & RBAC Hardening

| Checklist Item                    | Status       | Notes                                                                       |
| --------------------------------- | ------------ | --------------------------------------------------------------------------- |
| HTTP status codes                 | ✅ Done      | 1 low inconsistency (soft-delete returns 200 vs 204)                        |
| Error response format             | ✅ Done      | All errors follow `{ message, code, details? }`                             |
| Zod validation                    | ✅ Done      | Good coverage; 2 gaps identified (roleId not verified, z.any() on settings) |
| Authentication enforcement        | ✅ Done      | All protected endpoints require auth                                        |
| RBAC enforcement                  | **⚠️ Fixed** | 4 critical gaps found and patched                                           |
| Pagination consistency            | ✅ Done      | All list endpoints use same pattern                                         |
| Filtering                         | ✅ Done      | 2 low gaps (alerts missing search/date, reports no filters)                 |
| Sorting                           | ✅ Done      | Consistent across all endpoints                                             |
| Search                            | ⚠️ Partial   | 2 gaps (alerts no search, devices no serial# search)                        |
| Transactions                      | ❌ Not used  | Tracked as debt                                                             |
| Response shape consistency        | ✅ Done      | 2 minor inconsistencies (documented)                                        |
| Documentation gaps                | ⚠️ Partial   | 4 undocumented endpoint areas                                               |
| **Deliverable: API Audit Report** | ✅ Done      | `docs/implementation/API_AUDIT_REPORT.md`                                   |

### Critical Issues Fixed (RBAC)

- `PATCH /api/settings/:key` — Added `requireRole("admin")` (was: any auth user)
- `PATCH /api/users/:id` — Added `requireRole("admin")` + role ID validation (was: any user)
- `PATCH /api/devices/:id` — Added `requireRole("admin", "support")` (was: any user)
- `PATCH /api/alerts/:id` — Added `requireRole("admin", "support")` (was: any user)
- `GET /api/users` — Added `requireRole("admin")` (was: any auth user)

### Remaining API Debt

- Customer-level data isolation not implemented
- No transactions on multi-query operations
- No OpenAPI/Swagger spec
- No WebSocket event emission from REST mutations

---

## ✅ Completed — RC3 Phase 4: Performance Audit

| Checklist Item                            | Status      | Notes                                             |
| ----------------------------------------- | ----------- | ------------------------------------------------- |
| Shared JS bundle                          | ✅ < 150 kB | **102 kB** ✅                                     |
| Dashboard first-load JS                   | ✅ Reduced  | **123 kB** (was 222 kB — Recharts lazy-loaded)    |
| All other pages                           | ✅ < 140 kB | Range: 107–138 kB                                 |
| Database indexing                         | ✅ Done     | Indexes added for high-frequency query patterns   |
| TanStack Query staleTime                  | ✅ Done     | 30s staleTime on non-critical queries             |
| Socket invalidation debounce              | ✅ Done     | 100ms debounce window                             |
| **Deliverable: Performance Audit Report** | ✅ Done     | `docs/implementation/PERFORMANCE_AUDIT_REPORT.md` |

---

## ✅ Completed — RC3 Phase 5: Security Audit

| Checklist Item                         | Status     | Notes                                                        |
| -------------------------------------- | ---------- | ------------------------------------------------------------ |
| Authentication flow                    | ✅ Fixed   | Real login via `POST /api/auth/login`, JWT stored in Zustand |
| JWT secret                             | ✅ Fixed   | No default — required at startup                             |
| Password hashing                       | ✅ Fixed   | bcrypt (cost 12), was SHA-256                                |
| Socket.IO auth                         | ✅ Fixed   | JWT verified during handshake                                |
| RBAC enforcement                       | ✅ Fixed   | 4 critical gaps patched                                      |
| Input validation                       | ⚠️ Partial | 2 Zod gaps tracked as debt                                   |
| CORS                                   | ⚠️ Debt    | `origin: true` allows any origin                             |
| Secrets management                     | ✅ Fixed   | Dev `.env` gitignored                                        |
| **Deliverable: Security Audit Report** | ✅ Done    | `docs/implementation/SECURITY_AUDIT_REPORT.md`               |

### Issues Fixed

- SHA-256 → bcrypt password hashing (C-1)
- JWT secret has no default fallback (C-2)
- Dev .env gitignored, unique secret (C-3)
- Real auth endpoint (H-1)
- Socket.IO JWT verification (H-2)
- Demo login isolated (H-3)
- JWT stored/reused by api-client (H-4)

---

## ✅ Completed — RC3 Phase 6: Documentation & Release Readiness

| Checklist Item              | Status    | Notes                                         |
| --------------------------- | --------- | --------------------------------------------- |
| CLAUDE.md aligned           | ✅ Done   | RC3 complete, real RBAC, real auth            |
| BUILD_PLAN.md complete      | ✅ Done   | All RC3 phases added                          |
| ROADMAP.md deduplicated     | ✅ Done   | Future section fixed                          |
| CHANGELOG.md deduplicated   | ✅ Done   | All RC3 phases recorded                       |
| RELEASE_PLAN.md updated     | ✅ Done   | Criteria match current state                  |
| TECHNICAL_DEBT.md pruned    | ✅ Done   | Outdated entries removed                      |
| DEPLOYMENT.md aligned       | ✅ Done   | Realtime bridge reflected                     |
| Production Readiness Report | ✅ Done   | `docs/implementation/PRODUCTION_READINESS.md` |
| pnpm lint                   | ✅ Passed | Zero errors                                   |
| pnpm build                  | ✅ Passed | 26/26 pages                                   |

---

## ✅ Completed — v1.5.0 — Playwright UI Regression Suite (2026-07-05)

| Area                          | Status      | Notes                                                         |
| ----------------------------- | ----------- | ------------------------------------------------------------- |
| **UI component tests**        | ✅ Done     | Estates, Sites, Devices, Alerts, Events, Reports, Diagnostics |
| **Auth flows**                | ✅ Done     | Login, Forgot Password, MFA, Role switching                   |
| **Admin pages**               | ✅ Done     | Users, Roles, API Keys, Notification Rules, Platform Health   |
| **Navigation**                | ✅ Done     | Sidebar, header, breadcrumbs, role-based filtering            |
| **TypeScript check**          | ✅ Passed   | Zero errors                                                   |
| **Production build**          | ✅ Passed   | 28/28 pages, shared JS 102 kB                                 |

---

## ✅ Completed — v1.5.1 — Complete Core Entity Management (2026-07-06)

**Goal:** Remove remaining mock business entities for Estates and Sites.

| Area                       | Status      | Notes                                             |
| -------------------------- | ----------- | ------------------------------------------------- |
| **Estates CRUD (backend)** | ✅ Done     | `GET/POST/PATCH/DELETE /api/estates` with RBAC    |
| **Estates page (frontend)**| ✅ Done     | Real API via `useEstates()`, create dialog, delete |
| **Sites CRUD (backend)**   | ✅ Done     | `GET/POST/PATCH/DELETE /api/sites` with RBAC      |
| **Sites page (frontend)**  | ✅ Done     | Estate filter, search, create dialog, delete      |
| **Site count sync**        | ✅ Done     | Automatically updated on create/delete             |
| **Customer isolation**     | ✅ Done     | Customer-scoped data access on both endpoints     |
| **Search/filter**          | ✅ Done     | Server-side search + estate filter on sites       |
| **Referential integrity**  | ✅ Done     | 409 with count-based message on estate/site delete |
| **Loading/error/empty**    | ✅ Done     | Skeletons, error cards, EmptyState on both pages  |
| **TypeScript check**       | ✅ Passed   | API + web both zero errors                        |
| **Production build**       | ✅ Passed   | 30/30 pages, shared JS 103 kB                     |

### New Files

- `apps/api/src/routes/estates.ts` — Estate CRUD API (list, detail, create, update, delete with 409 for sites)
- `apps/api/src/routes/sites.ts` — Site CRUD API (list, detail, create, update, delete with 409 for devices)
- `apps/web/src/lib/estates.ts` — Estate API client types and functions
- `apps/web/src/lib/sites.ts` — Site API client types and functions
- `apps/web/src/hooks/use-estates.ts` — TanStack Query hooks (list, detail, create, update, delete)
- `apps/web/src/hooks/use-sites.ts` — TanStack Query hooks (list, detail, create, update, delete)

### Modified Files

- `apps/api/src/index.ts` — Registered estate and site routes
- `apps/web/src/lib/index.ts` — Exported new API functions and types
- `apps/web/src/app/(dashboard)/estates/page.tsx` — Rewritten with real API, create dialog, delete confirmation with error display
- `apps/web/src/app/(dashboard)/sites/page.tsx` — Rewritten with real API, estate filter, search, create/delete dialogs with error display

---

## ✅ Completed — v1.5.2 — Device Diagnostics (2026-07-06)

**Goal:** Replace the hardcoded diagnostics placeholder with an extensible test-based system.

**Design approach:** Diagnostics are modeled as entities (`DiagnosticTest` with `type`, `supportedDeviceTypes`, `timeout`, `resultSchema`), not hardcoded per-device buttons. The UI renders whatever tests the backend reports for a given device type. See `apps/web/src/app/(dashboard)/diagnostics/page.tsx` for the dynamic rendering.

(Full details retained in prior roadmap entry — see v1.5.2 changelog.)

---

## ✅ Completed — v1.5.3 — Account Management (2026-07-06)

**Goal:** Complete authentication flows that currently don't work (forgot password, MFA) and fix profile persistence.

| Area                              | Status     | Notes                                                       |
| --------------------------------- | ---------- | ----------------------------------------------------------- |
| **Forgot password (backend)**     | ✅ Done    | `POST /api/auth/forgot-password` with secure token, email dispatch (dev logger), rate-limit safe responses |
| **Forgot password (frontend)**    | ✅ Done    | Wired to real API via `useForgotPassword()` hook. Loading, error, success states. Generic response prevents user enumeration. |
| **Password reset (backend)**      | ✅ Done    | `POST /api/auth/reset-password` with SHA-256 token verification, expiry, single-use, all-token invalidation. DB transaction for safety. |
| **Password reset (frontend)**     | ✅ Done    | New `/reset-password?token=` page. Handles missing/expired tokens, password strength validation, confirmation matching. |
| **MFA setup (backend)**           | ✅ Done    | `POST /api/auth/mfa/setup` — TOTP secret generation (otplib), `POST /api/auth/mfa/verify` — code validation and enable. QR code URI returned. |
| **MFA challenge (backend)**       | ✅ Done    | Login with MFA user returns `mfaRequired: true` + short-lived MFA token. `POST /api/auth/mfa/verify` validates code and returns JWT. |
| **MFA disable (backend)**         | ✅ Done    | `POST /api/auth/mfa/disable` — password verification, optional code check, clears secret and flag. |
| **MFA page (frontend)**           | ✅ Done    | Wired to real API via `useMfaVerify()`. 6-digit input with auto-focus, error display, code clearing on failure. Suspense-wrapped. |
| **Login MFA redirect**            | ✅ Done    | Auth store login() catches `MfaRequiredError`, login page redirects to `/mfa?token=` with the MFA session token. |
| **Change password (backend)**     | ✅ Done    | `POST /api/auth/change-password` — requires current password, bcrypt re-hash, db persistence. |
| **Change password (frontend)**    | ✅ Done    | Profile page change password section wired to real API mutation. Inline validation, loading state, error/success feedback. |
| **Profile persistence (backend)** | ✅ Done    | `PUT /api/auth/me` — name and email update with duplicate email checking. |
| **Profile page (frontend)**       | ✅ Done    | Wired save buttons to `useUpdateProfile()` mutation. Loading, error, success feedback. Audit logging preserved. |
| **MFA UI (profile page)**         | ✅ Done    | Full MFA setup wizard (password → QR code → verify), disable with password + optional code, inline error handling. |
| **Email abstraction**             | ✅ Done    | `EmailService` interface with `DevEmailLogger` implementation. Reset links logged to console in dev. Pluggable for SMTP/SendGrid/Resend. |
| **DB migration**                  | ✅ Done    | `0005_add_account_management` — `password_reset_tokens` table + `mfa_secret` column on users |
| **TypeScript check**              | ✅ Done    | Zero errors across 9 packages |
| **Production build**              | ✅ Done    | 30/30 pages, shared JS 103 kB |

### New API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/forgot-password` | Send password reset email | None |
| `POST` | `/api/auth/reset-password` | Reset password with token | None |
| `POST` | `/api/auth/mfa/setup` | Generate TOTP secret | JWT + password |
| `POST` | `/api/auth/mfa/verify` | Verify TOTP code (setup or challenge) | JWT or MFA token |
| `POST` | `/api/auth/mfa/disable` | Disable MFA | JWT + password |
| `GET` | `/api/auth/mfa/status` | Check MFA status | JWT |
| `POST` | `/api/auth/change-password` | Change password | JWT |
| `PUT` | `/api/auth/me` | Update profile (name/email) | JWT |

### New Files

- `apps/api/src/lib/email.ts` — Email service abstraction (interface + DevEmailLogger)
- `apps/api/src/db/schema/password-reset-tokens.ts` — Password reset tokens table schema
- `apps/web/src/lib/auth.ts` — Account management API client functions
- `apps/web/src/hooks/use-auth-account.ts` — TanStack Query hooks for auth mutations
- `apps/web/src/app/(auth)/reset-password/page.tsx` — New reset password page

### Modified Files

- `apps/api/src/routes/auth.ts` — Added 8 new endpoints (forgot-password, reset-password, MFA setup/verify/disable/status, change-password, update profile)
- `apps/api/src/config.ts` — Added `APP_URL` env var for reset link construction
- `apps/api/src/db/schema/users.ts` — Added `mfaSecret` column
- `apps/api/src/db/schema/index.ts` — Exported password-reset-tokens schema
- `apps/api/migrations/` — Added `0005_add_account_management` migration
- `apps/web/src/stores/auth-store.ts` — Added `MfaRequiredError` class, login now handles MFA challenge
- `apps/web/src/app/(auth)/mfa/page.tsx` — Rewired to real API, Suspense-wrapped
- `apps/web/src/app/(auth)/forgot-password/page.tsx` — Rewired to real API mutation
- `apps/web/src/app/(auth)/login/page.tsx` — MFA redirect on `MfaRequiredError`
- `apps/web/src/app/(dashboard)/profile/page.tsx` — Rewired profile save, password change, MFA setup/disable to real API mutations
- `apps/web/src/lib/index.ts` — Exported auth API functions

---

## ✅ Completed — v1.5.4 — Platform Administration (2026-07-15)

**Goal:** Fill remaining feature gaps in dashboard, admin overview, platform health, and settings persistence.

| Area                                | Status     | Notes                                                   |
| ----------------------------------- | ---------- | ------------------------------------------------------- |
| **Dashboard summary API**           | ✅ Done    | `GET /api/dashboard/summary` with full fleet KPIs, customer isolation, estate breakdowns |
| **Dashboard page (frontend)**       | ✅ Done    | Uses real API endpoint with live device store overlay   |
| **Admin overview stats**            | ✅ Done    | `GET /api/admin/stats` returns real DB counts to `useAdminStats()` |
| **Platform Health service status**  | ✅ Done    | `GET /api/admin/health` — 5 real checks (API, DB, MQTT via TCP, Bridge via Socket.IO, Simulator via SQL) |
| **Settings: Tenant tab**            | ✅ Done    | Persists `tenant_org_name`, `brand_color`, `support_phone`, `address` to API |
| **Settings: Notification channels** | ✅ Done    | Email/push/SMS/webhook toggles persisted to `notification_*` setting keys |
| **Settings: Maintenance tab**       | ✅ Done    | Consumes `usePlatformHealth()` for live MQTT/DB status |
| **Profile notification prefs**      | ✅ Done    | Interactive toggles with optimistic updates via `PUT /api/auth/me` |
| **Reports: Recent exports**         | ✅ Done    | Removed hardcoded mock data; session-only tracking with honest empty state |
| **Reports: Schedule placeholder**   | ➡️ Deferred | Remains "Coming Soon" — documented as technical debt     |
| **Reports: PDF Export**             | ➡️ Deferred | PDF export button functional (v1.3.0) — scheduled scheduling deferred |
| **TypeScript check**                | ✅ Passed  | Zero errors                                              |
| **Production build**                | ✅ Passed  |                                                          |

**Definition of Done:** Dashboard shows real data without simulator. All settings persist. Platform Health reflects actual service status. Profile notification prefs wire to API. No mock data remains in production UI.

---

## ✅ Completed — v1.6.0 — Real Infrastructure E2E Validation (2026-07-16)

**Validation outcome:** All 6 gates passed. Release approved. Tagged `v1.6.0`.

---

## ✅ Completed — v1.7.0 — Fleet Management: Device Tags & Groups (2026-07-16)

**Goal:** Give operators the ability to organize devices into meaningful collections.

| Area | Status | Notes |
|------|--------|-------|
| **Tags on device list** | ✅ Done | Tags column with badges (max 3 + "+N"), tag filter chips, `?tags=` API param |
| **Tag editor on device detail** | ✅ Done | Inline add/remove, persisted via `PATCH /api/devices/:id`, Enter/Escape keyboard support |
| **Device Groups DB + API** | ✅ Done | `device_groups` table, full CRUD with RBAC (admin/support for mutations) |
| **Groups list page** | ✅ Done | `/groups` — card grid, search, create dialog, delete confirmation |
| **Group detail page** | ✅ Done | `/groups/[id]` — metadata, member device table, edit, add/remove devices |
| **Nav entry** | ✅ Done | `/groups` in sidebar, visible to admin/support via `device-groups` resource |
| **Dialog/AlertDialog components** | ✅ Done | shadcn-style components built on `@radix-ui/react-dialog` and `@radix-ui/react-alert-dialog` |
| **TypeScript check** | ✅ Passed | Zero errors across all 9 packages |
| **Production build** | ✅ Passed | 29/29 pages, shared JS 103 kB |

**Summary of validation (see `docs/release/VALIDATION_v1.6.0.md`):**

| Gate | Result | Key Evidence |
|------|--------|-------------|
| Gate 0 — Repository Baseline | ✅ | Commit `9e69571`, clean tree, lint + build pass |
| Gate 1 — Docker Build | ✅ | 5/5 images built, digests recorded |
| Gate 2 — Stack Startup | ✅ | 6/6 services running, all healthy |
| Gate 3 — Readiness | ✅ | `{"status":"ready"}` at `/api/ready` |
| Gate 4 — Real E2E Tests | ✅ | 16/16 tests pass in 14.4s |
| Gate 5 — Failure Modes | ✅ | MQTT, Bridge, DB failure all detected and recovered |

**Highest-value achievement:** Full telemetry pipeline proven end-to-end: Simulator → MQTT → Bridge → Socket.IO → Browser UI. Failure resilience proven across 3 dependency outage scenarios.

**Key fixes during validation:**
- Playwright base image tag resolution
- Dockerfile stale path corrections
- CORS and `NEXT_PUBLIC_API_URL` service-name resolution
- Healthcheck bash-isms replaced with `nc` for Alpine
- IPv6 `localhost` → `127.0.0.1` in healthchecks
- Orphan migration `0006` journal entry fix
- Next.js standalone output path correction
- 16 test-specific fixes (selectors, localStorage keys, API routing)


---

## 🔮 Future (v1.8.0+)

- **Bulk operations** — Apply actions (rename, retag, diagnostics, firmware) to multiple devices at once, including group-scoped operations
- **Filter-based dynamic groups** — Groups defined by query rules (e.g. "all offline sensors in Building A") instead of explicit membership
- **Standalone tags management** — UI to create/manage/rename tags independently, not just inline
- **Notification routing by group** — Route alert notifications to specific channels based on device group membership
- **Fleet exports** — Export device data by group to CSV
- **Batch diagnostics** — Run diagnostics across all devices in a group
