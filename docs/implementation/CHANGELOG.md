# Changelog

All notable changes to the Sentience IoT Platform.

---

## v0.12.0 — 2026-07-03

### Added

- **RBAC permission system** — `apps/web/src/lib/permissions.ts` defines a full permission matrix (4 roles × 14 resources × 5 actions), role metadata (label, description, color), and utility functions (`hasPermission`, `getActions`, `getAccessibleResources`) consumed by all auth-gated components.
- **Auth store: real RBAC enforcement** — `hasPermission()` and `hasRole()` now return real results based on the authenticated user's role (no longer always-true). `loginAsRole()` enables instant demo role switching. Mock audit logging integrated on login/logout.
- **Demo role switching UI** — Header now includes a role badge and a "Switch Role (Demo)" modal showing all 4 roles (Admin, Support, Installer, Customer) with email, icon, and active indicator. Switch instantly reloads with new navigation.
- **Sidebar navigation filtering** — The sidebar filters its 13 nav items by the user's role permissions. Admin sees all 13, Support sees admin-only pages excluded, Customer sees only 5 items (dashboard, devices, alerts, events, reports).
- **Route guard (`AuthGuard`)** — `AuthGuard` component in the dashboard layout redirects unauthenticated users to `/login` with a loading spinner.
- **Permission guard (`RequirePermission`)** — Wrapper component that checks resource + action permissions and shows an Access Denied page for unauthorized roles. Applied to `/users`, `/roles`, `/audit-log`, and `/settings` pages.
- **Unauthorized page** — `/unauthorized` route with Access Denied message and back-to-dashboard link.
- **User management page** — `/users` rewritten with mock user list (7 users), summary cards (total/active/inactive/role counts), search/filter by role and status, create user dialog, inline role change dropdown, activate/deactivate toggle, and audit logging for all user mutations.
- **Roles & Permissions page** — `/roles` rewritten with 4 role summary cards showing assigned resources, clickable to expand a full permission matrix (resource × action grid) with toggle switches for each permission. Audit logged permission changes.
- **Audit Log page** — `/audit-log` rewritten with live store-backed entries, summary counts, search, action-type filter, CSV export, pagination, and role-colored user avatars. Tracks user created, role changed, user deactivated, login/logout events.
- **Settings page** — `/settings` rewritten with tabbed UI (General, Security, Notifications, Maintenance), mock configuration fields (platform name, timezone, MFA toggle, password policy, notification channels, data retention, broker/database status), and save-with-feedback action.
- **Profile page** — `/profile` rewritten to use live auth store data for name, email, role, and timestamps. Personal information edit, password change with confirmation validation, notification preference toggles, and MFA placeholder.
- **Audit store** — Zustand store with in-memory audit entries, seeded 5 starter entries, `addEntry()` logged on user create/role change/deactivate/login/logout.
- **Login page: quick-role buttons** — Login page now has 4 quick-login cards for each demo role plus the standard email/password form.

### Changed

- Auth store login flow now finds matching demo account by email for role-aware login.
- Header now displays a role badge (colored by role type) next to the user name, with a dropdown menu containing Profile, Switch Role, and Sign Out options.
- Dashboard layout wraps children in `AuthGuard` to prevent unauthenticated access.
- `pnpm lint` and `pnpm build` pass cleanly (22 static pages).

### Known Issues

- Permission toggles on the Roles page are client-side only (not persisted to a real API)

---

## v0.5.0 — 2026-07-02

### Added

