# Changelog

All notable changes to the Sentience IoT Platform.

---

## v1.6.0 — 2026-07-16

### Real Infrastructure E2E Validation

**Added**

- **Dockerfiles for all services** — `apps/api/Dockerfile` (Fastify + entrypoint for migrations/seed), `apps/web/Dockerfile` (Next.js standalone output), `apps/realtime/Dockerfile` (Socket.IO bridge), `Dockerfile.simulator` (MQTT device simulator). All use Node 20-alpine with pnpm frozen-lockfile installs.
- **`docker-compose.e2e.yml`** — Full-stack environment: postgres → mosquitto → api → realtime → simulator → web → playwright. Healthchecks and dependency ordering ensure reliable startup. Services share the `sentience-e2e` Docker network.
- **API `/ready` endpoint** — Distinguishes liveness (`/health`) from readiness (`/ready`). `/ready` verifies DB connection + migrations applied. Returns 503 with diagnostic reason until ready.
- **`scripts/wait-for-services.ts`** — Readiness checker polling 7 services (PostgreSQL TCP, Mosquitto TCP, API liveness/readiness, Realtime Bridge TCP, Simulator TCP, Web HTTP). Times out with per-service diagnostic summary.
- **Next.js standalone output mode** — Conditional via `NEXT_STANDALONE` env var. Enabled in Docker builds, skipped on Windows (no symlink issues).
- **Real-infrastructure Playwright tests** — 4 spec files (10 tests) in `e2e/real/`: authentication (login/logout/invalid creds/RBAC), device telemetry pipeline (simulator → dashboard), platform health (5 service status cards, `/health`, `/ready`), device lifecycle (list/detail/diagnostics).
- **Playwright E2E config** — `playwright.e2e.config.ts` for real-infrastructure mode. No API mocking, no webServer (expects external Docker Compose).
- **Shared E2E auth fixture** — `e2e/real/fixtures.ts` performs real login for admin/support/customer roles, extracts JWT from localStorage.
- **GitHub Actions CI pipeline** — `.github/workflows/e2e.yml` with two jobs: lint-build (fast parallel gate) and e2e (full infrastructure test). Artifacts: Playwright report, traces/screenshots/videos, and service logs. Automatic shutdown and volume cleanup.

**Changed**

- **Playwright test directory restructured** — Existing 38 mocked tests moved to `e2e/mocked/`. New real-infrastructure tests in `e2e/real/`. Main `playwright.config.ts` updated to point at `e2e/mocked/`.
- **`apps/web/package.json` scripts** — Added `test:e2e:real` script.

**Build**

- TypeScript: ✅ Zero errors
- Production build: ✅ Passed (standalone disabled on Windows, conditional env var)

**Validation Notes**

v1.6.0 has been validated end-to-end against real infrastructure. All 6 gates passed. See `docs/release/VALIDATION_v1.6.0.md` for full results.

| Gate | Result |
|------|--------|
| Gate 0 — Repository Baseline | ✅ Clean commit `9e69571`, lint + build pass |
| Gate 1 — Docker Build | ✅ 5/5 images built |
| Gate 2 — Stack Startup | ✅ 6/6 services healthy |
| Gate 3 — Readiness | ✅ `/api/ready` returns `{"status":"ready"}` |
| Gate 4 — Real E2E Tests | ✅ **16/16 tests pass in 14.4s** against real infrastructure |
| Gate 5 — Failure Modes | ✅ MQTT, Bridge, DB failure all detected and recovered |

**Key validation fixes:**
- Playwright base image tag `v1.52.0-focal` not available → switched to `focal`
- Dockerfiles referenced stale file paths → corrected to match current project structure
- Mosquitto/realtime healthchecks used `bash` (not in Alpine) → replaced with `nc -z`
- API healthcheck hit `/health` but route is at `/api/health` → corrected
- `localhost` resolves to `::1` in Alpine (IPv6) → changed all healthchecks to `127.0.0.1`
- Orphan migration `0006` missing journal entry → registered in Drizzle journal
- Web container CMD needed `node apps/web/server.js` (Next.js 15 preserves monorepo path)
- CORS `origin=localhost:3000` blocked browser origin `web:3000` → corrected for E2E
- `NEXT_PUBLIC_API_URL=localhost:3001` baked into client JS where `localhost` ≠ API container → changed to `api:3001`
- 16 test-specific fixes: selectors, localStorage keys, API routing, zustand persist behavior

**Release:** Tagged `v1.6.0`. Release decision: ✅ Approved.

---

## v1.5.4 — 2026-07-15

### Platform Administration — Completion

**Added**

- **Dashboard summary API** — `GET /api/dashboard/summary` returns fleet KPIs (total/online/offline/fault/warning counts), battery/signal/temperature distributions, fleet health score, estate breakdowns, site count, and open alert count. Customer-isolated via `customerScope` middleware.
- **Admin overview backend** — `GET /api/admin/stats` returns real database counts (users, devices, alerts) with platform version and uptime.
- **Platform Health endpoint** — `GET /api/admin/health` performs 5 real service checks: API process metrics, PostgreSQL connection/storage/latency, MQTT broker TCP connectivity, Bridge Socket.IO state, Simulator event activity.
- **Profile notification preferences** — `notification_preferences` JSONB column on users table (migration `0006`). `PUT /api/auth/me` accepts and persists preferences with Zod validation. `GET /api/auth/me` returns them.

