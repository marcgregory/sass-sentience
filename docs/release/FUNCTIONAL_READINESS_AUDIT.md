# Functional Readiness Audit

**Date:** 2026-07-06
**Audience:** Engineering Team
**Scope:** All 24 application routes — page-level functional completeness

## Milestone Status

| Milestone | Status | Notes |
|-----------|--------|-------|
| v1.5.1 — Core Entity Management | ✅ Complete | Estates + Sites CRUD (2026-07-06) |
| v1.5.2 — Device Diagnostics | ✅ Complete | Replace placeholder tools (2026-07-06) |
| v1.5.3 — Account Management | ✅ Complete | Forgot Password, MFA, Profile persistence (2026-07-06) |
| v1.5.4 — Platform Administration | ⬜ Not Started | Dashboard API, Health, Settings wiring |
| v1.6.0 — Full-Stack E2E Validation | 🔒 Blocked | Blocked by v1.5.1–v1.5.4 |

*Update this table's Status column as milestones are completed. The detailed findings below are the checklist for each milestone.*

Each page is classified into one of five statuses:

| Status | Meaning |
|--------|---------|
| ✅ Production Ready | Real API integration, full CRUD, all states handled |
| ⚡ Partially Functional | Works but has minor gaps (static fallback, missing mutation) |
| 🟡 Mock Data | Uses hardcoded/dummy data instead of API calls |
| 🔴 Placeholder | UI exists but does nothing useful |
| ⬜ Not Implemented | Stub or redirect only |

---

## Authentication Routes

### ✅ Login `/login`

| Check | Result |
|-------|--------|
| Real API integration | ✅ `useAuthStore().login()` → `POST /api/auth/login` with JWT |
| Demo mode | ✅ Quick role login buttons (dev-only, gated by `NEXT_PUBLIC_ENABLE_DEMO_LOGIN`) |
| Loading/Error/Empty | ✅ Spinner, inline error display |
| Dark mode | ✅ |
| Responsive | ✅ Centered card layout |

**Verdict:** Production Ready

### ✅ Forgot Password `/forgot-password` (v1.5.3)

| Check | Result |
|-------|--------|
| Real API integration | ✅ `useForgotPassword()` → `POST /api/auth/forgot-password` |
| Backend endpoint | ✅ Secure token generation, hashing, expiry, email dispatch (dev logger) |
| Generic response | ✅ Same message regardless of whether email exists (no user enumeration) |
| Loading/error states | ✅ Loading spinner, inline validation, error display |
| Success state | ✅ Shows success message matching non-enumeration pattern |
| Dark mode | ✅ |
| Responsive | ✅ |

**Verdict:** Production Ready

### ✅ MFA `/mfa` (v1.5.3)

| Check | Result |
|-------|--------|
| Real API integration | ✅ `useMfaVerify()` → `POST /api/auth/mfa/verify` |
| Code verification | ✅ TOTP 6-digit verification via `otplib`, rejects invalid codes, clears inputs on error |
| Login challenge flow | ✅ Short-lived MFA token, returns real JWT on success |
| Setup flow | ✅ `POST /api/auth/mfa/setup` generates TOTP secret, verify enables MFA |
| Loading/error states | ✅ Loading spinner, inline error display |
| Dark mode | ✅ |
| Responsive | ✅ |

**Verdict:** Production Ready

---

## Dashboard

### ⚡ Dashboard `/dashboard`

| Check | Result |
|-------|--------|
| Real API integration | ⚠️ **Hybrid** — uses `useDashboardData()` |
| Simulator mode | ✅ Live data from `live-device-store` when simulator is ON |
| Normal mode (Sim OFF) | ❌ **Mock data** — hardcoded `MOCK_KPIS`, `MOCK_HEALTH`, `MOCK_BATTERY`, etc. |
| Fallbacks | ✅ Zero state when Sim ON + no data; connection banners |
| Dark mode | ✅ |
| Responsive | ✅ |

**Issues:**
1. Without simulator running, all 5 KPI cards, fleet health score, battery/signal/temp distributions, estate summary, events today are hardcoded mock values
2. No API-backed dashboard endpoint for production use

**Fix:** Create `GET /api/dashboard/summary` endpoint. Wire `useDashboardData()` to hit it when simulator is OFF.

---

## Core CRUD Pages

### ✅ Devices `/devices`

