# Technical Debt

> Items intentionally deferred or known to need cleanup.
> Last updated: 2026-07-03 (consistency audit — removed Resolved items)

---

## Table of Contents

- [Data Layer](#data-layer)
- [UI Components](#ui-components)
- [Dashboard Charts](#dashboard-charts)
- [Reports](#reports)
- [Testing](#testing)
- [Infrastructure](#infrastructure)

---

## Data Layer

### No REST API backend
All data is mock or static. Mock data is embedded in page components rather than extracted into data hooks. This works for demonstration but will need to be migrated to TanStack Query when the backend exists.

**Impact:** Pages will need refactoring to swap mock fetches for query hooks. The mock data duplication pattern (in both `use-live-devices.ts` and `page.tsx` components) will need consolidation.

**Resolution:** After REST API sprint (infrastructure backlog).

### Diagnostics are simulated
The Diagnostics tab on `/devices/[id]` returns pseudo-random pass/fail/warning results based on device ID and current hour. This is a placeholder for real backend diagnostics (MQTT connectivity, device ping, firmware status, I/O tests).

**Impact:** Users see diagnostic results but they don't represent real device health.

**Resolution:** Backend support needed. Tracked in Sprint 7+ backlog.

---

### Device detail mock data is page-embedded
`MOCK_FIRMWARE`, `MOCK_CONFIG`, `MOCK_IO`, and `getMockDiagnostics()`/`getMockEvents()` are defined directly in `apps/web/src/app/(dashboard)/devices/[id]/page.tsx`. This was expedient for Sprint 1 but should be extracted to a proper data hook or mock data file.

**Impact:** Harder to reuse mock data across pages. Page file is large (600+ lines).

**Resolution:** Extract to `apps/web/src/hooks/use-device-detail-data.ts` during backend integration.

---

## UI Components

### Missing shadcn/ui components
Select, Table, Dialog, Dropdown, Tabs, Sheet, Tooltip, Avatar, Skeleton, Switch, Separator, Progress are not yet built.

**Impact:** Device table is hand-crafted HTML. Tab navigation on device detail is custom. Skeleton loading states aren't available.

**Resolution:** Build as needed by each sprint. Sprint 2 needs Skeleton for loading states.

---

### Dashboard device table is hand-crafted HTML
The device table on `/devices` is a plain `<table>` with inline styling rather than using a reusable table component. Filter/search buttons are present but not wired.

**Impact:** No sort, no column resize, no row selection. Inconsistent with future table patterns.

**Resolution:** When `@tanstack/react-table` is introduced (deferred).

---

## Dashboard Charts

### Dashboard JS bundle is 222 kB (recharts adds ~100 kB)
The dashboard page imports recharts for distribution bar charts. This nearly doubles the page's first-load JS compared to other pages (~112 kB).

**Impact:** Dashboard page load is heavier than other pages. Each chart is a separate recharts component import.

**Resolution:** Consider lighter alternatives (pure CSS bar charts, SVG-in-JS) if bundle size becomes an issue.

---

### Distribution charts show percentages, not absolute counts
Battery, signal, and temperature distribution charts display the percentage of devices in each category rather than raw device counts.

**Impact:** Users see relative proportions but can't quickly determine absolute numbers per bucket.

**Resolution:** ✅ **Resolved in quality pass (2026-07-03)** — `DistributionItem` now includes a `count` field, and chart tooltips show both percentage and absolute device counts (e.g. "68% (1,937 devices)").

---

### Alert store has no persistence
Alerts clear on page refresh — the live alert store is ephemeral by design (real-time overlay). There is no server-side alert persistence to restore alerts on reconnect.

**Impact:** Users lose alert state on navigation away. Only current session alerts survive.

**Resolution:** When REST API backend is built, persist alerts server-side and hydrate the store on reconnect.

---

### No Online/Offline Trend sparkline
The Sprint 2 spec included a sparkline showing device status counts over time, but the live device store's ring buffer lacks the time-series data needed to compute trends.

**Impact:** Users can't see whether fleet health is improving or degrading over time.

**Resolution:** Add server-side KPI history endpoint and a time-series query when the REST API backend is built.

---

## Reports

### PDF export and scheduled reports are placeholders
The "Export PDF" button is disabled with a tooltip. The "Schedule Report" card shows Daily/Weekly/Monthly badges but no actual scheduling logic. Both were delivered as UI-only placeholders.

**Impact:** Users can see the intended feature set but cannot use PDF exports or report scheduling.

**Resolution:** PDF could use a client-side library (html2canvas + jsPDF). Scheduling requires a backend (cron-like job scheduler). Both deferred.

---

### Fault distribution data is mock-generated
The fault distribution pie chart uses static mock data (connection lost, battery failure, signal degradation, etc.) rather than live fault analysis. There is no actual historical fault tracking.

**Impact:** The chart is decorative — it doesn't reflect real device fault patterns.

**Resolution:** Requires server-side fault aggregation. Deferred to backend integration.

---

## Testing

### No E2E test infrastructure
Playwright/Cypress not set up. No browser-level tests.

**Impact:** Regressions may go undetected, especially on responsive layout and realtime interactions.

**Resolution:** Deferred to infrastructure backlog.

---

### Device detail page has no unit tests
The `/devices/[id]` page has no Vitest tests. Mock data generators and computed diagnostics logic lack test coverage.

**Impact:** Refactoring mock data is riskier without tests.

**Resolution:** Add tests when extracting mock data to hooks (see Data Layer debt).

---

## Infrastructure

### `@sentience/ui` package is empty
Reserved for shared UI components but currently unused. All UI components live in `apps/web/src/components/ui/`.

**Impact:** Package exists but serves no purpose. CI runs lint on it.

**Resolution:** Either populate it or remove it.

---

### Socket.IO client singleton has no reconnection tests
The `socket-client.ts` module handles reconnection via Socket.IO's built-in backoff, but the behavior is untested.

**Impact:** Reconnection edge cases (token expiry, server restart, network flap) are unverified.

**Resolution:** Add integration tests when backend is available.
