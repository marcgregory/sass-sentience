# Build Plan

> **Engineering execution.** Details each sprint's goal, scope, tasks, and definition of done.
> Product backlog (what/why) lives in `ROADMAP.md`.
> Last updated: 2026-07-02

---

## Sprint Rule

**Only one sprint may be active at a time.**

A sprint is complete only when **all** of the following are true:

- [ ] All sprint tasks are implemented.
- [ ] All Definition of Done items are met.
- [ ] The sprint demo works end-to-end.
- [ ] `ROADMAP.md` is updated (move completed items, advance queue).
- [ ] `CHANGELOG.md` is updated with sprint entry.
- [ ] TypeScript compiles clean (`pnpm lint`).
- [ ] Production build succeeds (`pnpm build`).

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

- [ ] **Live KPI cards** — Total devices, Online, Offline, Fault, Warning counts from live store (replace mock fallback)
- [ ] **Fleet Health Score** — Computed metric (online % × weight + battery health × weight + signal health × weight), displayed as a gauge or large numeral
- [ ] **Online/Offline Trend** — Sparkline or mini area chart showing device status counts over recent event window
- [ ] **Battery Distribution chart** — Bar chart: good (>60%), fair (20–60%), low (<20%) count
- [ ] **Signal Distribution chart** — Bar chart: excellent (<-50 dBm), good (-50 to -70), fair (-70 to -90), poor (<-90)
- [ ] **Temperature Distribution chart** — Bar chart: normal, high, critical ranges
- [ ] **Devices by Estate** — Summary cards or mini bar chart per estate
- [ ] **Recent Activity feed** — Latest events + alerts from live store ring buffer, auto-updating
- [ ] **Devices Recently Offline** — List of devices whose status changed to offline in the recent window
- [ ] **Quick Action cards** — "View Faults", "View Offline Devices", "Open Diagnostics" linking to relevant pages
- [ ] Loading state — Skeleton/shimmer while initial data resolves
- [ ] Empty state — Informational banner when no live data (simulator not running)
- [ ] Responsive layout — 3/4-column grid on desktop, 2 on tablet, 1 on mobile

### Acceptance Criteria

1. Dashboard KPIs reflect live store counts, not hardcoded numbers
2. Fleet health score updates as simulator data changes
3. Battery/signal/temperature distribution charts render from live store
4. Recent Activity feed shows latest events without page refresh
5. Quick action buttons navigate to the correct pages
6. Informational banner shown when simulator is not running (no live data)
7. Responsive at all three breakpoints
8. Dark mode renders correctly on all charts and cards
9. `pnpm lint` and `pnpm build` pass