| Check | Result |
|-------|--------|
| Real API | ✅ `useDevices()` → TanStack Query → API |
| Search | ✅ Text search |
| Filters | ✅ Status reason filter chips |
| Loading/Error/Empty | ✅ All three states with skeletons |
| Pagination | ✅ Page count shown, Next/Previous buttons |
| Dark mode | ✅ |
| Responsive | ✅ Overflow scroll on table |
| Simulator mode | ✅ Banner, merges live devices |

**Issues:**
- "Add Device" button exists but has no implementation (no dialog, no API call yet)
- "Next" pagination button is never disabled when at the last page

**Verdict:** Production Ready (with minor gaps: Add Device is frontend-only)

### ✅ Device Detail `/devices/[id]`

| Check | Result |
|-------|--------|
| Real API | ✅ `useDevice(deviceId)` → API |
| 6 tabs | Overview, Telemetry, I/O, Diagnostics, Events, Config |
| Loading/Error/NotFound | ✅ All three with skeleton and empty states |
| Live overlay | ✅ Simulator mode overlays live telemetry |
| Firmware | ✅ Real data from API |
| I/O | ✅ Real data from API |
| Diagnostics | ✅ Real data from API |
| Dark mode | ✅ |
| Responsive | ✅ |

**Issues:**
- "Check for Updates" button (firmware) has no API mutation wired
- "Run" button on diagnostics just shows a 2s spinner, no real API call
- I/O points show "No inputs/outputs" for devices without API data

**Verdict:** Production Ready (with minor UX gaps)

### ✅ Estates `/estates` (v1.5.1)

| Check | Result |
|-------|--------|
| Real API | ✅ `useEstates()` → TanStack Query → `GET /api/estates` with search, pagination |
| CRUD | ✅ Create dialog (7 fields), delete with 409 error display |
| TanStack Query | ✅ `useEstates()`, `useEstate()`, `useCreateEstate()`, `useUpdateEstate()`, `useDeleteEstate()` |
| Search | ✅ Server-side search (name, address, region, city) |
| Loading/Error/Empty | ✅ Skeletons, error card with retry, EmptyState |
| RBAC | ✅ Create/update/delete gated to admin |
| Dark mode | ✅ |
| Responsive | ✅ |

**Verdict:** Production Ready

### ✅ Sites `/sites` (v1.5.1)

| Check | Result |
|-------|--------|
| Real API | ✅ `useSites()` → TanStack Query → `GET /api/sites` with estate filter, search |
| CRUD | ✅ Create dialog (estate selector, building/floor/room counts), delete with 409 |
| TanStack Query | ✅ `useSites()`, `useSite()`, `useCreateSite()`, `useUpdateSite()`, `useDeleteSite()` |
| Filters | ✅ Estate filter dropdown + text search |
| Loading/Error/Empty | ✅ Skeletons, error card with retry, EmptyState |
| RBAC | ✅ Create/update/delete gated to admin |
| Site count sync | ✅ Automatically updated on create/delete |
| Dark mode | ✅ |
| Responsive | ✅ |

**Verdict:** Production Ready

### ✅ Alerts `/alerts`

| Check | Result |
|-------|--------|
| Real API | ✅ `useAlerts()`, `useAcknowledgeAlert()`, `useResolveAlert()` |
| Filters | ✅ Severity + Status filters |
| Summary cards | ✅ Active/Critical/Warning/Info counts |
| Detail sheet | ✅ Full timeline, description, device/site info |
| Actions | ✅ Acknowledge + Resolve with confirmation |
| Loading/Error/Empty | ✅ All states with skeleton and empty states |
| RBAC | ✅ Actions gated by permission check |
| Simulator mode | ✅ Banner for live feed |
| Dark mode | ✅ |

**Verdict:** Production Ready

### ✅ Events `/events`

| Check | Result |
|-------|--------|
| Real API | ✅ `useEvents()` with server-side filtering |
| Pagination | ✅ Working Previous/Next with page tracking |
| Search | ✅ Debounced text search |
| Filters | ✅ Severity, Category, Device, Date Range |
| CSV Export | ✅ Client-side CSV generation with download |
| Detail panel | ✅ Slide-in sheet with metadata, raw JSON |
| Device link | ✅ Clickable device IDs link to device detail |
| Loading/Error/Empty | ✅ All states |
| Dark mode | ✅ |
| Simulator mode | ✅ Banner, merges live events |

**Verdict:** Production Ready

### ✅ Reports `/reports`

