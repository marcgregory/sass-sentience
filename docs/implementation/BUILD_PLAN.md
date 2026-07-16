# Build Plan

> **Engineering execution.** Details each sprint's goal, scope, tasks, and definition of done.
> Product backlog (what/why) lives in `ROADMAP.md`.
> Last updated: 2026-07-16 (v1.8.0 delivered)

---
## Sprint 8: v1.0 RC1 — Backend API + PostgreSQL

> **Demo:** Start PostgreSQL with `pnpm db:start`, migrate with `pnpm db:migrate`, seed with `pnpm db:seed`, start API with `pnpm api:dev` → `GET /api/health` returns OK, `GET /api/devices` returns 24 seeded devices with pagination, `POST /api/auth/login` returns JWT token. All 9 endpoint groups are functional.

**Goal:** Move Sentience from mock/in-memory data toward a real backend foundation. Build a Fastify + PostgreSQL + Drizzle ORM backend with all domain tables, CRUD API routes, JWT authentication, and seed data matching the existing frontend mock data.

**Scope:** New `apps/api` workspace. 13 database tables. 9 API route groups with pagination, filtering, and JWT auth. Seed data for demo/tests. No frontend changes.

**Dependencies:** Docker for PostgreSQL, `@sentience/types` for domain shapes, `@sentience/config` for TypeScript config.

### Tasks

- [x] **Create `apps/api` package** — package.json, tsconfig, drizzle config, docker-compose, env
- [x] **Define Drizzle schema** — 13 tables with relations, indexes, and unique constraints across users, roles, customers, estates, sites, devices, events, alerts, audit_logs, reports, api_keys, settings
- [x] **Build Fastify app** — Entry point, CORS, JWT plugin, error handler, decorators, graceful shutdown
- [x] **Implement route handlers** — health, auth (login + me), users (CRUD), roles, devices (list + detail + update), events (list + detail), alerts (list + detail + acknowledge/resolve), reports (list + create), settings (list + update)
- [x] **Create seed script** — 4 roles with full permission matrix, 4 customers, 4 estates, 8 sites, 24 devices, 50 events, 15 alerts, 8 audit logs, 10 settings, 1 API key, 5 demo users
- [x] **Update monorepo config** — turbo.json pipeline, root package.json scripts
- [x] **Documentation** — `docs/backend-api.md`, updated CHANGELOG, ROADMAP, TECHNICAL_DEBT
- [x] **Verify** — `pnpm lint` clean, `pnpm build` clean, all endpoints tested

### Acceptance Criteria

1. [x] API starts locally with `pnpm api:dev`
2. [x] PostgreSQL starts with `pnpm db:start`
3. [x] Migrations run successfully
4. [x] Seed data loads (24 devices, 50 events, 15 alerts, 5 users, etc.)
5. [x] `GET /api/health` returns OK with DB status
6. [x] `GET /api/devices` returns seeded devices with pagination
7. [x] `GET /api/events` returns seeded events with filters
8. [x] `GET /api/alerts` returns seeded alerts with filters
9. [x] `GET /api/users` returns seeded users (with JWT auth)
10. [x] `POST /api/auth/login` returns JWT token for demo accounts
11. [x] `pnpm lint` and `pnpm build` pass
12. [x] Existing frontend still builds (26 pages, zero errors)

### Completed

2026-07-03 — v1.0 RC1 delivered. Backend API with Fastify + PostgreSQL + Drizzle ORM. 13 database tables, 9 API route groups, JWT auth, seed data matching mock data. All endpoints tested. Frontend unchanged.
---

## Sprint Rule

**Only one sprint may be active at a time.**

A sprint is complete only when **all** of the following are true:

- [x] All sprint tasks are implemented.
- [x] All Definition of Done items are met.
- [x] The sprint demo works end-to-end.
- [x] `ROADMAP.md` is updated (move completed items, advance queue).
- [x] `CHANGELOG.md` is updated with sprint entry.
- [x] TypeScript compiles clean (`pnpm lint`).
- [x] Production build succeeds (`pnpm build`).

Do not begin the next sprint until the current sprint is accepted.

---

## Guiding Principle

**Prioritize user-facing product functionality over infrastructure.**

The infrastructure phase is complete. The current architecture supports all remaining product modules. Do not add infrastructure (Kubernetes, Redis, CI/CD, multi-region, scaling, monitoring) unless it is strictly required by the current sprint's user stories. Prefer completing vertical slices over expanding the platform horizontally.

---

## Sprint Priorities

| Sprint | Module | Demo |
|--------|--------|------|
| 1 | **Device Management** | Click a device → live telemetry updating every second |
| 2 | **Dashboard** | Dashboard updates automatically as simulator changes |
| 3 | **Alerts** | Trigger low battery → alert appears instantly |
| 4 | **Event History** | Search event history and drill into a device |
| 5 | **Reports** | Export a monthly report to CSV/PDF |
| 6 | **User Management** | Log in as Customer vs Support vs Admin — different permissions |
| 7 | **Admin** | Log in as Admin → manage feature flags, API keys, platform health |
| 8 | **v1.0 RC1 (Backend API)** | PostgreSQL + Fastify API — health, auth, CRUD, seed data |
| 9 | **v1.7.0 Fleet Management** | Add tags to devices, create groups, organize the fleet |
| 10 | **v1.8.0 Fleet Operations Foundation** | Bulk tag operations, device↔group relationship, group polish, E2E tests |
| 11 | **v1.9.0 Firmware Rollout** | Firmware package registry, rollout wizard, progress dashboard, E2E tests |

---

## Definition of Done (per sprint)

- TypeScript compiles cleanly (`pnpm lint`)
- Production build succeeds (`pnpm build`)
- Dark mode renders correctly
- Loading, empty, and error states handled for all data-driven views
- Responsive at 375px, 768px, and 1280px+
- Follows established patterns (page structure, state management, components)
- `ROADMAP.md` updated with completed and advanced items
- `CHANGELOG.md` updated with sprint entry
- No new technical debt without documenting it in `docs/implementation/TECHNICAL_DEBT.md`
- **Release Gate: E2E Coverage** — Every new user-facing feature introduced in this release must have at least one end-to-end Playwright scenario. The full E2E suite must pass before the release is considered complete.

