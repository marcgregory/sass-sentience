# Technical Debt

> Items intentionally deferred or known to need cleanup.
> Last updated: 2026-07-16 (v1.6.0 — validated and released)

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

### Diagnostics were previously mock data (resolved v1.5.2)
The diagnostics page was rewritten in v1.5.2 with a test-entity-driven backend API. See `docs/implementation/ROADMAP.md` for the v1.5.2 milestone.

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

### Report scheduling UI is a placeholder
The "Schedule Report" card shows Daily/Weekly/Monthly badges but no actual scheduling logic. The PDF export button is functional (generates real PDF via html2canvas + jsPDF).

**Impact:** Users can see the intended feature set but cannot schedule automated report generation.

**Resolution:** Requires a backend job scheduler. Deferred — tracked as future feature.

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

### ✅ Resolved — Full-Stack E2E test suite validated (v1.6.0)
The real-infrastructure E2E test suite (16 tests in `e2e/real/`) has been executed against the full Docker Compose stack. All 6 validation gates passed, including failure-mode scenarios. See `docs/release/VALIDATION_v1.6.0.md` for full results.

**Impact:** ✅ Resolved. Validation framework is now proven with repeatable artifact chain (Source → Containers → Infrastructure → Tests → Approval).

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

The Functional Readiness Audit (`docs/release/FUNCTIONAL_READINESS_AUDIT.md`) identified the following user-facing gaps. These were resolved across milestones v1.5.2–v1.5.4.

### ✅ Resolved in v1.5.2 — Device Diagnostics

- **Diagnostics page was entirely placeholder** (6 decorative tools with non-functional Run buttons). Now uses a test-entity-driven backend API with real Ping, Connection, MQTT, Signal, Battery, and Firmware tests.

### ✅ Resolved in v1.5.3 — Account Management

- **Forgot Password** now dispatches email via `POST /api/auth/forgot-password` with secure token generation.
- **MFA** now verifies codes via `POST /api/auth/mfa/verify` and `otplib`.
- **Profile changes** persist via `PUT /api/auth/me` and `POST /api/auth/change-password`.

### ✅ Resolved in v1.5.4 — Platform Administration

- **Dashboard**: `GET /api/dashboard/summary` returns real fleet KPIs.
- **Platform Health**: `GET /api/admin/health` performs 5 real service checks.
- **Settings**: Tenant fields and notification channel toggles persist to API settings keys.
- **Admin overview**: `GET /api/admin/stats` returns real DB counts.
- **Profile notification prefs**: Interactive toggles persist via `PUT /api/auth/me`.