| Check | Result |
|-------|--------|
| Real API | ✅ `useReportSummary()`, `useReportTrends()` via TanStack Query |
| Charts | ✅ Recharts: Area, Bar, Pie charts |
| Fleet Summary | ✅ Devices, Battery, Signal, Alerts summary cards |
| Filters | ✅ Date Range, Estate, Site, Device with cascading |
| CSV Export | ✅ Generates CSV from current data |
| PDF Export | ✅ `html2canvas` + `jspdf` export |
| Schedule Report | 🔴 **"Coming Soon"** placeholder card |
| Recent Exports | ⚠️ **Hardcoded mock data** (`useState` with 3 entries) |
| Loading/Error/Empty | ✅ Skeleton and error states |
| Dark mode | ✅ |
| Simulator mode | ✅ Uses live device data when Sim ON |

**Issues:**
1. "Schedule Report" is a hardcoded "Coming Soon" placeholder
2. "Recent Exports" shows 3 hardcoded mock entries from `useState`, not from any API
3. Estate/Site/Device filter options fall back to hardcoded maps when no device entries exist

**Verdict:** Production Ready (with documented placeholders for Scheduling and Recent Exports)

### ✅ Diagnostics `/diagnostics` (v1.5.2)

| Check | Result |
|-------|--------|
| Real API | ✅ `useDiagnosticTests()` + `useDiagnosticResults()` + `useRunDiagnostic()` via TanStack Query |
| Diagnostic tools | ✅ Dynamically rendered from `GET /api/diagnostics/tests`, filtered by device type |
| Run diagnostic | ✅ `POST /api/diagnostics/run` with loading spinner and notification feedback |
| Recent diagnostics | ✅ Real results from `GET /api/diagnostics/results`, paginated |
| Loading/Error/Empty | ✅ Skeleton loading, error card with retry, EmptyState for no tests/results |
| RBAC | ✅ Run buttons gated by `devices:update` permission; backend requires admin/support |
| Device selector | ✅ Dropdown filters tests by selected device type |
| Notification feedback | ✅ Toast on success/failure of diagnostic run |
| Dark mode | ✅ |
| Responsive | ✅ |

**Verdict:** Production Ready

---

## Settings & Configuration

### ⚡ Settings `/settings`

| Check | Result |
|-------|--------|
| Real API | ✅ `useSettings()` + `useUpdateSetting()` |
| Persistence | ✅ Saves to backend via API mutations |
| Tabs | ✅ General, Tenant, Features, Security, Notifications, Maintenance |
| RBAC | ✅ Gated by `RequirePermission` |
| Loading/Error | ✅ Both states with spinner and error card |
| Dark mode | ✅ |

**Issues:**
1. **Tenant tab** — all fields (org name, brand color, support phone, address) are stored in local state only, never persisted to API. "Settings saved successfully" message is misleading for these fields.
2. **Notification tab** — channel toggles are local state only, never saved
3. **Date Format** field in General tab has no corresponding API setting key
4. **Service Status** in Maintenance tab is hardcoded ("Connected to mosquitto://localhost:1883", "PostgreSQL 16 — 2.3 GB used")
5. **Backup Frequency** is local state only, not persisted
6. Support Email field is editable but has no API setting key wired

**Verdict:** Partially Functional (backend integration works for general/security/maintenance settings; tenant, notifications, and backup fields are UI-only)

## Admin Pages

### ⚡ Admin `/admin`

| Check | Result |
|-------|--------|
| RBAC | ✅ Gated by `RequirePermission` |
| Navigation | ✅ Links to all 6 admin sections |
| System Overview stats | ⚠️ **Hardcoded** (v0.13.0, 4 users, 14d 6h uptime, 3 alerts) |
| Dark mode | ✅ |

**Issues:**
1. "Active Users", "System Uptime", "Pending Alerts" are hardcoded, not fetched from API
2. Platform version is hardcoded as "v0.13.0"

**Verdict:** Partially Functional (functions as a navigation hub, but stats are static)

### ✅ API Keys `/admin/api-keys`

| Check | Result |
|-------|--------|
| Real API | ✅ `useApiKeys()`, `useCreateApiKey()`, `useRevokeApiKey()`, `useDeleteApiKey()` |
| Create/Revoke/Delete | ✅ Full lifecycle with confirmation dialogs |
| Created key banner | ✅ Shows full key once, auto-dismisses after 120s |
| Search | ✅ Client-side search |
| Summary cards | ✅ Total/Active/Revoked counts |
| Loading/Error/Empty | ✅ All states |
| Dark mode | ✅ |