**Changed**

- **Reports page** — Replaced 3 hardcoded mock export entries (EXP-001–EXP-003) with session-only tracking. Honest empty state message: "No exports yet. Reports you export during this session will appear here."
- **Settings page** — Tenant tab persists `tenant_org_name`, `brand_color`, `support_phone`, `address` via the settings API. Notification channels tab persists email/push/SMS/webhook toggles. Maintenance tab consumes `usePlatformHealth()` for live MQTT/DB status.
- **Platform Health page** — No longer uses placeholder data. Displays live status for all 5 services with auto-refresh, admin-only simulator restart button, loading/error/empty states.
- **Admin overview page** — Displays real stats from `useAdminStats()` + `GET /api/admin/stats` instead of hardcoded values.

**Fixed**

- Profile notification preference toggles are now interactive with optimistic updates and rollback on failure. Each toggle saves independently (doesn't freeze the page).

**Technical Debt**

- PDF Export is functional (v1.3.0) but UI scheduling placeholder remains "Coming Soon." Tracked in `TECHNICAL_DEBT.md`.
- Report scheduling UI remains a placeholder — deferred as intentionally prioritized below user-facing completion.

**Build**

- TypeScript: ✅ Zero errors
- Production build: ✅ Passed

## v1.5.0 — 2026-07-06

### Playwright UI Regression Suite (API Mocked)

**Added**

- **Playwright UI Regression Suite** — 38 tests across 7 spec files covering 6 critical user flows. Tests run against the Next.js dev server with API mocking via `page.route()` — no Docker, PostgreSQL, or backend required. Validates frontend wiring and UI behavior only; does NOT validate backend correctness.
- **API mock fixtures** — Deterministic mock data for all 12 API domains (auth, devices, alerts, events, notifications, api-keys, notification-rules, reports, audit-logs, users, roles, settings) in `apps/web/e2e/fixtures/api-mocks.ts`.

**Test coverage**

- **Authentication** (6 tests) — Unauthenticated redirect, quick-login for 4 roles, admin login flow, user name/role badge, sign out clearing state, invalid credentials error, re-login as different role.
- **RBAC** (8 tests) — Admin/support/customer nav filtering, 5 route guard scenarios (Access Denied), customer data isolation.
- **Notifications** (6 tests) — Page loads with list, mark as read, Mark All Read, bell badge in header, empty state, loading state resolves.
- **API Keys** (4 tests) — List with masked keys, search input present, summary cards, create dialog opens.
- **Notification Rules** (5 tests) — Display rules, channel toggle, role checkbox toggle, empty state, loading state resolves.
- **Reports** (4 tests) — Page header, date range filter buttons present, loading state resolves, error state with retry button.
- **Audit Log** (4 tests) — Displays entries, search input present, loading state resolves, empty state when no entries.

**Notes**

- Uses mocked API responses. Full-stack validation scheduled for v1.6.0.

**Build**

- TypeScript: ✅ Zero errors across 9 packages
- Production build: ✅ 27/27 pages, shared JS 103 kB
- Playwright tests: ✅ 38/38 passing

---

## v1.5.1 — 2026-07-06

### Core Entity Management — Estates & Sites

The Functional Readiness Audit identified Estates and Sites as using hardcoded data. This milestone replaces both with real backend APIs.

**Added**

- **`GET /api/estates`** — Paginated estate list with search (name, address, region, city), sorting, and customer data isolation.
- **`GET /api/estates/:id`** — Single estate detail with customer scope check.
- **`POST /api/estates`** — Create estate with full Zod validation (admin only).
- **`PATCH /api/estates/:id`** — Update estate fields (admin only).
- **`DELETE /api/estates/:id`** — Delete estate with 409 protection if sites exist (admin only).
- **`GET /api/sites`** — Paginated site list with estate filter, search, sorting, customer isolation, estate name join.
- **`GET /api/sites/:id`** — Single site detail with estate name and customer scope check.
- **`POST /api/sites`** — Create site with automatic parent estate `siteCount` update (admin only).
- **`PATCH /api/sites/:id`** — Update site fields (admin only).
- **`DELETE /api/sites/:id`** — Delete site with device protection and estate `siteCount` sync (admin only).
- **Frontend: Estates page** — Rewritten. Uses `useEstates()` hook. Search input. Loading skeletons, error state with retry, EmptyState. "Add Estate" dialog with 7-field form. Delete confirmation dialog with 409 error handling. Admin-gated actions.
- **Frontend: Sites page** — Rewritten. Uses `useSites()` hook. Estate filter dropdown, search input. Loading skeletons, error state with retry, EmptyState. "Add Site" dialog with estate selector and building/floor/room counts. Delete confirmation dialog. Admin-gated actions.

**Files created:** 6 (`apps/api/src/routes/estates.ts`, `sites.ts`, `apps/web/src/lib/estates.ts`, `sites.ts`, `hooks/use-estates.ts`, `use-sites.ts`)

**Build**

- pnpm lint: ✅ Zero errors across 9 packages
- pnpm build: ✅ 30/30 pages, shared JS 103 kB

### Updated Documents

- `FUNCTIONAL_READINESS_AUDIT.md` — Updated milestone status table (v1.5.1 → Complete)
- `API_COVERAGE.md` — Estates/Sites updated to ✅✅✅ across all layers
- `TECHNICAL_DEBT.md` — Removed Estates/Sites from mock data debt list

---

## v1.5.3 — 2026-07-06

### Account Management

The Functional Readiness Audit identified Forgot Password, MFA, and Profile persistence as non-functional. This milestone implements the complete account lifecycle as a unified set of authentication flows.

**Design principle:** Implement the entire account lifecycle together rather than disconnected endpoints. Email delivery is abstracted behind an interface so providers (SMTP, Resend, SendGrid) can be swapped later without touching business logic.

**Added**

- **`POST /api/auth/forgot-password`** — Validates email, generates secure SHA-256 token with 1-hour expiry, stores hashed token in `password_reset_tokens` table, sends reset link via `EmailService` (logs to console in dev). Always returns generic success response (no user enumeration).
- **`POST /api/auth/reset-password`** — Validates token with constant-time comparison, checks expiry + single-use, hashes new password with bcrypt (cost 12), marks token used, invalidates all other tokens for the user. All within a DB transaction.
- **`POST /api/auth/mfa/setup`** — Generates TOTP secret via `otplib`, returns `otpauth://` URI and raw secret. Requires password verification.
- **`POST /api/auth/mfa/verify`** — Handles both MFA setup (JWT auth + enable flag) and login challenge (short-lived MFA token → full JWT). Verifies 6-digit TOTP code. Issues real JWT on challenge success.
- **`POST /api/auth/mfa/disable`** — Requires password verification, optional code check. Clears secret and disables MFA.
- **`GET /api/auth/mfa/status`** — Returns `mfaEnabled` and `mfaSetupComplete` booleans.
- **`POST /api/auth/change-password`** — Requires current password verification, bcrypt re-hash with cost 12, persists to DB.
- **`PUT /api/auth/me`** — Updates name/email with duplicate email checking (409 on conflict).
- **`EmailService` abstraction** — Interface with `DevEmailLogger` implementation (logs to console). Pluggable SMTP/Resend/SendGrid providers.
- **DB migration `0005_add_account_management`** — `password_reset_tokens` table (user_id, token_hash, expires_at, used_at) with indexes, and `mfa_secret` column on users table.
- **Frontend: Forgot Password page** — Wired to `useForgotPassword()` mutation. Loading spinner, inline validation, error display, success state. Generic response matches backend security requirement.
- **Frontend: Reset Password page** — New `/reset-password?token=` page. Handles missing/expired token state, password strength (min 8), confirmation matching, success redirect. Suspense-wrapped.
- **Frontend: MFA page** — Wired to `useMfaVerify()` mutation. 6-digit input with auto-focus/auto-tab, error display clears code inputs, Suspense-wrapped.
- **Frontend: MFA login flow** — Auth store `login()` now detects `mfaRequired` response and throws `MfaRequiredError`. Login page catches it and redirects to `/mfa?token=`. MFA page verifies code against short-lived token, receives full JWT on success.
- **Frontend: Profile page** — Rewired profile save to `useUpdateProfile()` mutation. Change password wired to `useChangePassword()` mutation. Full MFA setup wizard (password → QR code → verify → enable) and disable flow with inline error handling. Audit logging preserved.

**New files created:** 5 (`apps/api/src/lib/email.ts`, `apps/api/src/db/schema/password-reset-tokens.ts`, `apps/web/src/lib/auth.ts`, `apps/web/src/hooks/use-auth-account.ts`, `apps/web/src/app/(auth)/reset-password/page.tsx`)

**Build**

- pnpm lint: ✅ Zero errors across 9 packages
- pnpm build: ✅ 30/30 pages, shared JS 103 kB

---

## v1.5.2 — 2026-07-06

### Extensible Device Diagnostics

The Functional Readiness Audit identified Diagnostics as using hardcoded data. This milestone replaces the placeholder page with a test-entity-driven system where the UI renders whatever tests the backend reports for a given device type.

**Design principle:** Diagnostics are modeled as entities (`DiagnosticTest` with `type`, `supportedDeviceTypes`, `timeout`, `resultSchema`), not hardcoded per-device buttons. Adding new device types or tests requires no frontend changes.

**Added**

- **`@sentience/types`: Diagnostic types** — `DiagnosticTest`, `DiagnosticResult`, `DiagnosticRunStatus`, `DiagnosticTestType` with 12 possible test types including extensible ones like `cellular`, `gps`, `stream`, `lens`, `sd_card`, `relay_coil`.
- **DB: `diagnostic_tests` table** — Stores test definitions with JSONB `supportedDeviceTypes` and `resultSchema` for extensible/future validation.
- **DB: `diagnostic_results` table** — Stores test run outcomes with device ID, test ID, status, structured details JSON, timing, and executor.
- **Seed data: 6 test types** — Ping Test, Connection Test, MQTT Status, Signal Test, Battery Test, Firmware Check — mapped across all 5 device types with per-type compatibilities.
- **Seed data: 12 sample results** — Realistic result payloads across pass/warning/fail statuses with plausible metrics.
- **`GET /api/diagnostics/tests`** — List available tests, optionally filtered by device type for dynamic UI rendering.
- **`GET /api/diagnostics/tests/:id`** — Single test detail.
- **`POST /api/diagnostics/run`** — Execute a diagnostic test on a device. Runs validation (test exists, device exists, test supports device type), simulates realistic execution, persists result, and returns the outcome. Gated to admin/support roles.
- **`GET /api/diagnostics/results`** — Paginated result list with device/test/status filters.
- **`GET /api/diagnostics/results/:id`** — Single result detail with joined test and device metadata.
- **Frontend: Dynamic diagnostic test cards** — The page renders whatever tests the backend returns. Each test card shows name, icon, description, and a "Run Diagnostic" button.
- **Frontend: Device selector** — Dropdown to pick a device. Tests filter automatically based on the selected device's type.
- **Frontend: Run diagnostic mutation** — Calls `POST /api/diagnostics/run`, shows loading spinner on the specific card, displays toast on completion.
- **Frontend: Recent diagnostics history** — Latest results table grouped by device, with status badges and relative timestamps.
- **Frontend: Loading skeleton** — 6-card skeleton grid + result skeleton while fetching.
- **Frontend: Error state** — Error card with retry button if test loading fails.
- **Frontend: Empty state** — Informational empty state when no tests are available for a device type.
- **Simulated diagnostic execution** — Realistic result generation based on device status, battery level, signal strength, with plausible latency/duration values.
- **RBAC enforcement** — Frontend gates Run buttons by `devices:update` permission; backend requires admin or support role.
- **Drizzle migration** — `0003_add_diagnostics` with both new tables and indexes.

**Files created:** 5 (`packages/types/src/diagnostic.ts`, `apps/api/src/db/schema/diagnostics.ts`, `apps/api/src/routes/diagnostics.ts`, `apps/web/src/lib/diagnostics.ts`, `apps/web/src/hooks/use-diagnostics.ts`)

**Build**

- pnpm lint: ✅ Zero errors across 9 packages
- pnpm build: ✅ 27/27 pages, shared JS 103 kB, diagnostics page 137 kB

---

## v1.4.0 — 2026-07-05

### Replace Mock Data With Real Backend

**Changed**

- **Notifications page** — Already fully API-backed via `useNotifications()` hook. Fetches from `GET /api/notifications` with pagination, category, and read-status filters. Live simulated notifications merged in-memory when simulation mode is active. Simulated notifications marked read locally without an API round-trip.
- **API Keys page** — Already fully API-backed via `useApiKeys()` hook. Create, revoke, and delete operations persist through real API mutations to `GET/POST/PATCH/DELETE /api/api-keys`. Search and status filtering pass through to server-side query parameters.
- **Notification Rules page** — Already fully API-backed via `useNotificationRules()` hook. Loads rules from `GET /api/notification-rules`, saves edits through `PATCH /api/notification-rules/:id` with batched change detection. Loading, error, and empty states all present.

**Removed**

- **Known issues entry** — "4 pages still use partial mock data" removed (all 3 admin pages now API-backed; device detail fallback tabs already verified clean).

**Build**

- TypeScript: ✅ Zero errors across 9 packages
- Production build: ✅ 28/28 pages, shared JS 102 kB

---

## v1.3.0 — 2026-07-05

### Report PDF Export

**Added**

- **PDF export button enabled** — The previously disabled "Export PDF" button on the Reports page now generates a PDF of the current report view using `html2canvas` + `jsPDF`.
- **`usePdfExport` hook** — New reusable hook: dynamically imports `html2canvas` and `jsPDF` to avoid impacting initial bundle size. Captures an element as a canvas, renders it onto an A4 PDF with multi-page support, and triggers a download. Returns `{ isExporting, error, exportPdf, clearError }` with a typed `PdfExportResult` for callback handling.
- **PDF report header** — Exported PDF includes a title ("Fleet Health Report"), active filters (date range, estate, site, device), and a generated timestamp. The header is hidden on screen via `hidden print:block` Tailwind classes.
- **Notification feedback** — Success/failure toasts via `useNotificationStore` after PDF generation completes.
- **Loading state** — Button shows "Generating PDF…" with a spinning icon while the PDF is being generated.
- **Filename format** — `report-YYYY-MM-DD.pdf`.

**Build**

- TypeScript: ✅ Zero errors across 9 packages
- Production build: ✅ 27/27 pages, shared JS 102 kB
- Reports page first-load JS: 120 kB (+18 kB from ref wrapper and hook wiring; `html2canvas` and `jsPDF` imported dynamically at runtime)

---

## v1.2.0 — 2026-07-05

### Audit Log Filtering

**Changed**

- **Filters now apply server-side** — The audit log page passes search, action, and pagination params to `GET /api/audit-logs` as query parameters. Previously the frontend fetched 200 rows and filtered/paginated them client-side.
- **Pagination totals reflect filtered results** — The API returns `total` and `totalPages` based on the filtered query, so page counts are accurate even with active filters.
- **Severity filter removed** — Severity was derived from action type (not a DB field), so it had no server-side equivalent. Users can filter by action directly.
- **CSV export fetches full filtered dataset** — Clicking Export CSV now fetches all matching rows (up to 10,000) from the API, merged with local session entries, rather than exporting only the client-side filtered subset of 200.
- **Local entries still merged** — Session-local audit entries (from `audit-store`) are still prepended and deduplicated for immediate write-back visibility.

**Build**

- TypeScript: ✅ Zero errors across 9 packages
- Production build: ✅ 27/27 pages, shared JS 102 kB

### Known Issues

- Auth store `loginAsRole()` still bypasses backend auth — gated by DEV ONLY guards.
- `useGenerateReport` has no optimistic update.
- No OpenAPI/Swagger spec generation.
- No WebSocket event emission from REST mutations.

---

## v1.1.1 — 2026-07-05

### Security & Accessibility Hardening

**Fixed**

- **Missing ARIA labels on icon-only buttons** — Added `aria-label` to 9 icon-only buttons across 4 pages (events, audit-log, users, admin/api-keys) including close details, clear search, activate/deactivate toggle, revoke/delete key buttons.

**Verified**

- CORS origin restriction — Already configured via `CORS_ORIGIN` env var (default: `http://localhost:3000`) in `apps/api`. Documented in `.env.example`.
- Rate limiting — Already configured via `RATE_LIMIT_MAX` env var (default: 100/min) in `apps/api`. Documented in `.env.example`.

**Build**

- TypeScript: ✅ Zero errors across 9 packages
- Production build: ✅ 27/27 pages, shared JS 102 kB

### Known Issues

- Auth store `loginAsRole()` still bypasses backend auth — gated by DEV ONLY guards.
- 4 pages still use partial mock data: API Keys, Notification Rules, Notifications, and device detail fallback tabs.
- `useGenerateReport` has no optimistic update.
- No OpenAPI/Swagger spec generation.
- No WebSocket event emission from REST mutations.

---

## v1.0.0 — 2026-07-05

### RC5: Production Release

**Changed**

- **Notifications pipeline end-to-end** — Bridge listener (`apps/api/src/socket/bridge-listener.ts`) now listens for `alert:created` events from the realtime bridge, persists them as notification records in the database, and emits `notification:new` to connected clients. Flow: MQTT event → Bridge → `alert:created` → API listener → INSERT notifications (DB) → emitNotification() → Bridge → `notification:new` → Frontend (badge + page).

**Fixed**

- **Simulator estate UUID mismatch** — Fixed `mock/device-generator.ts` ESTATES IDs to use deterministic UUIDs matching DB seed output, eliminating `invalid input syntax for type uuid` errors in bridge listener.
- **Unread notification sync** — Added `unreadCount` to `GET /api/notifications` response so the bell badge has unread count in a single round-trip.

**Added**

- **Mosquitto configuration** — `.docker/mosquitto.conf` with listener on port 1883 and anonymous access for local development.
- **RC5 release docs** — Release plan and validation updated for v1.0.0 GA.

**Build**

- TypeScript: ✅ Zero errors across 9 packages
- Production build: ✅ 27/27 pages, shared JS 102 kB

### Known Issues

Same as RC3 — see CHANGELOG below. No new issues introduced in RC5.

---

## v1.0.0-rc.3 — 2026-07-03

### RC3 Phase 2 — UX Audit & Fixes

**Changed**

- **UX improvements across 17 files (see `UX_AUDIT_REPORT.md`)** — Accessibility (ARIA labels, `htmlFor`, `aria-checked`, `role="radio"`, `aria-pressed`), form validation (`min="0"` on number inputs), empty states (Estates, Notifications, Diagnostics), mutation feedback (Users toast, Profile error handling), keyboard navigation.

### RC3 Phase 3 — API Audit & RBAC Hardening

**Fixed**

- **Critical RBAC gap: `PATCH /api/settings/:key`** — Added `requireRole("admin")`. Previously any authenticated user could update platform settings.
- **Critical RBAC gap: `PATCH /api/users/:id`** — Added `requireRole("admin")` + role ID existence validation. Previously any user could change another user's role.
- **Critical RBAC gap: `PATCH /api/devices/:id`** — Added `requireRole("admin", "support")`. Previously any role could update device metadata.
- **Critical RBAC gap: `PATCH /api/alerts/:id`** — Added `requireRole("admin", "support")`. Previously any role could acknowledge or resolve alerts.
- **Medium RBAC gap: `GET /api/users`** — Added `requireRole("admin")`. Previously customers could list all platform users.

**Removed**

- **Dead code: `use-live-devices.ts`** — The `useLiveDevices()` hook was never imported anywhere.
- **Mock seed data from audit store** — Removed 5 hardcoded audit entries.
- **`@sentience/mock` from next.config.ts transpilePackages** — Not imported in production code.

**Changed**

- **Optimistic updates for 6 mutations** — User mutations (`useCreateUser`, `useUpdateUser`, `useDeactivateUser`), role permission mutations (`useGrantPermission`, `useRevokePermission`), and settings mutation (`useUpdateSetting`) now cancel outgoing queries, snapshot previous data on `onMutate`, and rollback on `onError`.
- **Device detail page: local `cn()` replaced** — Imported from `@sentience/utils`.

**Added**

- **API Audit Report** — `docs/implementation/API_AUDIT_REPORT.md` with comprehensive audit of all 10 API route groups across 12 dimensions.

### RC3 Phase 4 — Performance Audit

**Changed**

- **Dashboard JS reduced from 222 kB to 123 kB** — Lazy-loaded Recharts via dynamic import of `DistributionBar`.
- **Reports page correctly bears Recharts cost** — 241 kB first-load JS (expected, uses 4 chart types).
- **Database indexes added** — High-frequency query patterns (device status, event timestamps, alert severity, user role) now indexed.
- **TanStack Query staleTime configured** — `staleTime: 30_000` on user list, audit log, settings queries to reduce redundant API calls.
- **Socket event invalidations debounced** — Rapid telemetry storm events are batched and invalidated after 100ms of inactivity.

**Added**

- **Performance Audit Report** — `docs/implementation/PERFORMANCE_AUDIT_REPORT.md` covering bundle sizes, API response times, database query plans, and real-time latency.

### RC3 Phase 5 — Security Audit

**Fixed**

- **Critical: SHA-256 → bcrypt** — Password hashing upgraded to bcrypt (cost factor 12) in both login and user creation routes.
- **Critical: JWT secret required** — No default fallback for `JWT_SECRET`. Server refuses to start without it.
- **Critical: Dev .env gitignored** — `apps/api/.env` added to `.gitignore`. `.env.example` uses `change-me` placeholder.
- **High: Real authentication** — Frontend `login()` now calls `POST /api/auth/login` → receives JWT → stored in Zustand → injected by `api-client.ts` as `Authorization: Bearer <token>`. Previously used mock accounts and returned `"mock-jwt-token"`.
- **High: Socket.IO JWT authentication** — `socket-server.ts` verifies JWT during handshake. `connectSocket(token)` sets `s.auth = { token }`. Socket reconnects with fresh token on login/logout.
- **High: Demo login isolated** — `loginAsRole()` remains for dev use but gated by DEV ONLY documentation. Suggested production guard via `process.env.NODE_ENV` check.

**Added**

- **Security Audit Report** — `docs/implementation/SECURITY_AUDIT_REPORT.md` with 18 findings (8 fixed, 10 remaining debt).

### RC3 Phase 6 — Documentation & Release Readiness

**Changed**

- **CLAUDE.md** — Updated to reflect RC3 completion, real RBAC, real authentication architecture.
- **BUILD_PLAN.md** — Added RC3 Phase 4 (Performance), Phase 5 (Security), Phase 6 (Documentation).
- **ROADMAP.md** — Deduplicated Future section. Added RC3 Phase 3/4/5 entries.
- **CHANGELOG.md** — Deduplicated repeated entries. Added Phase 4/5/6 entries.
- **RELEASE_PLAN.md** — Updated to reflect real auth, real API, Socket.IO auth.
- **TECHNICAL_DEBT.md** — Removed outdated entries (mock auth, unconnected API). Added Phase 5 security debt.
- **DEPLOYMENT.md** — Updated to reflect existing realtime bridge implementation.

**Added**

- **Root CHANGELOG.md** — Pointer to `docs/implementation/CHANGELOG.md`.
- **Production Readiness Report** — `docs/implementation/PRODUCTION_READINESS.md`.

### Known Issues

- Auth store `loginAsRole()` still bypasses backend auth — gated by DEV ONLY guards.
- 4 pages still use partial mock data: API Keys, Notification Rules, Notifications, and device detail fallback tabs.
- `useGenerateReport` has no optimistic update.
- Customer-level data isolation not implemented on devices/events endpoints.
- No transactions on multi-query write operations.
- No OpenAPI/Swagger spec generation.
- No rate limiting installed.
- SHA-256 password hashing → fixed (bcrypt now used).
- CORS `origin: true` allows any origin.
- No WebSocket event emission from REST mutations.

---

## v1.0.0-rc.2 — 2026-07-03

### Added

- **Audit log backend API route** — `GET /api/audit-logs` and `GET /api/audit-logs/:id` with pagination, action filter, date range, search, and sort.
- **Audit log API functions** — `getAuditLogs(params)` and `getAuditLog(id)` wrapping typed responses.
- **TanStack Query hooks** — `useAuditLogs()` and `useAuditLog(id)`.
- **Graceful degradation** — Audit log page merges API entries with locally-recorded entries, deduplicates by ID.
- **Device API functions** — `getDevices()` and `getDevice(id)` wrapping `GET /api/devices` and `GET /api/devices/:id`.
- **TanStack Query hooks** — `useDevices()` and `useDevice(id)` with live socket overlay.
- **Devices page: loading/error/empty states** — Skeleton table, error card with retry, empty state.
- **Settings API functions** — `getSettings()` and `updateSetting(key, value)`.
- **TanStack Query hooks** — `useSettings()` and `useUpdateSetting()`.
- **Settings page: loading/error states** — Loading spinner, error card with retry, save feedback.
- **Event API functions** — `getEvents()` and `getEvent(id)`.
- **TanStack Query hooks** — `useEvents()` and `useEvent(id)` with live merge/dedup.
- **Events page: loading/error/empty states** — Skeleton, error card, empty state.
- **Report API functions** — `getReportSummary()`, `getReportTrends()`, `getReports()`, `getReport()`, `generateReport()`.
- **TanStack Query hooks** — `useReportSummary()`, `useReportTrends()`, `useRecentReports()`, `useGenerateReport()`.
- **Reports page: loading/error states** — Full-page skeleton, error card with retry.
- **Backend report endpoints** — `GET /api/reports/summary` and `GET /api/reports/trends`.
- **User API functions** — getUsers, getUser, createUser, updateUser, deactivateUser.
- **Role API functions** — `getRoles()`.
- **TanStack Query hooks** — useUsers, useUser, useRoles, useCreateUser, useUpdateUser, useDeactivateUser.
- **Users page: loading/error/empty states** — Loading spinner, error card, empty state.
- **Backend: users API joined with roles** — Returns both roleId (UUID) and role (enum name).
- **API Health hook** — `useApiHealth` polls `GET /api/health` every 15s, shows real API status on Platform Health page.

### Changed

- **Audit Log page** — Now fetches from `GET /api/audit-logs` via TanStack Query. Search, filters, pagination operate client-side on merged data.
- **Devices list page** — Now fetches from `GET /api/devices`. Live socket data overlaid via Zustand.
- **Device detail page** — Base device data from `GET /api/devices/:id`. Live overlay remains.
- **Settings page** — Now fetches from `GET /api/settings`. Changes persisted asynchronously.
- **Events page** — Now fetches from `GET /api/events`. Live events merged with dedup.
- **Reports page** — Now fetches summary/trends from API. Removed mock generators.
- **Users page** — Now fetches from `GET /api/users`. Mutations through real API.
- **Platform Health: API Service** — Now real from `GET /api/health`. Falls back to "disconnected".
- **`useReportsData` hook** — Now delegates to TanStack Query hooks.
- `CLAUDE.md` — Updated for RC2 completion (9 of 9 domains integrated).
- `ROADMAP.md` — All 9 domains marked complete.

---

## v1.0.0-rc.1 — 2026-07-03

### Added

- **Backend API app** — `apps/api` with Fastify 5, TypeScript, Drizzle ORM.
- **PostgreSQL database** — 13-table schema via Docker Compose.
- **API routes** — 9 route groups with JWT auth, pagination, filtering.
- **Seed data** — 4 roles, 4 customers, 4 estates, 8 sites, 24 devices, 50 events, 15 alerts, etc.
- **JWT authentication** — `@fastify/jwt` with 24h token expiry.
- **Dev commands** — `pnpm db:start/stop/migrate/seed/api:dev`.
- **API documentation** — `docs/backend-api.md`.
- **Admin overview page** — `/admin` hub with section cards, system status.
- **Enhanced settings** — Tenant, Feature Flags, Maintenance mode tabs.
- **API Key management** — Create/revoke, masked display, copy-to-clipboard.
- **Audit log enhancements** — Detail drawer, severity filters.
- **Notification Rules page** — Alert thresholds, channel toggles, role-based prefs.
- **Platform Health dashboard** — 4 service status cards.
- **Admin route protection** — `RequirePermission` with `admin` resource.

### Changed

- `ROADMAP.md`, `turbo.json`, root `package.json` — Updated for backend.
- `BUILD_PLAN.md` — Sprint 8 (Backend API) marked completed.

---

## v0.12.0 — 2026-07-03

### Added

- **RBAC permission system** — Full matrix (4 roles × 14 resources × 5 actions).
- **Auth store: real RBAC enforcement** — `hasPermission()`/`hasRole()` return real results.
- **Demo role switching UI** — Header role badge, Switch Role modal.
- **Sidebar navigation filtering** — Admin sees 13, Support sees 10, Customer sees 5.
- **Route guard (`AuthGuard`)** — Redirects unauthenticated users to `/login`.
- **Permission guard (`RequirePermission`)** — Access Denied for unauthorized roles.
- **User management page** — User list, search/filter, create dialog, inline role change.
- **Roles & Permissions page** — Permission matrix with toggle switches.
- **Audit Log page** — Live store-backed entries, search, CSV export, pagination.
- **Settings page** — Tabbed UI (General, Security, Notifications, Maintenance).
- **Profile page** — Live auth data, personal info edit, password change.
- **Audit store** — Zustand store with `addEntry()`, 5 seeded entries.
- **Login page: quick-role buttons** — 4 demo role cards.

### Changed

- Auth store login flow now finds matching demo account by email.
- Header displays role badge with dropdown (Profile, Switch Role, Sign Out).
- Dashboard layout wraps children in `AuthGuard`.

## v0.11.0 — 2026-07-03

### Changed

- **Consistency audit** — All derived metrics unified through shared selectors in `@sentience/utils/src/selectors.ts`.

### Added

- **`@sentience/utils` selectors module** — Pure functions for status counts, distributions, health scores, estate summaries.
- **`@sentience/types` dependency** — Added to `@sentience/utils/package.json`.

### Fixed

- **9 categories of duplicated business logic** — Status counts, battery/signal/temperature distributions, fleet health score, system health, estate summaries, color mapping, percentage helpers. All now use shared selectors.
- **Double `colorClassToHex`** — Consolidated to single import.
- **Type imports** — `DistributionBar`/`EstateSummaryCards` now import from `@sentience/utils`.

## v0.10.0 — 2026-07-03

### Added

- **Reports Dashboard** — Date range, estate/site/device cascade filters, fleet summary cards.
- **Fleet Health Gauge** — Composite health score with breakdown bars.
- **Alert Trends chart** — Stacked area chart (critical/warning/info).
- **Device Availability chart** — Stacked bar chart (online/offline/fault).
- **Battery/Signal Distribution charts** — Reused from dashboard pattern.
- **Fault Distribution chart** — Donut pie chart with 6 fault categories.
- **CSV Export** — Client-side CSV generation.
- **PDF Export (placeholder)** — Disabled button with tooltip.
- **Scheduling UI (placeholder)** — Daily/Weekly/Monthly badges.
- **Recent Exports list** — In-memory export history with re-download.
- **Event History page** — Severity/category/device/date filters, text search.
- **Event Detail Panel** — Slide-in sheet with device link.
- **CSV Export (events)** — Client-side CSV with filtered data.
- **Pagination** — 20 events per page with Previous/Next.
- **Empty State** — EmptyState with clear-filters action.
- **Live Alert Store** — Zustand store with ring buffer (max 100).
- **Alert Emission in bridge** — `alert:created` for 5 event types.
- **Alert Resolution in bridge** — `alert:updated` for status transitions.
- **Socket wiring** — `useSocket` handles alert events.
- **Alerts page** — Severity/status filters, EmptyState.
- **Alert Detail Sheet** — Full info, acknowledge/resolve, timeline.
- **Timeline component** — `AlertTimeline` with severity-coded dots.

### Fixed

- Inline `cn()` conflict — Replaced with shared `@sentience/utils` import.
- Alert detail panel Eye button — Was missing onClick handler.

## v0.7.0 — 2026-07-02

### Added

- **Operations Center Dashboard** — 5 KPI cards, fleet health gauge, distribution charts.
- **Fleet Health Score** — Composite metric with green/amber/red thresholds.
- **Battery, Signal, Temperature Distribution charts** — Recharts bar charts.
- **Devices by Estate** — Summary cards with status dot breakdowns.
- **Recent Activity feed** — Live event stream with severity icons.
- **Devices Recently Offline** — List with name, site, last-seen links.
- **Quick Action cards** — View Offline/Faults/Diagnostics/Export Report.
- **Simulator banner** — Informational card when no live data.
- **Shared components** — `FleetHealthGauge`, `DistributionBar`, `RecentActivity`, `EstateSummaryCards`, `QuickActions`.

## v0.6.0 — 2026-07-02

### Added

- **Device Detail page** — Dynamic route `/devices/[id]` with live telemetry.
- **Six detail tabs** — Overview, Telemetry, I/O, Diagnostics, Events, Config.
- **Device table linking** — Row click navigates to `/devices/[id]`.
- **Not-found handling** — EmptyState for unknown device IDs.
- **Live indicator** — Pulsing green dot + "Live" label.
- **Mock diagnostics** — Per-device pass/fail/warning tests.
- **Section states** — EmptyState for I/O and Events tabs.

### Changed

- 22 total routes (21 static + 1 dynamic).

## v0.5.0 — 2026-07-02

### Added

- **Monorepo scaffold** — pnpm workspaces, Turborepo, TypeScript config.
- **`@sentience/types`** — All domain type definitions.
- **`@sentience/utils`** — `cn()`, formatters, constants.
- **`@sentience/config`** — Shared Tailwind preset with shadcn/ui variables.
- **Design system** — CSS variables (light + dark), custom animations, utility classes.
- **UI kit** — Button, Badge, Card, StatusDot, StatusBadge, EmptyState, PageHeader.
- **Layout** — DashboardShell, Sidebar (13 nav items), Header, RealtimeListener.
- **Providers** — QueryProvider, ThemeProvider.
- **Zustand stores** — auth-store, ui-store, notification-store, live-device-store.
- **API client** — api-client.ts, query-keys.ts, pagination types.
- **Socket.IO client** — Singleton, 14 typed events, auto-reconnect, rooms.
- **MQTT Simulator** — Device generator, CLI, Docker Mosquitto.
- **Realtime Socket.IO bridge** — MQTT client, event normalizer, device registry.
- **Realtime bridge tests** — Normalizer (14 tests), device registry (9 tests).
- **Socket hook** — `useSocket()` with cache invalidation map, live store updates.
- **21 pages** — All routes with mock data.
- **Documentation** — ADRs (3), DEPLOYMENT.md, MQTT guide, bridge guide, ROADMAP.md, CHANGELOG.md.