---

## Sprint 1: Device Management

> **Demo:** Click a device on the device table → see live telemetry updating every second.

**Goal:** Turn the static `/devices/[id]` stub into a full-featured device detail page with live telemetry, history, diagnostics, firmware, configuration, and I/O panels.

**Scope:** Single page (`/devices/[id]`). Uses existing live-device store and mock data. No backend API changes.

**Dependencies:** Live device store (`useLiveDeviceStore`), device list page, `DeviceTelemetry`/`DeviceIO`/`DeviceFirmware`/`DeviceConfig`/`DeviceDiagnostic` types existing in `@sentience/types`.

### Tasks

- [x] **Device Overview** — hero section with name, ID, status badge, estate/site, model, last seen
- [x] **Live Telemetry panel** — battery (%) + voltage (V) + temperature (°C) + signal strength (dBm) reading from live store, auto-updating
- [x] **Status Timeline** — recent status changes with timestamp, previous → current
- [x] **Event History** — recent events scoped to this device, severity badges, timestamps
- [x] **Configuration** — read-only config key/value list (firmware version, sampling interval, mqtt topic, etc.)
- [x] **Diagnostics** — mock run/pass/fail cards for common diagnostics (ping, MQTT connectivity, signal test)
- [x] **Firmware** — version, release date, release notes, update available indicator
- [x] **Inputs/Outputs** — I/O point list with name, type, value, status
- [x] Loading, empty, and error states for each section
- [x] Responsive layout — 3-column grid on desktop, 2 on tablet, 1 on mobile

### Acceptance Criteria

1. ✅ Navigate from device table to detail page via device row click
2. ✅ Telemetry panel updates in real time as simulator publishes
3. ✅ Each section handles empty data gracefully (EmptyState)
4. ✅ Each section handles error state gracefully
5. ✅ Page is responsive at all three breakpoints
6. ✅ Dark mode renders correctly on all sections
7. ✅ `pnpm lint` and `pnpm build` pass

### Completed

2026-07-02 — Sprint 1 delivered. Dynamic route at `/devices/[id]` with 6 tabs and live telemetry overlay.

---

## Sprint 2: Dashboard

> **Demo:** Start the MQTT simulator → dashboard numbers update automatically. A device goes offline → KPI changes immediately. A warning fires → Recent Activity updates instantly. Click a KPI to drill into relevant data.

**Goal:** A support engineer can understand the health of an entire IoT estate in 30 seconds. Upgrade the existing dashboard from KPI widgets to an operations center.

**Scope:** Single page (`/dashboard`). Extends existing `useDashboardData` hook. Adds live charts, estate overview, recent activity feed, and quick-action cards. No backend API changes.

**Dependencies:** `useLiveDeviceStore`, `useDashboardData()`, `useLiveDevices()`, recharts (already installed), live device store events ring buffer.

### Tasks

- [x] **Live KPI cards** — Total devices, Online, Offline, Fault, Warning counts from live store (replace mock fallback)
- [x] **Fleet Health Score** — Computed metric (online % × 0.4 + battery health × 0.3 + signal health × 0.3), displayed as a ring gauge with green/amber/red thresholds
- [ ] *Skipped: Online/Offline Trend sparkline* — ring buffer lacks time-series data for trend over time; can be added with server-side KPI history
- [x] **Battery Distribution chart** — Bar chart: good (>60%), fair (20–60%), low (<20%)
- [x] **Signal Distribution chart** — Bar chart: excellent (<-50 dBm), good (-50 to -70), fair (-70 to -90), poor (>-90)
- [x] **Temperature Distribution chart** — Bar chart: normal (0-35°C), high (35-50°C), critical (>50°C or <0°C)
- [x] **Devices by Estate** — Summary cards per estate with status dot breakdowns and drill-down links
- [x] **Recent Activity feed** — Latest events from live store ring buffer, auto-updating with severity icons
- [x] **Devices Recently Offline** — List of devices whose status is offline with name, site, last-seen, linked to device detail
- [x] **Quick Action cards** — "View Offline", "View Faults", "Open Diagnostics", "Export Report" (placeholder, disabled)
- [x] **Loading state** — Instant data from live store means no loading state needed; mock data fills before live arrives
- [x] **Empty state** — Informational banner card when no live data (simulator not running), with Retry Connection button
- [x] **Responsive layout** — Multi-column grid adapts at lg:grid-cols-2, xl:grid-cols-3, sm:grid-cols-2 for quick actions

### Acceptance Criteria

1. ✅ Dashboard KPIs reflect live store counts, not hardcoded numbers
2. ✅ Fleet health score updates as simulator data changes
3. ✅ Battery/signal/temperature distribution charts render from live store
4. ✅ Recent Activity feed shows latest events without page refresh
5. ✅ Quick action buttons navigate to the correct pages
6. ✅ Informational banner shown when simulator is not running (no live data)
7. ✅ Responsive at all three breakpoints
8. ✅ Dark mode renders correctly on all charts and cards
9. ✅ `pnpm lint` and `pnpm build` pass

### Completed

2026-07-02 — Sprint 2 delivered. Dashboard is an operations center with fleet health score, 3 distribution charts, estate summary, activity feed, offline device list, and quick actions. TypeScript and production build pass cleanly.

---

## Sprint 3: Alerts

> **Demo:** Start the MQTT simulator with `pnpm simulator` → alerts appear in the alerts page as battery_low, signal_weak, device_fault events fire. Click an alert → detail panel slides in. Click Acknowledge → status changes. Click Resolve → alert is resolved. Live events appear instantly via Socket.IO.

**Goal:** Build the Alerts workflow — a support engineer can monitor, triage, and resolve alerts in real time.

**Scope:** Single page (`/alerts`). Adds live alert Zustand store, bridge alert emission, alert detail sheet, filters, and timeline. No backend API changes.

**Dependencies:** `useLiveDeviceStore`, `@sentience/types` (Alert, AlertSeverity, AlertStatus, AlertCategory), Socket.IO client `alert:created`/`alert:updated` events, realtime bridge `mqtt-client.ts`/`normalizer.ts`/`socket-server.ts`.

