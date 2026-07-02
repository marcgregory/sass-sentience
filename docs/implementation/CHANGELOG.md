# Changelog

All notable changes to the Sentience IoT Platform.

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

### Known Issues

- No REST API backend yet — all data is mock or static
- RBAC not enforced — all 13 nav items show for all users
- Dashboard device table is hand-crafted HTML (not TanStack Table)
- `@sentience/ui` package is empty
- No E2E test infrastructure
- Selected shadcn/ui components not yet built
