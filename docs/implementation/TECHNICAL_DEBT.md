# Technical Debt

> Items intentionally deferred or known to need cleanup.
> Last updated: 2026-07-03 (API audit — added Backend API section)

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

### Audit log filtering, searching, sorting, and pagination is client-side
The audit log page fetches the first 200 API entries as a client-side working set. Search, filter, sort, and pagination all operate in the browser over this set.

**Impact:** As audit log volume grows (tens or hundreds of thousands of records), downloading 200 entries per page won't scale. Users won't be able to search the full history, and pagination will become increasingly inaccurate.

**Resolution:** Move filtering (`?action=`, `?resource=`, `?severity=`, `?from=`, `?to=`, `?search=`), sorting (`?sort=`, `?order=`), and pagination (`?page=`, `?pageSize=`) to the backend before production deployment. The backend route at `apps/api/src/routes/audit-logs.ts` already supports these query parameters — the frontend just needs to pass them through instead of downloading a large working set.

### REST API exists but frontend is not connected
The `apps/api` backend is built with Fastify + PostgreSQL + Drizzle — all CRUD endpoints exist, seed data matches the mock data, and JWT auth is functional. However, the frontend still uses hardcoded mock data and Zustand stores rather than querying the API.

**Impact:** Pages show mock data and will need refactoring to swap mock fetches for TanStack Query hooks. The `api-client.ts` module in `apps/web/src/lib/` already points to `http://localhost:3001/api` and is ready to be used.

**Resolution:** Frontend API integration sprint — connect pages page by page, replacing mock stores with useQuery/useMutation hooks.

### Backend API: SHA-256 password hashing (dev only)
Passwords are hashed using SHA-256 for development simplicity. This is not suitable for production — bcrypt or argon2id should replace it.

**Impact:** Credential compromise would expose plaintext-equivalent hashes.

**Resolution:** Replace with bcrypt (`bcrypt`) or argon2 (`@node-rs/argon2`) before production deployment.

### Backend API: No rate limiting or logging middleware
The Fastify server has no rate limiting (`@fastify/rate-limit`) or structured request logging beyond the built-in logger.

**Impact:** API is vulnerable to abuse in production; debugging is harder without request tracing.

**Resolution:** Add rate limiting and structured logging middleware before production deployment.

### Auth is mock/demo-backed
Authentication and authorization use mock data — `useAuthStore` has hardcoded demo accounts (user-1 through user-4), `loginAsRole()` bypasses real auth, and token validation doesn't exist. To the user this looks like a real auth flow, but there is no backend verifying credentials, sessions, or permission boundaries.

**Impact:** Auth state is purely client-side. Anyone with access to localStorage can escalate privileges. The permission matrix, route guards, and RBAC UI are accurate and well-structured for when real auth arrives, but they operate on trust.

**Resolution:** Requires backend authentication service, JWT verification, and session management. Tracked in infrastructure backlog.

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

### Backend API: No customer-level data isolation
The `GET /api/devices` and `GET /api/events` endpoints return data for all customers. There is no scoping by the authenticated user's customer association — a customer role user can see devices and events from all estates.

**Impact:** Customers could access data belonging to other organizations.

**Resolution:** Add middleware to scope list/detail queries by `customerId` from the authenticated user's JWT payload. This requires the user's `customerId` to be included in the JWT (currently only `sub`, `email`, `role`, `name` are signed).

### Backend API: No transactions on multi-query operations
Several endpoints execute sequential queries without isolation: `GET /api/devices/:id` (device → site → estate), `POST /api/reports` (insert → update), and the seed script.

**Impact:** Under concurrent requests, partial writes or inconsistent reads are possible.

**Resolution:** Wrap multi-query operations in `db.transaction()`.

### Backend API: CORS origin: true allows any origin
The CORS configuration in `apps/api/src/index.ts` uses `origin: true`, which reflects the requesting origin.

**Impact:** Any website can make API requests from a browser (no same-origin restriction).

**Resolution:** Restrict to known origins before production deployment.

### Backend API: No OpenAPI/Swagger spec
The API has no auto-generated OpenAPI specification. Documentation is maintained manually in `docs/backend-api.md` and is missing several endpoints and response shapes.

**Impact:** API consumers and tooling cannot discover or validate endpoints programmatically.

**Resolution:** Integrate `@fastify/swagger` and `@fastify/swagger-ui` to auto-generate OpenAPI specs from route schemas.

### Backend API: No WebSocket event emission from REST mutations
When alerts are acknowledged or resolved via `PATCH /api/alerts/:id`, no Socket.IO event is emitted to notify connected clients. The realtime bridge does not listen for database changes.

**Impact:** Users on the Alerts page only see live updates from MQTT simulator events, not from REST API mutations made by other users.

**Resolution:** Either emit socket events from the API route handler after successful mutations, or set up a database publication/notification mechanism (e.g., PostgreSQL LISTEN/NOTIFY) that the realtime bridge can subscribe to.

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