### Tasks

- [x] **Live Alert Store** — `useLiveAlertStore` Zustand store with ring buffer (max 100 alerts), acknowledge/resolve actions, per-alert history tracking
- [x] **Bridge alert emission** — `normalizer.ts`: add `toAlertEvent()` that converts MQTT event payloads to `AlertEvent`. `index.ts`: emit `alert:created` on battery_low/signal_weak/temperature_high/device_offline/device_fault events, emit `alert:updated` on acknowledge/resolve
- [x] **Socket wiring** — `useSocket.ts`: add handlers for `alert:created` → add to live alert store, `alert:updated` → update alert status in store
- [x] **Alerts page** — Rewrite `/alerts` with live alerts, severity filter buttons (critical/warning/info), status filter buttons (open/acknowledged/resolved), summary count cards, alert list with severity border indicators
- [x] **Alert Detail Sheet** — Slide-in sheet with full alert info (severity badge, status badge, device/site/estate info, description, category, source, timestamps), acknowledge/resolve action buttons, timeline of status changes
- [x] **Alert Timeline** — Component showing chronological status transitions with severity-coded dots, descriptions, and relative timestamps
- [x] **Empty state** — EmptyState component with `BellOff` icon when no alerts exist
- [x] **Loading state** — Instant data from live store; mock fallback when disconnected
- [x] **Responsive layout** — Multi-column grid adapts at all three breakpoints; detail sheet is full-width on mobile

### Acceptance Criteria

1. [x] Alerts appear in real time from simulator events (battery_low, signal_weak, device_fault)
2. [x] Severity filters (critical/warning/info) show/hide alerts correctly
3. [x] Status filters (open/acknowledged/resolved) show/hide alerts correctly
4. [x] Alert detail panel shows full alert info with acknowledge/resolve buttons
5. [x] Acknowledge action changes alert status and is reflected immediately
6. [x] Resolve action changes alert status and is reflected immediately
7. [x] Alert timeline/history shows status transitions
8. [x] Empty state shown when no alerts exist
9. [x] Dark mode renders correctly on all elements
10. [x] Responsive at all three breakpoints
11. [x] `pnpm lint` and `pnpm build` pass

### Completed

2026-07-03 — Sprint 3 delivered. Alerts page with live alert store, real-time alert emission from the MQTT bridge, severity/status filters, alert detail slide-in panel with acknowledge/resolve actions, and timeline history. Demo data fallback when disconnected. TypeScript and production build pass cleanly.

---

## Sprint 4: Event History

> **Demo:** Navigate to `/events` → see live events from the ring buffer. Filter by severity (critical/error/warning/info), category, or device. Type a search term. Select a date range (today/7d/30d/all). Click an event → detail panel slides in with device link. Click "Export CSV" to download filtered results.

**Goal:** A support engineer can search, filter, and explore the event history to understand device behavior and troubleshoot issues.

**Scope:** Single page (`/events`). Extends the existing live-device-store ring buffer. Uses mock data fallback when no live data. No backend API changes.

**Dependencies:** `useLiveDeviceStore` (recentEvents), `@sentience/types` (Event, EventSeverity, EventCategory), existing `LiveEventEntry` type.

### Tasks

- [x] **Event History page** — Rewrite `/events` with live event data from store, mock data fallback
- [x] **Severity filters** — Toggle buttons: All, Critical, Error, Warning, Info
- [x] **Category filters** — Dropdown with all EventCategory options
- [x] **Device filter** — Dropdown dynamically populated from unique device IDs in events
- [x] **Date range** — Button group: All Time, Today, Last 7 Days, Last 30 Days
- [x] **Search** — Text input with debounce, filters event titles, device IDs, event IDs, categories
- [x] **Event Detail Panel** — Slide-in sheet with full event info, device link to `/devices/[id]`
- [x] **CSV Export** — Client-side CSV generation with Blob download, column headers
- [x] **Pagination** — 20 events per page with Previous/Next navigation
- [x] **Empty state** — EmptyState with `FileSearch` icon, clear-filters action
- [x] **Responsive layout** — Filters stack on mobile; detail sheet is full-width on mobile

### Acceptance Criteria

1. [x] Events page shows live events from the ring buffer (or mock fallback)
2. [x] Severity filters correctly show/hide events
3. [x] Category filters correctly show/hide events
4. [x] Device filter shows only events for the selected device
5. [x] Date range filter limits events to the selected period
6. [x] Search text filters events by title, device ID, event ID, category
7. [x] Event detail panel shows full info with working device link
8. [x] CSV export downloads a file with filtered event data
9. [x] Pagination works for large event sets
10. [x] Empty state shown when no events match filters
11. [x] Dark mode renders correctly on all elements
12. [x] Responsive at all three breakpoints
13. [x] `pnpm lint` and `pnpm build` pass

### Completed

2026-07-03 — Sprint 4 delivered. Event history page with live data, severity/category/device/date filters, text search, event detail slide-in panel, CSV export, and pagination. TypeScript and production build pass cleanly.

---

## Sprint 5: Reports

> **Demo:** Navigate to `/reports` → select "Last 30 Days" → filter by estate → view fleet statistics and distribution charts → click "Export CSV" to download → see PDF export placeholder.

**Goal:** A support engineer can generate, filter, and export fleet reports with charts and summary statistics to understand device health trends.

**Scope:** Single page (`/reports`). Uses live device store + mock historical data. Client-side chart rendering with recharts. No backend API changes.

**Dependencies:** `useLiveDeviceStore`, `useLiveAlertStore`, `recharts` (already installed), date utility functions from `@sentience/utils`, shared components (`PageHeader`, `FleetHealthGauge`, `DistributionBar`).

### Tasks