- **Monorepo scaffold** — pnpm workspaces, Turborepo, root TypeScript config, build pipeline
- **`@sentience/types`** — All domain type definitions (Device, Site, Estate, User, Alert, Event, Notification, Report, Audit) with zero runtime dependencies
- **`@sentience/utils`** — `cn()` (clsx + tailwind-merge), formatters (date, time, signal strength, temperature, voltage, percentage), constants (status/severity colors, device types)
- **`@sentience/config`** — Shared Tailwind preset with shadcn/ui CSS variables, custom animations, Inter/JetBrains Mono fonts, sentience blue palette
- **`@sentience/hooks`** — `useIsClient()`, `useMediaQuery()` (stub)
- **`@sentience/mock`** — Faker-based device generator (4 estates, 8 sites, deterministic seeding, 85% online bias), MQTT simulator (battery drain, signal fluctuation, temperature drift, graceful shutdown)
- **Design system** — CSS variables (light + dark), Tailwind preset, custom animations, utility classes (`status-*`)
- **UI kit** — Button (CVA variants + sizes), Badge (severity variants), Card family, StatusDot (pulsing), StatusBadge, EmptyState, PageHeader
- **Layout** — DashboardShell (sidebar + header + main), collapsible Sidebar (13 nav items, mobile drawer, 64px rail / 256px expanded), Header (search, theme toggle, notification bell, connection indicator, user avatar), RealtimeListener
- **Providers** — QueryProvider (TanStack Query, 30s staleTime, retry: 1), ThemeProvider (system preference, Zustand-persisted, hydration-safe)
- **Zustand stores** — `auth-store` (mock login, role/permission stubs, persisted), `ui-store` (sidebar, theme, mobile menu, persisted, tested), `notification-store` (addNotification, markAsRead/markAllAsRead), `live-device-store` (ephemeral real-time overlay, ring buffer max 50 events)
- **API client** — `api-client.ts` (get/post/put/patch/del, auth token injection, error normalization), `query-keys.ts` (factory for all entities, tested), pagination types (offset + cursor)
- **Socket.IO client** — Singleton client, 14 typed server-to-client events, auto-reconnect, room subscription functions, typed payload interfaces
- **MQTT Simulator** — Device generator (realistic telemetry), CLI entry point (`--count --broker --telemetry-interval`), Docker Mosquitto broker
- **Realtime Socket.IO bridge** — MQTT client, event normalizer (telemetry/status/events/diagnostics), device registry (in-memory, site/estate filtering), Socket.IO server with room routing (`room:dashboard`, `room:device:{id}`, `room:site:{id}`, `room:estate:{id}`)
- **Realtime bridge tests** — Normalizer (14 tests: missing fields, invalid status, severity mapping), device registry (9 tests: CRUD, filtering, unknown defaults)
- **Socket hook** — `useSocket()` with event-to-query-key invalidation map (9 event types), live-device store updates, dynamic notification store import, tested
- **Live device hook** — `useLiveDevices()` merges static mock rows with live store data, appends simulator-only devices
- **Dashboard data hook** — `useDashboardData()` computes live KPIs or falls back to mock, battery/signal/temperature breakdown
- **21 pages** — All routes with mock data: login, forgot-password, mfa, dashboard (live KPI cards + health gauges + alerts feed), estates (5 cards), sites (5 cards), devices (table with live overlay), alerts (3 summary cards + alert list), events (timeline), reports (4 metrics + generated list), diagnostics (6 cards), users, roles, notifications, audit-log, settings (8 sections), profile
- **Documentation** — ADRs (3: Zustand, TanStack Query, Socket.IO), DEPLOYMENT.md, MQTT simulator guide, Realtime bridge guide, ROADMAP.md, CHANGELOG.md

### Known Issues

- No REST API backend yet — all data is mock or static
- RBAC not enforced — all 13 nav items show for all users, `hasRole()/hasPermission()` always returns true
- Dashboard device table is hand-crafted HTML (not TanStack Table)
- `@sentience/ui` package is empty — reserved for future extraction of shared components
- No E2E test infrastructure
- Selected shadcn/ui components not yet built: Select, Table, Dialog, Dropdown, Tabs, Sheet, Tooltip, Avatar, Skeleton

---

## v0.6.0 — 2026-07-02

### Added

- **Device Detail page** — Dynamic route `/devices/[id]` with live telemetry overlay from store
- **Six detail tabs** — Overview (stat cards, device info, firmware, recent activity), Telemetry (metric bars + stat cards), I/O (inputs/outputs with ON/OFF state), Diagnostics (4 mock tests with run button), Events (severity-tagged timeline), Config (MQTT topic, interval, thresholds)
- **Device table linking** — Row click on `/devices` table navigates to `/devices/[id]`
- **Not-found handling** — Unknown device IDs show EmptyState with back-to-list action
- **Live indicator** — Pulsing green dot + "Live" label when device data comes from realtime store
- **Mock diagnostics** — Per-device diagnostics with pseudo-random pass/fail/warning results
- **Section states** — EmptyState for I/O tabs with no points, Events tab with no events
- **Data source badge** — "Live" or "Static" badge in device info section

### Fixed

- Device detail page stub was an empty directory — now fully implemented
- Pre-existing: packages missing tsconfig.json (`types`, `utils`, `hooks`, `ui`)

### Changed

- 22 total routes (21 static + 1 dynamic `/devices/[id]`)
- Shared JS bundle unchanged at 102 kB

---

## v0.7.0 — 2026-07-02

### Added

