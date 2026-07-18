# Technical Debt

> Items intentionally deferred or known to need cleanup.
> Last updated: 2026-07-17 (v1.9.0 — Firmware Rollout delivered)

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

### Device group membership uses a uuid[] array column
The `device_groups` table stores member device UUIDs in a `device_ids` array column rather than a normalized join table. This works for current fleet sizes (tens of devices per group) but has three limitations: (1) queries for "which groups does device X belong to?" require `@>` containment operators on every group row, (2) atomic add/remove requires reading and rewriting the full array, and (3) PATCH race conditions are possible when two clients modify device membership concurrently.

**Impact:** As groups grow to hundreds of devices, array-based membership becomes harder to query efficiently and more susceptible to concurrent update collisions.

**Resolution:** Normalize to a many-to-many join table (`device_group_memberships`) with device_id + group_id + joined_at. Add a GIN index on device_ids if array approach is retained for read-heavy workloads.

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

### E2E Release Gate: E2E coverage required per release
Every new user-facing feature must have at least one end-to-end Playwright scenario before the release is considered complete. This gate was established for v1.8.0 and is now enforced as part of the Definition of Done. v1.8.0 fulfilled this requirement with 35 Playwright tests covering Groups CRUD, tag filter, tag editor, device/group relationship, bulk tag operations, and archive/restore workflows. See `docs/implementation/BUILD_PLAN.md` (Definition of Done).

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

---

## Engineering Review — v1.9.0 Findings (2026-07-18)

Findings from the Deep Engineering Review (9 areas, evidence-driven). None are release blockers. All are scheduled as backlog improvements.

### Critical / High

None found. The review identified no correctness, security, or data-integrity issues that would block v1.9.0.

### Medium Priority

#### 1. Missing `pool.on('error')` handler — DB restart crashes the API server
The `pg.Pool` in `apps/api/src/db/index.ts` has no `pool.on('error')` handler. If the database experiences a transient outage or restarts, an idle client error will crash the Node process.

**Severity:** Medium — operational hardening
**Fix:** Add `pool.on('error', (err) => logger.error({ err }, 'pg pool error'))` — prevents process termination on idle-client failures.
**Effort:** ~15 minutes

#### 2. Multi-write endpoints lack transactions — audit logs can be lost on partial failure
Every mutation route follows the pattern: main write → `logAuditEvent()`. These are two separate queries with no wrapping transaction. If the main write succeeds and the audit insert fails, the mutation is committed but the audit trail is missing. The user receives a 500 error for a successful mutation.

Affected endpoints: all POST/PATCH/DELETE routes across firmware, rollouts, device-groups, devices, estates, sites, users, settings, alerts, diagnostics, api-keys, roles, reports, notifications, admin.

**Severity:** Medium — compliance gap, no data corruption
**Fix:** Wrap multi-step mutations in `db.transaction()`. The password reset flow (`auth.ts:363`) is the only existing example of the correct pattern.
**Effort:** ~3-4 hours (gradual, per-file)

#### 3. `isValidDeviceTransition()` is dead code
Defined at `rollouts.ts:48` but never called anywhere. Creates false confidence that device rollout status transitions are validated.

**Severity:** Medium — misleading
**Fix:** Either remove it or wire it into every `rollout_devices` status change in the execution worker (when built).
**Effort:** ~10 minutes to remove; ~1 hour to wire properly during Sprint 12

#### 4. Device status transitions are unvalidated
`PATCH /devices/:id` accepts any status value (`online`, `offline`, `fault`, `warning`) unconditionally. No transition guard exists.

**Note:** This may be by design — if device status is purely telemetry from MQTT/bridge, unrestricted transitions are acceptable. If users/support are editing status manually, validation should be added.

**Severity:** Medium — depends on usage context
**Fix:** Verify whether device status is telemetry-driven or user-controlled. If the latter, add transition validation.
**Design guidance:** Telemetry state (online/offline/fault from MQTT heartbeat) and administrative state (maintenance/disabled/decommissioned by operator) should be separate fields. The current `status` column conflates both. A future migration should split into `operational_status` (telemetry-driven, read-only API) and `admin_status` (user-controlled, with explicit transition rules).
**Effort:** TBD pending investigation

#### 5. Device group add-device TOCTOU race
`device-groups.ts:293-360` — the add-device endpoint reads `group.deviceIds`, checks for duplicates in application code, then issues an UPDATE. Two concurrent requests can both pass the duplicate check, resulting in a duplicate device entry in the array.

**Severity:** Medium — data integrity
**Fix:** Add `WHERE NOT (${deviceId}::uuid = ANY(deviceIds))` to the UPDATE statement, making the duplicate check atomic.
**Effort:** ~30 minutes

#### 6. `POST /api/auth/mfa/setup` lacks audit logging
MFA setup stores a TOTP secret and enables two-factor authentication but emits no audit event.

**Severity:** Medium — compliance gap
**Fix:** Add `logAuditEvent()` call after successful MFA setup.
**Effort:** ~15 minutes

#### 7. `POST /api/notifications` allows cross-user notification creation
Any authenticated user can create a notification for any `userId` in the request body. No scoping to the caller's identity.

**Severity:** Medium — authorization gap
**Fix:** Either restrict to admin/support roles, or scope `userId` to the caller (`require` that `userId === user.sub`).
**Effort:** ~30 minutes

#### 8. Notifications emitter has `reconnectionAttempts: 5`
`apps/api/src/socket/notifications-emitter.ts` limits reconnection to 5 attempts (~10 seconds). After that, live notification delivery is permanently lost. The bridge listener (`bridge-listener.ts`) correctly uses `Infinity`.

**Severity:** Medium — live-delivery reliability
**Fix:** Change `reconnectionAttempts` from `5` to `Infinity` to match bridge-listener.
**Effort:** ~5 minutes

### Low Priority (Performance / Polish)

#### 9. `GET /devices/:id` — 3 sequential SELECTs instead of 1 JOIN
Three round-trips for device → site → estate enrichment. Single JOIN would suffice.

#### 10. `GET /admin/stats` — 7 separate COUNT queries
Seven individual `COUNT(*)` queries. Aggregating with `FILTER(WHERE ...)` would reduce to 3.

#### 11. `GET /dashboard/summary` — full table scan of devices
Fetches all devices without pagination to compute distributions. Should use SQL aggregates at scale.

#### 12. Graceful shutdown doesn't disconnect bridge/notification sockets
`SIGTERM`/`SIGINT` handler calls `app.close()` and `pool.end()` but doesn't disconnect the bridge listener or notification emitter Socket.IO clients.