- [x] **Report Dashboard** — Page layout with filter bar at top, summary cards row, and chart grid below
- [x] **Date Range filter** — Button group: Today, Last 7 Days, Last 30 Days, Last 90 Days
- [x] **Estate/Site/Device filters** — Dropdowns populated from live store, cascade to narrow report scope
- [x] **Fleet Summary cards** — Total devices, avg battery, avg signal, open alerts from live store
- [x] **Alert Trends chart** — Stacked area chart showing alert counts over time (severity breakdown)
- [x] **Device Availability chart** — Stacked bar chart showing online/offline/fault over time
- [x] **Battery Health chart** — Distribution chart (Good/Fair/Low) reused from dashboard pattern
- [x] **Signal Quality chart** — Distribution chart (Excellent/Good/Fair/Poor) reused from dashboard pattern
- [x] **Fault Distribution chart** — Donut pie chart with fault categories by count
- [x] **CSV Export** — Client-side CSV generation with Blob download, including all report data
- [x] **PDF Export (placeholder)** — Disabled button with tooltip indicating coming soon
- [x] **Scheduling UI (placeholder)** — Card with Daily/Weekly/Monthly badges showing coming-soon state
- [x] **Recent Exports list** — In-memory list of recently exported reports with re-download button
- [x] **Empty state** — Connection banner when no device data; mock data fallback
- [x] **Responsive layout** — Charts stack on mobile; filters collapse to full-width

### Acceptance Criteria

1. [x] Report page shows fleet summary cards with live device data
2. [x] Date range filter limits the report scope
3. [x] Estate/Site/Device filters narrow report data
4. [x] Alert trends chart renders with severity color coding
5. [x] Device availability chart shows online/offline/fault breakdown
6. [x] Battery and signal distribution charts render correctly
7. [x] Fault distribution chart shows categories by count
8. [x] CSV export downloads filtered report data
9. [x] PDF export shows coming-soon (placeholder)
10. [x] Scheduling shows coming-soon (placeholder)
11. [x] Recent exports shows CSV exports with re-download
12. [x] Dark mode renders correctly on all elements
13. [x] Responsive at all three breakpoints
14. [x] `pnpm lint` and `pnpm build` pass

### Completed

2026-07-03 — Sprint 5 delivered. Report dashboard with filter bar (date range, estate, site, device), fleet summary cards, 5 charts (alert trends, device availability, battery, signal, fault distribution), CSV export, PDF/scheduling placeholders, and recent exports list. TypeScript and production build pass cleanly.

---

## Sprint 6: User Management (RBAC)

> **Demo:** Log in as Customer → see only 5 nav items. Log out → log in as Support → see 10 nav items. Log in as Admin → see all 13 nav items. Navigate to `/users` → manage user accounts. Navigate to `/roles` → edit role permissions.

**Goal:** Implement role-based access control so navigation, pages, and actions are filtered by the authenticated user's role. Enable user and role management pages.

**Scope:** Auth store enhancement, role/permission middleware, navigation filtering, user management page, role management page. Uses mock data — no backend API changes.

**Dependencies:** `useAuthStore`, existing `UserRole`/`UserPermission` types in `@sentience/types`, `DashboardShell` layout, existing nav configuration.

### Tasks

- [x] **Auth store: role enforcement** — `hasRole()` and `hasPermission()` now return real results based on the authenticated user's role (not always-true)
- [x] **Auth store: login with role** — Mock login accepts `admin`/`support`/`installer`/`customer`, sets role + permissions accordingly. `loginAsRole()` enables instant role switching.
- [x] **Navigation filtering** — Sidebar filters nav items by role permissions. Customer sees 5 items, Support sees 10, Admin sees all 13.
- [x] **Route guards** — `AuthGuard` (redirects unauthenticated users), `RequirePermission` (shows AccessDenied for unauthorized roles on `/users`, `/roles`, `/audit-log`, `/settings`)
- [x] **User management page** — `/users` page with user list, summary cards, search/filter by role/status, create dialog, inline role change, activate/deactivate, audit logging
- [x] **Role management page** — `/roles` page with role cards showing assigned resources, expandable permission matrix with toggle switches
- [x] **Audit log page** — `/audit-log` page showing logged actions with user, action type, resource, timestamp, IP; with search, action filter, CSV export, pagination
- [x] **Settings page** — System settings with tabs (General, Security, Notifications, Maintenance), mock toggles and fields, save feedback
- [x] **Profile page** — Live auth store data, personal info edit, password change with validation, notification preferences
- [x] **Loading states** — Loading spinner in AuthGuard, save feedback on forms
- [x] **Empty states** — EmptyState when no users or audit entries match filters
- [x] **Responsive layout** — Tables collapse to stacks on mobile; sidebar nav and role switch modal responsive

### Acceptance Criteria

1. [x] Mock login accepts role parameter (admin/support/installer/customer) via quick-login buttons or email
2. [x] Navigation filters by role — Customer sees 5 items, Support sees 10, Admin sees 13
3. [x] Restricted routes show Access Denied for unauthorized users
4. [x] User management page shows user table with role change capability
5. [x] Role management page shows permission toggles per role
6. [x] Audit log shows timestamped action entries with search and export
7. [x] Settings page shows mock configuration groups with tabs
8. [x] Profile page shows current user info with edit capability
9. [x] Dark mode renders correctly on all elements
10. [x] Responsive at all three breakpoints
11. [x] `pnpm lint` and `pnpm build` pass

### Completed

2026-07-03 — Sprint 6 delivered. Full RBAC with role-based sidebar filtering, route guards, user management (create/edit/activate/deactivate), roles/permission matrix, audit log with CSV export, settings with tabs, profile with live auth data, and demo role switching in the header. TypeScript and production build pass cleanly.

---

## Sprint 7: Admin

> **Demo:** Log in as Admin → open Admin/Settings → toggle maintenance mode, manage feature flags, create/revoke an API key, inspect audit logs, and verify non-admin roles cannot access admin-only pages.

**Goal:** Build the Admin module and system operations workflows — tenant settings, feature flags, maintenance mode, API key management, enhanced audit logs, notification rules, and platform health monitoring.

**Scope:** New admin overview page (`/admin`), enhanced settings page, new admin-only pages (API keys, notification rules, platform health), enhanced audit log. All backend mocked.

**Dependencies:** `useAuthStore`, `useAuditStore`, `RequirePermission`, `@sentience/types` (ApiKey, NotificationRule, PlatformService), existing page patterns.