**Verdict:** Production Ready

### ✅ Notification Rules `/admin/notification-rules`

| Check | Result |
|-------|--------|
| Real API | ✅ `useNotificationRules()`, `useUpdateNotificationRule()` |
| Inline editing | ✅ Severity, Channels, Role prefs, Cooldown |
| Save all changes | ✅ Detects diffs, saves changed rules sequentially |
| Success/error feedback | ✅ Toast messages with auto-dismiss |
| Toggle enable/disable | ✅ Optimistic local state |
| Loading/Error/Empty | ✅ All states |
| Dark mode | ✅ |

**Verdict:** Production Ready

### ⚡ Platform Health `/admin/health`

| Check | Result |
|-------|--------|
| API health | ✅ `useApiHealth()` — real API health endpoint |
| Simulator restart | ✅ `useSimulatorRestart()` — real API mutation |
| Service cards | ⚠️ Bridge, MQTT, Database, Simulator — **all hardcoded** as "healthy" |
| Metrics | ❌ All service metrics show "—" (placeholder) |
| Dark mode | ✅ |
| Loading/Error | ✅ |

**Issues:**
1. Bridge, MQTT, Database, and Simulator services are defined in a `staticServices` array with hardcoded "healthy" status
2. All metrics (Events/sec, Connected Devices, Messages/sec, etc.) show "—"
3. Only the API service gets real health data from the backend
4. Uptime values for static services are hardcoded constants (345600, 518400, etc.)

**Fix:** Add health endpoints for bridge, MQTT, database, and simulator. Replace static service definitions with real API queries.

### ✅ Audit Log `/audit-log`

| Check | Result |
|-------|--------|
| Real API | ✅ `useAuditLogs()` with server-side filtering |
| Local store merge | ✅ Merges local Zustand entries with API data |
| Search | ✅ Server-side text search |
| Action filter | ✅ Server-side action type filter |
| CSV Export | ✅ Fetches up to 10k entries, merges local, downloads CSV |
| Detail drawer | ✅ Full detail panel with metadata, user info, network |
| Pagination | ✅ Working Previous/Next |
| Loading/Error/Empty | ✅ All states |
| Dark mode | ✅ |
| RBAC | ✅ Gated by `RequirePermission` |

**Issues:**
- Summary "Filtered" count always shows the same as "Total Entries" (bug in display logic — should show filtered count)
- CSV export uses client-side generation for large datasets (10k rows)

**Verdict:** Production Ready

---

## User Management

### ✅ Users `/users`

| Check | Result |
|-------|--------|
| Real API | ✅ `useUsers()`, `useCreateUser()`, `useUpdateUser()`, `useDeactivateUser()` |
| Search | ✅ Server-side search |
| Filters | ✅ Role + Status filters |
| Pagination | ✅ Working Previous/Next |
| Create user dialog | ✅ Full form with validation, role selection |
| Edit role | ✅ Quick inline role change dropdown |
| Activate/Deactivate | ✅ Toggle with confirmation |
| Summary cards | ✅ Total/Active/Inactive/Roles breakdown |
| Loading/Error/Empty | ✅ All states |
| RBAC | ✅ Gated by `RequirePermission` |
| Dark mode | ✅ |

**Issues:**
- "Invite User" button exists with no implementation

**Verdict:** Production Ready

### ✅ Roles `/roles`

| Check | Result |
|-------|--------|
| Real API | ✅ `useRoles()`, `useRole()`, `useGrantPermission()`, `useRevokePermission()` |
| Permission matrix | ✅ 14 resources × 5 actions with toggle buttons |
| Inline toggle | ✅ Grants/revokes permissions via API |
| Role summary cards | ✅ Shows accessible resources per role |
| Loading/Error/Empty | ✅ All states |
| RBAC | ✅ Gated by `RequirePermission` |
| Audit logging | ✅ Writes audit entries on permission changes |
| Dark mode | ✅ |

**Verdict:** Production Ready

---

## Notifications

### ✅ Notifications `/notifications`

| Check | Result |
|-------|--------|
| Real API | ✅ `useNotifications()`, `useMarkNotificationRead()`, `useMarkAllNotificationsRead()` |
| Filters | ✅ Read status + Category dropdowns |
| Simulated notifications | ✅ Merges in-session simulated notifications |
| Mark read | ✅ Both single and mark-all-read wired to API |
| Pagination | ✅ Working Previous/Next |
| Loading/Error/Empty | ✅ All states |
| Dark mode | ✅ |

