# Build Plan

> **Engineering execution.** Details each sprint's goal, scope, tasks, and definition of done.
> Product backlog (what/why) lives in `ROADMAP.md`.
> Last updated: 2026-07-03

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
| 6 | **User Management (In Progress)** | Log in as Customer vs Support vs Admin — different permissions |
| 7 | **Admin** | View audit logs and change system settings |

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