- **Operations Center Dashboard** — `/dashboard` upgraded to an operations center with 5 KPI cards, fleet health gauge, and live distribution charts
- **Fleet Health Score** — Composite metric (40% online ratio + 30% battery health + 30% signal quality) displayed as a ring gauge with green/amber/red thresholds
- **Battery Distribution chart** — Horizontal bar chart: Good (>60%), Fair (20–60%), Low (<20%) using recharts
- **Signal Distribution chart** — Horizontal bar chart: Excellent (<-50 dBm), Good (-50 to -70 dBm), Fair (-70 to -90 dBm), Poor (>-90 dBm)
- **Temperature Distribution chart** — Horizontal bar chart: Normal (0–35°C), High (35–50°C), Critical (>50°C or <0°C)
- **Devices by Estate** — Summary cards per estate with status dot breakdowns and drill-down links
- **Recent Activity feed** — Live event stream from the ring buffer with severity icons and relative timestamps
- **Devices Recently Offline** — List of offline devices with name, site, and last-seen links to device detail
- **Quick Action cards** — "View Offline", "View Faults", "Open Diagnostics", "Export Report (coming soon)" with live counts
- **Simulator banner** — Informational card when no live data is present, prompting user to start the simulator
- **Today's Overview** — Side panel with events count, last updated time, connection status, health score
- **Shared components** — `FleetHealthGauge`, `DistributionBar`, `RecentActivity`, `EstateSummaryCards`, `QuickActions`

### Changed

- `useDashboardData` hook now computes fleet health score, battery/signal/temperature distributions, estate summaries, and offline device list from live store data
- Dashboard first-load JS: 222 kB (includes recharts charting library)
- 21 shared components total across the app

### Known Issues

- No REST API backend yet — all data is mock or static
- RBAC not enforced — all 13 nav items show for all users
- Dashboard device table is hand-crafted HTML (not TanStack Table)
- `@sentience/ui` package is empty
- No E2E test infrastructure
- Selected shadcn/ui components not yet built
- Dashboard page JS bundle is 222 kB (recharts contributes ~100 kB)
- Distribution charts show percentage splits, not absolute device counts

---

## v0.10.0 — 2026-07-03

### Added

- **Reports Dashboard** — `/reports` rewritten with full report dashboard: date range filter (today/7d/30d/90d), estate/site/device cascade filters, 4 fleet summary cards (total devices, avg battery, avg signal, open alerts)
- **Fleet Health Gauge** — Composite health score with online/offline/fault/warning breakdown bars
- **Alert Trends chart** — Stacked area chart (critical/warning/info) over time using recharts
- **Device Availability chart** — Stacked bar chart (online/offline/fault) over time using recharts
- **Battery Health chart** — Distribution bar (Good/Fair/Low) reused from dashboard pattern
- **Signal Quality chart** — Distribution bar (Excellent/Good/Fair/Poor) reused from dashboard pattern
- **Fault Distribution chart** — Donut pie chart with 6 fault categories and percentage labels
- **CSV Export** — Client-side CSV generation with full metric, distribution, and alert-trend data
- **PDF Export (placeholder)** — Button disabled with tooltip indicating coming soon
- **Scheduling UI (placeholder)** — Card with Daily/Weekly/Monthly schedule badges showing coming-soon state
- **Recent Exports list** — In-memory export history with re-download button
- **`useReportsData` hook** — `apps/web/src/app/(dashboard)/reports/use-reports-data.ts` with live store integration, time-series generation, filter cascade, and CSV download utility
- **Eye button fix** — Alert detail panel Eye button now opens the detail sheet (was missing onClick handler)

### Changed

- Reports page first-load JS: 3.3 kB → 19.2 kB (231 kB with recharts shared chunk)
- Build plan and roadmap updated: Sprint 5 completed, Sprint 6 in progress

### Known Issues

- No REST API backend yet — all data is mock or static
- RBAC not enforced — all 13 nav items show for all users
- Dashboard device table is hand-crafted HTML (not TanStack Table)
- `@sentience/ui` package is empty
- PDF export and scheduled reports are placeholder-only (not yet implemented)
- Fault distribution data is mock-generated (no historical fault tracking yet)

### Added

- **Event History page** — `/events` rewritten with live events from the ring buffer, severity filters (all/critical/error/warning/info), category filters (device_online, device_offline, device_fault, heartbeat, telemetry, config_change, firmware_update, alert_triggered, diagnostic, system), device filter dropdown populated from live store, date range picker (today/7d/30d/all), and text search across event titles
- **Event Detail Panel** — Slide-in sheet with full event info (severity badge, category badge, device ID with link to device detail page, site/estate, timestamps, description, event ID, metadata)
- **CSV Export** — Client-side CSV export of the currently filtered events, with column headers matching visible fields
- **Pagination** — Virtual page navigation with per-page config (20 events/page), previous/next buttons, showing range of results
- **Empty State** — EmptyState with `FileSearch` icon when no events match filters, with clear-filters action
- **Device links** — Event detail panel links device IDs to `/devices/[id]` detail pages
- **Debug logging** — Dev-mode console.table of all tracked devices with classification breakdown to verify KPI consistency