### Tasks

- [x] **Admin overview page** — Hub page at `/admin` with section cards linking to each admin feature, system-wide status summary
- [x] **Enhanced settings** — Add tenant settings tab (organization name, branding, support info), feature flags tab (toggle-based management), maintenance mode toggle
- [x] **API Key management** — `/admin/api-keys` with create dialog, masked key display, last used time, revoke action, copy-to-clipboard
- [x] **Audit log enhancements** — Severity/action filters, detail slide-in drawer on entry click, improved CSV export with row count
- [x] **Notification rules** — `/admin/notification-rules` with alert threshold config, email/web/push toggles, role-based notification preferences
- [x] **Platform health** — `/admin/health` with realtime bridge status, MQTT broker status, device simulator status, database/API placeholder health cards
- [x] **Admin route protection** — All admin pages wrapped in `RequirePermission` with `admin` resource, non-admin roles see Access Denied
- [x] **Loading, empty, error states** — All data-driven sections handle loading, empty, and error states
- [x] **Responsive layout** — All admin pages responsive at 375px, 768px, 1280px+
- [x] **Dark mode** — All admin pages render correctly in both themes

### Acceptance Criteria

1. [x] Admin overview page shows module cards and system status
2. [x] Settings page enhanced with tenant settings, feature flags, and maintenance mode
3. [x] API keys can be created, viewed (masked), and revoked
4. [x] Audit log has severity/action filters and a detail drawer
5. [x] Notification rules page with thresholds and channel toggles
6. [x] Platform health page shows all service statuses
7. [x] Non-admin roles cannot access admin pages (Access Denied)
8. [x] Dark mode renders correctly on all admin pages
9. [x] Responsive at all three breakpoints
10. [x] `pnpm lint` and `pnpm build` pass

### Completed

2026-07-03 — Sprint 7 delivered. Admin overview page (`/admin`), enhanced settings (tenant settings, feature flags, maintenance mode), API key management with create/revoke/masked display, audit log enhancements (severity filter, detail drawer), notification rules with alert thresholds and channel/role toggles, platform health dashboard with service monitoring. All admin pages protected via `RequirePermission` with `admin` resource. 26 static pages generated. TypeScript and production build pass cleanly.

---

## RC3 Phase 2: UX Audit & Fixes

**Goal:** Improve usability, accessibility, and resilience across all 20 pages. No new features — only hardening.

### Tasks

- [x] Audit all 20 pages for loading, empty, and error states
- [x] Audit all 20 pages for accessibility (ARIA labels, keyboard nav, form labels)
- [x] Audit all 20 pages for responsive layout and dark mode
- [x] Fix discovered issues across 17 files
- [x] Deliver UX Audit Report
- [x] `pnpm lint` and `pnpm build` pass

### Acceptance Criteria

1. [x] All data-driven views handle loading, empty, and error states (100% of API-backed pages)
2. [x] All pages render correctly in dark mode
3. [x] All pages responsive at 375px, 768px, 1280px+
4. [x] 14 accessibility issues fixed (ARIA labels, radio roles, form validation)
5. [x] Mutation feedback on user role changes and profile saves
6. [x] `pnpm lint` and `pnpm build` pass

### Completed

2026-07-03 — RC3 Phase 2 delivered. 17 files changed across UX criteria. UX Audit Report delivered. ~20 remaining icon-only ARIA labels tracked as debt.

---

## RC3 Phase 3: API Audit & RBAC Hardening

**Goal:** Audit every backend API endpoint for correctness, consistency, and security. Fix critical RBAC gaps.

### Tasks

- [x] Audit HTTP status codes — all endpoints
- [x] Audit error response format — all endpoints
- [x] Audit Zod validation coverage — all schemas
- [x] Audit authentication enforcement — all routes
- [x] Audit RBAC enforcement — all routes (4 critical gaps found)
- [x] Audit pagination consistency — all list endpoints
- [x] Audit filtering and sorting — all queries
- [x] Audit search coverage — all endpoints
- [x] Audit response shape consistency — all endpoints
- [x] Audit documentation gaps — backend-api.md
- [x] Fix critical RBAC: settings PATCH → admin-only
- [x] Fix critical RBAC: users PATCH → admin-only
- [x] Fix critical RBAC: devices PATCH → admin/support
- [x] Fix critical RBAC: alerts PATCH → admin/support
- [x] Fix medium RBAC: users GET → admin-only
- [x] Fix medium validation: roleId existence check
- [x] Deliver API Audit Report
- [x] `pnpm lint` and `pnpm build` pass

### Acceptance Criteria

1. [x] All mutation endpoints have appropriate RBAC guards
2. [x] User management endpoints properly restricted to admin
3. [x] Settings changes require admin role
4. [x] Device/alert mutations require admin or support role
5. [x] Customers cannot list all platform users
6. [x] API Audit Report documents all findings and remaining debt
7. [x] `pnpm lint` and `pnpm build` pass

### Completed

2026-07-03 — RC3 Phase 3 delivered. API Audit Report documents 16 findings (4 critical, 3 medium, 9 low). All critical and medium RBAC/validation issues fixed. 6 files changed (settings, users, devices, alerts route files + docs). Remaining API debt tracked in TECHNICAL_DEBT.md.

---

## RC3 Phase 4: Performance Audit

**Goal:** Measure and optimize frontend bundle sizes, API response times, database query performance, and real-time event latency.

### Tasks

- [x] Measure bundle sizes for all pages
- [x] Measure API response times for all endpoints
- [x] Analyze database query patterns and indexing coverage
- [x] Analyze real-time event latency and Socket.IO overhead
- [x] Lazy-load Recharts on Dashboard (reduced from 222 kB to 123 kB)
- [x] Add database indexes for high-frequency query patterns
- [x] Add `staleTime` to TanStack Query hooks to reduce API calls
- [x] Debounce rapid socket event invalidations
- [x] Deliver Performance Audit Report
- [x] `pnpm lint` and `pnpm build` pass

### Acceptance Criteria

