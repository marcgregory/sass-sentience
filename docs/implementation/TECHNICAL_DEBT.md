# Technical Debt

> Items intentionally deferred or known to need cleanup.
> Last updated: 2026-07-02

---

## Table of Contents

- [Data Layer](#data-layer)
- [UI Components](#ui-components)
- [Testing](#testing)
- [Infrastructure](#infrastructure)

---

## Data Layer

### No REST API backend
All data is mock or static. Mock data is embedded in page components rather than extracted into data hooks. This works for demonstration but will need to be migrated to TanStack Query when the backend exists.

**Impact:** Pages will need refactoring to swap mock fetches for query hooks. The mock data duplication pattern (in both `use-live-devices.ts` and `page.tsx` components) will need consolidation.

**Resolution:** After REST API sprint (infrastructure backlog).

---

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