### Changed

- Event dedup in live-device-store: repeated battery_low/signal_weak events from the same device are now suppressed within a 60-second window
- Bridge alert dedup: `alert:created` is not emitted for the same deviceId+eventType within 60 seconds
- Events page first-load JS: 4.33 kB → 9.1 kB (added filter/search/detail/export UI)

### Known Issues

- No REST API backend yet — all data is mock or static
- RBAC not enforced — all 13 nav items show for all users
- Date range picker is a simple button group (today/7d/30d/all), not a calendar widget
- Event search is client-side only (filters the store ring buffer)
- CSV export does not include headers for all nested fields (metadata excluded)

### Added

- **Live Alert Store** — `useLiveAlertStore` with ring buffer (max 100), acknowledge/resolve actions, severity/status tracking, and history timeline
- **Alert Emission in bridge** — `alert:created` emitted for battery_low, signal_weak, temperature_high, device_offline, device_fault events from the MQTT event stream
- **Alert Resolution in bridge** — `alert:updated` emitted when an alert transitions to acknowledged or resolved
- **Socket wiring** — `useSocket` now handles `alert:created` and `alert:updated` events, pushing to the live alert store for instant UI updates
- **Alerts page** — `/alerts` rewritten with live alerts from the store, severity filters (critical/warning/info), status filters (open/acknowledged/resolved), and EmptyState when no alerts exist
- **Alert Detail Sheet** — Side panel with full alert info (severity badge, status badge, device/site/estate, description, category, source, timestamps), acknowledge/resolve actions, and timeline history
- **Timeline component** — `AlertTimeline` shows status transitions with severity color-coded dots and relative timestamps
- **Simulator alert demo** — Low battery, signal weakness, and fault events appear as alerts instantly in the UI

### Changed

- Alerts page now shows live data from the store (with mock fallback when disconnected)
- Bridge normalizer now generates `AlertEvent` payloads for `alert:created` and `alert:updated` Socket.IO events

### Known Issues

- No REST API backend yet — all data is mock or static
- Dashboard device table is hand-crafted HTML (not TanStack Table)
- `@sentience/ui` package is empty
- Dashboard page JS bundle is 222 kB (recharts contributes ~100 kB)
- Alert store has no persistence — alerts clear on page refresh (by design, ephemeral real-time state)
- Permission toggles on the Roles page are client-side only (not persisted to a real API)

---

## v0.11.0 — 2026-07-03

### Changed

- **Consistency audit — derived metrics unified** — All status counts, distribution calculations, fleet health scoring, and estate summaries now flow through shared selectors in `@sentience/utils/src/selectors.ts`. Pages no longer independently compute these values.

### Added

- **`@sentience/utils` selectors module** — Pure functions: `computeStatusCounts`, `computeBatteryDistribution`, `computeSignalDistribution`, `computeTemperatureDistribution`, `computeFleetHealthScore`, `computeSystemHealth`, `computeFleetSummary`, `computeEstateSummary`, `colorClassToHex`. All operate on `DeviceEntry[]` and produce deterministic, consistent output.
- **`@sentience/types` dependency** — Added `workspace:*` dependency in `@sentience/utils/package.json` so selectors can import `DeviceStatus` type.

### Fixed

- **Duplicated business logic (9 categories)** — The following metrics were independently re-implemented across `use-dashboard-data.ts`, `use-reports-data.ts`, `reports/page.tsx`, and `distribution-bar.tsx`: status counts, battery distribution, signal distribution, temperature distribution, fleet health score, system health percentages, estate summaries, `colorClassToHex()` mapping, and inline `pct()` helpers. All now use shared selectors.
- **Double `colorClassToHex`** — `reports/page.tsx` and `distribution-bar.tsx` each had their own copy. Both now import from the shared utility.
- **Type imports** — `DistributionBar` and `EstateSummaryCards` imported `DistributionItem` and `EstateSummary` types from the dashboard's `use-dashboard-data.ts`. Now import from `@sentience/utils` selectors.

### Known Issues

- No REST API backend yet — all data is mock or static
- Dashboard device table is hand-crafted HTML (not TanStack Table)
- `@sentience/ui` package is empty
- Dashboard page JS bundle is 222 kB (recharts contributes ~100 kB)
- Alert store has no persistence — alerts clear on page refresh (by design, ephemeral real-time state)
- Permission toggles on the Roles page are client-side only (not persisted to a real API)