1. [x] Shared JS bundle < 150 kB (actual: 102 kB)
2. [x] Dashboard lazy-loads Recharts (actual: 123 kB, was 222 kB)
3. [x] All remaining pages under 140 kB first-load JS
4. [x] Database indexes added for filtered/sorted query patterns
5. [x] TanStack Query staleTime configured for non-critical data
6. [x] Socket event invalidations debounced (100ms window)
7. [x] Performance Audit Report delivered
8. [x] `pnpm lint` and `pnpm build` pass

### Completed

2026-07-03 — RC3 Phase 4 delivered. Bundle sizes optimized (shared 102 kB, dashboard 123 kB). Database indexing improved. Query staleTime configured. Socket invalidation debounced. Performance Audit Report delivered.

---

## RC3 Phase 5: Security Audit

**Goal:** Audit authentication, authorization, password handling, input validation, injection vectors, CORS, WebSocket auth, and secrets management across the full stack.

### Tasks

- [x] Audit authentication flow (login, JWT, token storage, socket auth)
- [x] Audit authorization (RBAC, route guards, permission enforcement)
- [x] Audit password handling (hashing algorithm, strength requirements)
- [x] Audit input validation (Zod schemas, SQL injection, XSS)
- [x] Audit CORS configuration
- [x] Audit WebSocket/Socket.IO auth
- [x] Audit secrets management (.env, JWT secret, API keys)
- [x] Audit security headers and CSRF protection
- [x] Fix critical: bcrypt password hashing (was SHA-256)
- [x] Fix critical: JWT secret no default (was hardcoded fallback)
- [x] Fix critical: Dev .env secrets (gitignored, unique secret)
- [x] Fix high: Real auth endpoint (login calls POST /api/auth/login, receives JWT)
- [x] Fix high: Socket.IO JWT auth (handshake verifies token)
- [x] Fix high: Demo login isolated (loginAsRole remains but gated by NODE_ENV guard)
- [x] Fix high: JWT stored in Zustand, reused by api-client
- [x] Deliver Security Audit Report
- [x] `pnpm lint` and `pnpm build` pass

### Acceptance Criteria

1. [x] Passwords hashed with bcrypt (not SHA-256)
2. [x] JWT_SECRET has no default — server refuses to start without it
3. [x] Frontend login calls backend API (not mock)
4. [x] Socket.IO connection requires valid JWT in handshake
5. [x] Demo login (loginAsRole) documented as DEV ONLY
6. [x] api-client injects Authorization header from Zustand store
7. [x] Dev .env is gitignored
8. [x] 18 security issues triaged (8 fixed, 10 documented)
9. [x] `pnpm lint` and `pnpm build` pass

### Completed

2026-07-03 — RC3 Phase 5 delivered. Real authentication architecture (login → POST /api/auth/login → JWT → Zustand → api-client bearer token). Socket.IO JWT verification. Bcrypt password hashing. JWT secret required. Security Audit Report documents all findings. 8 of 18 issues fixed.

---

## RC3 Phase 6: Documentation & Release Readiness

**Goal:** Verify all documentation matches the implementation, update all plan/roadmap files, generate Production Readiness Report, and perform final verification.

### Tasks

- [x] Verify CLAUDE.md reflects current architecture
- [x] Verify BUILD_PLAN.md includes all phases
- [x] Verify ROADMAP.md reflects completed work and deduplicates
- [x] Verify CHANGELOG.md includes all RC3 phases (no duplication)
- [x] Verify RELEASE_PLAN.md criteria match current state
- [x] Verify DEPLOYMENT.md matches actual architecture
- [x] Update TECHNICAL_DEBT.md — remove outdated entries, reflect current state
- [x] Create root CHANGELOG.md pointer
- [x] Generate PRODUCTION_READINESS.md
- [x] `pnpm lint` and `pnpm build` pass as final verification

### Acceptance Criteria

1. [x] All documentation references match current codebase state
2. [x] No duplicated content across CHANGELOG.md
3. [x] ROADMAP.md deduplicated and complete
4. [x] RELEASE_PLAN.MD reflects real auth, real API, real socket auth
5. [x] TECHNICAL_DEBT.md pruned of resolved items
6. [x] DEPLOYMENT.md reflects the realtime bridge exists
7. [x] Production Readiness Report generated
8. [x] `pnpm lint` and `pnpm build` pass

### Completed

2026-07-03 — RC3 Phase 6 delivered. All documentation aligned with implementation. Production Readiness Report generated. Final build verification passed.

---

## Sprint 9: v1.7.0 — Fleet Management (Device Tags & Groups)

> **Demo:** Open the devices page → see tags in the table. Add a tag to a device on its detail page. Filter devices by tag. Create a device group, add devices to it, view the group's scoped device table. The Groups nav item appears for admin/support roles.

**Goal:** Give operators the ability to organize devices into meaningful collections — tags for ad-hoc labeling, groups for explicit managed collections.

**Scope:** Tags UI (device list + detail inline editor + API filter). Device Groups (DB schema, full CRUD API, list page, detail page with member device table, RBAC). Dialog/AlertDialog UI components added.

**Non-Goals:** Bulk operations, dynamic (filter-based) groups, standalone tags management page, batch diagnostics, notification routing by group, fleet exports.

### Tasks

- [x] Define `DeviceGroup` type in `@sentience/types`
- [x] Create `device_groups` database schema and migration 0008
- [x] Build device-groups CRUD API routes with RBAC (admin/support for mutations)
- [x] Add `?tags=` filter to `GET /api/devices` (comma-separated, OR logic)
- [x] Create frontend API layer (`lib/device-groups.ts`) and TanStack Query hooks (`hooks/use-device-groups.ts`)
- [x] Add `device-groups` resource to RBAC permission matrix
- [x] Add tags column and tag filter chips to device list page
- [x] Add inline tag editor (add/remove) to device detail page Overview tab
- [x] Build Groups list page (`/groups`) with card grid, search, create dialog, delete confirmation
- [x] Build Group detail page (`/groups/[id]`) with metadata, member device table, edit, add/remove devices
- [x] Add `/groups` nav entry to sidebar (admin/support)
- [x] Create shadcn-style Dialog and AlertDialog UI components
- [x] Create `useUpdateDevice()` mutation for tag persistence
- [x] `pnpm lint` — Zero errors
- [x] `pnpm build` — 29/29 pages, shared JS 103 kB
- [x] Update ROADMAP.md, CHANGELOG.md, BUILD_PLAN.md

