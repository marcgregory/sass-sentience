# Technical Debt

> Items intentionally deferred or known to need cleanup.
> Last updated: 2026-07-06 (v1.5.1 — added functional gaps from readiness audit, updated outdated mock-data entries)

---

## Table of Contents

- [Data Layer](#data-layer)
- [UI Components](#ui-components)
- [Dashboard Charts](#dashboard-charts)
- [Reports](#reports)
- [Security](#security)
- [Testing](#testing)
- [Infrastructure](#infrastructure)
- [Functional Gaps (Audit Findings)](#functional-gaps-audit-findings)

---

## Data Layer

### Audit log filtering, searching, sorting, and pagination is client-side
The audit log page fetches the first 200 API entries as a client-side working set. Search, filter, sort, and pagination all operate in the browser over this set.

**Impact:** As audit log volume grows (tens or hundreds of thousands of records), downloading 200 entries per page won't scale. Users won't be able to search the full history, and pagination will become increasingly inaccurate.

**Resolution:** Move filtering (`?action=`, `?resource=`, `?severity=`, `?from=`, `?to=`, `?search=`), sorting (`?sort=`, `?order=`), and pagination (`?page=`, `?pageSize=`) to the backend before production deployment. The backend route at `apps/api/src/routes/audit-logs.ts` already supports these query parameters — the frontend just needs to pass them through instead of downloading a large working set.

### Diagnostics are simulated
The Diagnostics tab on `/devices/[id]` returns pseudo-random pass/fail/warning results based on device ID and current hour. This is a placeholder for real backend diagnostics (MQTT connectivity, device ping, firmware status, I/O tests).

**Impact:** Users see diagnostic results but they don't represent real device health.

**Resolution:** Backend support needed.

### Device detail I/O, diagnostics, and config mock data removed
The device detail page (`/devices/[id]`) now loads firmware, I/O, diagnostics, and config from the API. The old `MOCK_FIRMWARE`, `MOCK_CONFIG`, `MOCK_IO`, `getMockDiagnostics()`/`getMockEvents()` have been removed — page uses real `apiDevice` fields.

**Resolution:** Resolved in RC2 frontend integration.

### 3 pages still use mock data (Estates, Sites, Diagnostics)
Estates (`/estates`), Sites (`/sites`), and Diagnostics (`/diagnostics`) use hardcoded data arrays. No backend API endpoints exist for these domains yet. See `docs/release/FUNCTIONAL_READINESS_AUDIT.md`.

**Impact:** These pages do not reflect real system state. No CRUD operations possible on estates or sites.

**Resolution:** Planned as v1.5.1 (Estates + Sites) and v1.5.2 (Diagnostics).

---

## UI Components

### Missing shadcn/ui components
Select, Table, Dialog, Dropdown, Tabs, Sheet, Tooltip, Avatar, Skeleton, Switch, Separator, Progress are not yet built.

**Impact:** Device table is hand-crafted HTML. Tab navigation on device detail is custom.

**Resolution:** Build as needed by each sprint.

### Dashboard device table is hand-crafted HTML
The device table on `/devices` is a plain `<table>` with inline styling rather than using a reusable table component. Filter/search buttons are present but not wired.

**Impact:** No sort, no column resize, no row selection.

**Resolution:** When `@tanstack/react-table` is introduced (deferred).

### ~10 icon-only buttons missing aria-label
Several interactive icon buttons throughout the app lack `aria-label` attributes, making them inaccessible to screen reader users.
❌ **Partially resolved (v1.1.1):** 9 buttons fixed across 4 pages. ~10 remain.

**Resolution:** Audit and add `aria-label` to all icon-only buttons. Low-priority per-page fix.

---

## Dashboard Charts

### Dashboard JS bundle is 222 kB (recharts adds ~100 kB)
The dashboard page imports recharts for distribution bar charts. ❌ **Resolved:** JS reduced to 123 kB by lazy-loading Recharts.

### Distribution charts show percentages, not absolute counts
❌ **Resolved (2026-07-03)** — `DistributionItem` now includes a `count` field, and chart tooltips show both.

### Alert store has no persistence
Alerts clear on page refresh — the live alert store is ephemeral by design (real-time overlay). There is no server-side alert persistence to restore alerts on reconnect.

**Impact:** Users lose alert state on navigation away. Only current session alerts survive.

**Resolution:** When full alert persistence is needed, persist alerts server-side and hydrate the store on reconnect.

### No Online/Offline Trend sparkline
The Sprint 2 spec included a sparkline showing device status counts over time, but the live device store's ring buffer lacks the time-series data needed to compute trends.

**Impact:** Users can't see whether fleet health is improving or degrading over time.

**Resolution:** Add server-side KPI history endpoint and a time-series query.

---

## Reports

### PDF export is resolved, scheduled reports are placeholder
The "Export PDF" button now generates a real PDF via html2canvas + jsPDF (dynamic imports). The "Schedule Report" card still shows Daily/Weekly/Monthly badges but no actual scheduling logic.

**Impact:** Users can see the intended feature set but cannot use PDF exports or report scheduling.

**Resolution:** PDF could use a client-side library (html2canvas + jsPDF). Scheduling requires a backend (cron-like job scheduler). Both deferred.

### Fault distribution data is mock-generated
The fault distribution pie chart uses static mock data rather than live fault analysis.

**Impact:** The chart is decorative — it doesn't reflect real device fault patterns.

**Resolution:** Requires server-side fault aggregation. Deferred.

---

## Security

### Customer-level data isolation not implemented
The `GET /api/devices` and `GET /api/events` endpoints return data for all customers. There is no scoping by the authenticated user's customer association.

**Severity:** Medium

**Impact:** Customers could access data belonging to other organizations.

**Resolution:** Add middleware to scope list/detail queries by `customerId` from the authenticated user's JWT payload. This requires the user's `customerId` to be included in the JWT.

### No transactions on multi-query operations
Several endpoints execute sequential queries without isolation: `GET /api/devices/:id` (device → site → estate), `POST /api/reports` (insert → update), and the seed script.

**Severity:** Low

**Impact:** Under concurrent requests, partial writes or inconsistent reads are possible.

**Resolution:** Wrap multi-query operations in `db.transaction()`.

### No OpenAPI/Swagger spec
The API has no auto-generated OpenAPI specification. Documentation is maintained manually in `docs/backend-api.md`.

**Severity:** Low

**Impact:** API consumers and tooling cannot discover or validate endpoints programmatically.

**Resolution:** Integrate `@fastify/swagger` and `@fastify/swagger-ui` to auto-generate OpenAPI specs from route schemas.

### No WebSocket event emission from REST mutations
When alerts are acknowledged or resolved via `PATCH /api/alerts/:id`, no Socket.IO event is emitted to notify connected clients.

**Severity:** Low

**Impact:** Users on the Alerts page only see live updates from MQTT simulator events, not from REST API mutations made by other users.

**Resolution:** Either emit socket events from the API route handler after successful mutations, or set up a database publication/notification mechanism (e.g., PostgreSQL LISTEN/NOTIFY).

### Demo loginAsRole bypasses backend auth
`loginAsRole()` in `auth-store.ts` creates a synthetic JWT and sets user state directly without calling the backend.

**Severity:** Low (DEV ONLY)

**Impact:** In a dev build served on a network-accessible URL, anyone who discovers the feature can authenticate as any role.

**Resolution:** Now gated behind `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` (defaults to `false` in production). The login page role cards, header role-switch button, and the `loginAsRole()` method itself all check this flag. ✅ Resolved in RC3 follow-up.

---

## Testing

### No Full-Stack end-to-end test suite
Playwright UI Regression Suite (API Mocked) covers frontend behavior with 38 tests. Full-stack validation against real infrastructure (backend, PostgreSQL, MQTT, Socket.IO) is not yet implemented.

**Impact:** Backend regressions (API contract changes, database issues, real-time pipeline failures) are not caught by the current suite.

**Resolution:** Scheduled for v1.6.0 — see `docs/implementation/TESTING_STRATEGY.md` and `docs/implementation/ROADMAP.md`.

### Device detail page has no unit tests
The `/devices/[id]` page has no Vitest tests. Mock data generators and computed diagnostics logic lack test coverage.

**Impact:** Refactoring mock data is riskier without tests.

**Resolution:** Add tests when extracting mock data to hooks.

### Socket.IO client singleton has no reconnection tests
The `socket-client.ts` module handles reconnection via Socket.IO's built-in backoff, but the behavior is untested.

**Impact:** Reconnection edge cases (token expiry, server restart, network flap) are unverified.

**Resolution:** Add integration tests when backend is available.

---

## Infrastructure

### `@sentience/ui` package is empty
Reserved for shared UI components but currently unused. All UI components live in `apps/web/src/components/ui/`.

**Impact:** Package exists but serves no purpose. CI runs lint on it.

**Resolution:** Either populate it or remove it.

---

## Functional Gaps (Audit Findings)

The Functional Readiness Audit (`docs/release/FUNCTIONAL_READINESS_AUDIT.md`) identified the following user-facing gaps. These are tracked as roadmap milestones v1.5.1–v1.5.4.

### Estates and Sites use hardcoded data
`/estates` and `/sites` pages define data as hardcoded arrays. No backend API endpoints exist. Add Estate/Site buttons have no onClick handlers.

**Impact:** Users cannot create, view, or manage estates or sites. All data is static.

**Resolution:** v1.5.1 — Create `GET/POST/PATCH/DELETE /api/estates` and `/api/sites` endpoints. Wire frontend pages with `useEstates()`/`useSites()` hooks.

### Diagnostics page is entirely placeholders
All 6 diagnostic tools (Ping, Connection, MQTT, Signal, Battery, Firmware) are decorative cards. Run buttons do nothing. Recent diagnostics list is hardcoded. No loading/error states.

**Impact:** Users see diagnostic tools that don't function. The page is misleading.

**Resolution:** v1.5.2 — Create backend diagnostics endpoints. Wire Run buttons to real API mutations. Store and display results.

### Forgot Password sends no email
The form submits, sets `sent = true`, and shows "Check your email" — but no email is dispatched. No backend endpoint exists.

**Impact:** Users with forgotten passwords cannot reset them.

**Resolution:** v1.5.3 — Implement `POST /api/auth/forgot-password` with token generation + email dispatch.

### MFA page accepts any 6-digit code
The 6-digit code input collects digits but the form immediately redirects to `/dashboard` on submit. No verification occurs.

**Impact:** MFA provides no security — any 6 digits grants access.

**Resolution:** v1.5.3 — Wire to `POST /api/auth/mfa/verify` with code validation.

### Profile changes are not persisted
Name/email updates only modify the Zustand store. Password change clears fields and logs an audit entry but never calls the API.

**Impact:** Profile edits are lost on page refresh.

**Resolution:** v1.5.3 — Create `PUT /api/users/me` and `POST /api/auth/change-password` endpoints.

### Dashboard falls back to mock data without simulator
With simulator OFF, `useDashboardData()` returns `MOCK_KPIS`, `MOCK_HEALTH`, `MOCK_BATTERY`, etc. There is no API endpoint for production dashboard data.

**Impact:** In production, the dashboard shows fictional numbers unless the simulator is running.

**Resolution:** v1.5.4 — Create `GET /api/dashboard/summary` endpoint.

### Platform Health: 4 of 5 services are hardcoded
Bridge, MQTT, Database, and Simulator service cards use hardcoded "healthy" status with placeholder metrics ("—"). Only the API service polls a real health endpoint.

**Impact:** The health page looks green but doesn't reflect actual service status.

**Resolution:** v1.5.4 — Add health endpoints for bridge, MQTT, simulator, and database.

### Settings: Tenant and Notifications tabs are UI-only
Tenant fields (org name, brand color, support phone, address) and Notification channel toggles are local state only — "Save Changes" does not persist them. No API keys exist for these settings.

**Impact:** Users can edit fields but changes are lost on refresh.

**Resolution:** v1.5.4 — Add API setting keys for tenant and notification channel data.

### Admin overview stats are hardcoded
Active Users (4), System Uptime (14d 6h), Pending Alerts (3), and Platform Version (v0.13.0) are hardcoded strings.

**Impact:** Stats become stale and misleading over time.

**Resolution:** v1.5.4 — Fetch counts from API endpoints.