**Verdict:** Production Ready

---

## Utility Pages

### ✅ Profile `/profile` (v1.5.3)

| Check | Result |
|-------|--------|
| Personal info | ✅ Can edit name/email |
| Persistence | ✅ `useUpdateProfile()` → `PUT /api/auth/me` with duplicate email checking (409 conflict) |
| Password change | ✅ `useChangePassword()` → `POST /api/auth/change-password` with current password verification |
| MFA setup | ✅ Full wizard: password → TOTP secret → QR code → verify → enable |
| MFA disable | ✅ Disable with password verification + optional code |
| Notification preferences | ⚠️ Visual-only toggles (tracked as future work — needs notification preferences API) |
| Audit logging | ✅ Creates audit entries for profile and password changes |
| Loading/error/success | ✅ Mutation loading states, error display, success confirmation |
| Dark mode | ✅ |
| Responsive | ✅ |

**Verdict:** Production Ready (notification prefs remain UX-only, documented as remaining debt)

### ⚡ Unauthorized `/unauthorized`

Static page, no issues. Serves its purpose.

### ✅ Redirect `/` (root)

Redirects to `/login`. No issues.

---

## Summary

### By Status

| Status | Count | Pages |
|--------|-------|-------|
| ✅ Production Ready | 20 | Login, Devices, Device Detail, Alerts, Events, Reports, Diagnostics, API Keys, Notification Rules, Audit Log, Users, Roles, Notifications, Estates, Sites, Unauthorized, Root, **Forgot Password**, **MFA**, **Profile** |
| ⚡ Partially Functional | 3 | Dashboard, Settings, Admin, Platform Health |
| 🟡 Mock Data | 0 | None |
| 🔴 Placeholder | 2 | Forgot Password, MFA |

### Priority-Ordered Fix List (Updated v1.5.3)

| Priority | Page | Issue | Est. Effort |
|----------|------|-------|------------|
| **P0** | Dashboard | No API endpoint for production dashboard data — falls back to mock values without simulator | 1-2 days |
| ~~**P0**~~ | ~~Forgot Password~~ | ~~Form submits but sends no email~~ | ~~0.5 day~~ ✅ **Done v1.5.3** |
| ~~**P0**~~ | ~~MFA~~ | ~~Any 6-digit code logs you in without verification~~ | ~~0.5 day~~ ✅ **Done v1.5.3** |
| ~~**P1**~~ | ~~Profile~~ | ~~Name/email/password changes are local-only, never persisted~~ | ~~0.5 day~~ ✅ **Done v1.5.3** |
| **P1** | Settings (Tenant tab) | All tenant/org fields are UI-only, never saved | 0.5 day |
| **P1** | Settings (Notifications tab) | Channel toggles are visual-only | 0.25 day |
| **P2** | Platform Health | 4 of 5 services have hardcoded health status with placeholder metrics | 1-2 days |
| **P2** | Admin Page | Overview stats (users, uptime, alerts) are hardcoded | 0.5 day |
| **P2** | Reports | "Schedule Report" is coming-soon, recent exports are mock | 1-2 days |
| **P3** | Alerts | "Previous" pagination button is permanently disabled | 0.25 day |
| **P3** | Dashboard | Wire pagination properly in devices table | 0.25 day |

### Effort Summary (Updated v1.5.3)

| Category | Est. Effort |
|----------|------------|
| 🔴 Critical (P0) — blocks production use | 1–2 days (was 2–3) |
| 🟡 High (P1) — functional gaps | 0.75 days (was 1.25) |
| 🟢 Medium (P2) — polish gaps | 2.5–4.5 days |
| 🔵 Low (P3) — minor bugs | 0.5 days |
| **Total** | **4.75–7.75 days (was 6.25–9.25)** |

### Gating Verdict (Updated v1.5.3)

The application has **three remaining blockers** before v1.6.0 E2E validation:

1. ~~**Core auth flows incomplete** (Forgot Password, MFA verification)~~ ✅ **Fixed v1.5.3**
2. **Dashboard provides no real value without simulator mode** — no API summary endpoint
3. **Three key user actions don't persist** (Tenant settings, Notification preferences, Backup config)

Page status improvements: 3 pages moved from 🔴/⚡ → ✅ (Forgot Password, MFA, Profile).