### Acceptance Criteria

1. [x] Tags visible in device table (max 3 badges + "+N")
2. [x] Tag filter chips on devices page, filterable by OR logic
3. [x] Tag editor on device detail — add/remove persisted via API
4. [x] `GET /api/devices?tags=foo,bar` returns matching devices
5. [x] Device Groups CRUD API with RBAC
6. [x] Groups list page — card grid, search, create, delete
7. [x] Group detail page — scoped device table, edit, add/remove devices
8. [x] `/groups` in sidebar for admin/support roles only
9. [x] All data-driven views handle loading, error, and empty states
10. [x] Dark mode renders correctly on all new/edited pages
11. [x] TypeScript clean, production build clean

### Completed

2026-07-16 — v1.7.0 delivered. Device tags (list display, filter, inline editor) and device groups (full CRUD, list/detail pages, RBAC). Dialog/AlertDialog UI components added. TypeScript zero errors, 29/29 pages, shared JS 103 kB.

---

## Sprint 10: v1.8.0 — Fleet Operations Foundation

> **Demo:** Open a device group → click "Tag All Devices" → confirm in dialog → all group members tagged. Navigate to a device detail page → see its group badges, click to jump to the group. Archive a group → it disappears from the list but can be restored. Run the Playwright E2E suite → Groups and Tags scenarios pass alongside the existing 16 tests.

**Goal:** Complete the operator workflow around Groups and Tags before moving into fleet automation. Prioritize closing functional gaps (bulk operations, device↔group relationship, group polish) and establishing E2E test coverage for all fleet organization features.

**Scope:** 4 work areas — bulk tag operations, device↔group relationship, group management polish, and Playwright E2E testing. No new infrastructure. No fleet automation features (diagnostics, firmware, config push deferred to v1.9.0+).

**Non-Goals:** Batch diagnostics, firmware rollout, restart devices, configuration push, progress tracking, dynamic/filter-based groups, standalone tags management page.

**Dependencies:** Existing Groups and Tags infrastructure (v1.7.0), existing Playwright test suite (16 tests in `e2e/real/`), existing mock E2E test suite (38 tests in `e2e/mocked/`).

### Tasks

#### 1. Bulk Tag Operations
- [x] **Backend: GET /api/device-groups/:id/devices endpoint** — Returns paginated device list for a group (replaces client-side filtering of all devices)
- [x] **Backend: POST /api/device-groups/:id/tags endpoint** — Apply tags to all devices in a group (accepts `{tags: string[], action: "add" | "remove"}`)
- [x] **Backend: Audit logging for bulk tag operations** — Log bulk tag operations with affected device count
- [x] **Frontend: Bulk tag dialog** — "Tag All Devices" / "Remove Tag" action on group detail page with confirmation
- [x] **Frontend: Device count preview** — Show affected device count before confirming bulk operation
- [x] **Frontend: Success/failure feedback** — Toast notification with count of devices updated

#### 2. Device ↔ Group Relationship
- [x] **Backend: GET /api/devices/:id/groups endpoint** — Returns groups a device belongs to
- [x] **Frontend: Group badges on device detail** — Show group badges (max 3 + "+N") on device detail page Overview tab
- [x] **Frontend: Jump-to-group link** — Click group badge → navigate to `/groups/[id]`
- [x] **Frontend: Add/remove group from device page** — Searchable multi-select to manage device group membership
- [x] **Frontend: Group count display** — Show "N groups" on device detail header

#### 3. Group Management Polish
- [x] **Backend: POST /api/device-groups/:id/duplicate endpoint** — Duplicate a group (copy name + devices, append "(Copy)")
- [x] **Backend: POST /api/device-groups/:id/archive and restore** — Archive/restore group (soft-delete pattern with `archivedAt` column)
- [x] **Backend: Pagination support on group list** — `?page=&pageSize=` on `GET /api/device-groups`
- [x] **Frontend: Duplicate group action** — Context menu or action button on group card/detail
- [x] **Frontend: Archive/restore UI** — Archive button on group detail, restore on searchable archived list
- [x] **Frontend: Improved search/filter** — Search by name, filter by status (active/archived)
- [x] **Frontend: Paginated group list** — Page navigation for large fleets
- [x] **Frontend: Member count everywhere** — Display device count on group cards, list rows, detail header

#### 4. E2E Testing (Playwright)
- [x] **Groups CRUD E2E tests** — Create, read, update, delete groups via the UI
- [x] **Tag filter E2E tests** — Filter devices by tags, verify correct filtering across pages
- [x] **Tag editor E2E tests** — Add/remove tags on device detail, verify persistence
- [x] **Device/group relationship E2E tests** — Add device to group from device page, verify group detail reflects membership
- [x] **Bulk tag operation E2E tests** — Apply/remove tags to group devices, verify all members updated
- [x] **Archive/restore E2E tests** — Archive a group, verify it's hidden, restore it, verify it reappears

### Acceptance Criteria

1. [x] Bulk tags can be applied to all devices in a group with one action
2. [x] Bulk tags can be removed from all devices in a group with one action
3. [x] Affected device count is shown before confirming bulk operations
4. [x] Audit logs record bulk tag operations
5. [x] Device detail page shows group badges (max 3 + "+N")
6. [x] Group badge click navigates to group detail page
7. [x] Device membership can be added/removed from the device detail page
8. [x] Group can be duplicated (name + member list)
9. [x] Group can be archived and restored (soft-delete)
10. [x] Group list supports search, filter by status, and pagination
11. [x] Device count shown on all group representations (cards, list rows, detail header)
12. [x] All new E2E tests pass alongside existing 16 tests
13. [x] All data-driven views handle loading, error, and empty states
14. [x] Dark mode renders correctly on all new/edited pages
15. [x] Responsive at 375px, 768px, and 1280px+
16. [x] TypeScript clean, production build clean, E2E suite passes

### Completed

2026-07-16 — v1.8.0 delivered. Sprint 10 complete across all 5 phases (Phase A: scalable server-side queries with pagination/search; Phase B: relationship management with device↔group membership; Phase C: fleet-wide bulk tag operations; Phase D: lifecycle management with archive/restore/duplicate and UX polish; Phase E: 35 Playwright E2E tests for Groups and Tags). All 16 acceptance criteria met. TypeScript zero errors, production build clean.

---

## Sprint 11: v1.9.0 — Firmware Rollout & Execution Framework

> **Demo:** Navigate to `/firmware` → view firmware packages, create a new one with device type compatibility. Navigate to `/rollouts/create` → select firmware, select a device group, review eligibility preview (device count, version delta, compatibility). Start the rollout. View progress at `/rollouts` with status cards and progress percentages. Open rollout detail at `/rollouts/[id]` → see summary ring, per-device status table, cancel/retry controls, audit trail timeline.

**Goal:** Deliver a reliable, auditable firmware rollout system that enables administrators to deploy firmware to device groups with progress tracking, safety controls, and retry support — on a reusable execution framework.

**Scope:** Firmware package registry (CRUD), rollout creation wizard, rollout execution with state machine, progress dashboard with per-device tracking, cancel/retry lifecycle, audit trails, and 50 Playwright E2E tests.

**Dependencies:** Device Groups infrastructure (v1.8.0), existing shared components (PageHeader, EmptyState, StatusBadge, Badge), TanStack Query patterns, shadcn/ui Dialog components, existing RBAC permission matrix.

### Tasks

#### Phase B: Firmware Package Registry
- [x] Define `FirmwarePackage` type in `@sentience/types`
- [x] Create `firmware_packages` database schema and migration (name, version, device_type[], release_notes, file_hash, file_size)
- [x] Build firmware package CRUD API routes: `GET/POST/DELETE /api/firmware` with pagination, search, device type filtering, RBAC (admin manages)
- [x] Create frontend API layer (`lib/firmware.ts`) and TanStack Query hooks (`hooks/use-firmware.ts`)
- [x] Add `firmware` resource to RBAC permission matrix (`manage` for admin, `view` for support)
- [x] Build firmware package list page (`/firmware`) with toggle-switch device-type filter, create/delete dialogs
- [x] Navigate to `/firmware` from sidebar (admin/support)

#### Phase C: Rollout Management System
- [x] Define `Rollout`, `RolloutDevice`, `RolloutStatus`, `ExecutionStatus` types in `@sentience/types`
- [x] Create `rollouts` (generic job/orchestration model) and `rollout_devices` (per-device execution tracking) database schemas with polymorphic `job_type` discriminator
- [x] Build rollout CRUD API routes with Zod validation, eligibility checks, RBAC
- [x] Create frontend API layer (`lib/rollouts.ts`) and TanStack Query hooks (`hooks/use-rollouts.ts`)
- [x] Add `rollouts` resource to RBAC permission matrix
- [x] Implement rollout eligibility endpoint: device type compatibility, firmware version, online status checks
- [x] Implement rollout state machine with explicit transition validation
- [x] Implement cancel rollout (stops pending; leaves completed/failed unchanged)
- [x] Implement retry failed devices (resets failed → pending; leaves succeeded untouched)
- [x] Audit logging for all lifecycle transitions (create, start, cancel, retry, complete)

#### Create Rollout Wizard
- [x] Build 3-step wizard at `/rollouts/create`: select firmware → select target group → confirm eligibility preview
- [x] Eligibility preview: compatible/incompatible device counts with reasons, version delta summary
- [x] Device count display and confirmation before starting rollout

#### Progress Dashboard & Rollout Detail
- [x] Build rollout list page (`/rollouts`) with status cards, progress indicators, timing, target group, firmware version
- [x] Build rollout detail page (`/rollouts/[id]`) with summary stats (progress ring, counts), per-device status table with search/filter
- [x] Cancel/retry controls on rollout detail page with confirmation dialogs
- [x] Progress summary endpoint (`GET /api/rollouts/:id/summary`) for aggregate progress display
- [x] Audit trail timeline on rollout detail page (lifecycle events with timestamps and actor info)
- [x] Loading, empty, and error states on all rollout views

#### E2E Testing (Playwright)
- [x] Firmware package CRUD E2E tests (list, create, delete, search)
- [x] Rollout list page E2E tests (display, pagination, status filters)
- [x] Create rollout wizard E2E tests (step navigation, firmware selection, group selection, eligibility preview, validation)
- [x] Rollout detail page E2E tests (summary stats, per-device table, cancel, retry, audit trail)
- [x] Progress tracking E2E tests (status transitions, progress percentage)
- [x] 50 total new E2E tests for firmware/rollout features

### Acceptance Criteria

1. [x] Firmware packages can be created, listed, searched, and deleted
2. [x] Rollout wizard guides through firmware selection → group selection → eligibility preview
3. [x] Eligibility preview shows compatible/incompatible device counts with reasons
4. [x] Rollout state machine prevents invalid transitions (e.g., retry on completed rollout)
5. [x] Progress dashboard shows real-time rollout status and per-device tracking
6. [x] Cancel stops pending devices; completed/failed devices remain unchanged
7. [x] Retry resets only failed devices; leaves succeeded devices untouched
8. [x] Audit log records every lifecycle transition
9. [x] All data-driven views handle loading, error, and empty states
10. [x] Dark mode renders correctly on all new/edited pages
11. [x] Responsive at 375px, 768px, and 1280px+
12. [x] 50 new E2E tests pass alongside existing 99 tests
13. [x] TypeScript clean, production build clean, E2E suite passes

### Completed

2026-07-17 — v1.9.0 delivered. Sprint 11 complete across 6 work areas: firmware package registry, rollout management system with generic execution model, create rollout wizard, progress dashboard with per-device tracking, cancel/retry lifecycle controls, and 50 Playwright E2E tests. All 13 acceptance criteria met. TypeScript zero errors, 32/32 pages, shared JS 103 kB. Execution framework designed for reuse by Batch Diagnostics (Sprint 12).
