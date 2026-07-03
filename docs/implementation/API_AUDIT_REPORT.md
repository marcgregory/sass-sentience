# API Audit Report — RC3 Phase 3

**Date:** 2026-07-03
**Scope:** All 10 API route groups across 12 audit dimensions
**Status:** Complete

---

## Audit Results Summary

| Dimension | Verdict | Issues |
|-----------|---------|--------|
| HTTP Status Codes | ✅ Mostly correct | 1 inconsistency |
| Error Response Format | ✅ Consistent | 0 issues |
| Zod Validation | ✅ Good coverage | 2 gaps |
| Authentication | ✅ Properly enforced | 0 issues |
| RBAC Enforcement | ❌ Major gaps | 4 critical, 3 medium |
| Pagination | ✅ Consistent pattern | 0 issues |
| Filtering | ✅ Good coverage | 2 missing on alerts |
| Sorting | ✅ Consistent | 0 issues |
| Search | ⚠️ Partial | 2 gaps |
| Transactions | ❌ None used | Noted for production |
| Response Shapes | ⚠️ 2 inconsistencies | Minor |
| Documentation | ⚠️ Partial | 4 undocumented areas |

**Overall:** 14 issues found (4 critical, 3 medium, 7 low)

---

## 1. HTTP Status Codes — ✅ (1 inconsistency)

All endpoints return appropriate HTTP status codes:

| Status | Usage | Correct? |
|--------|-------|----------|
| 200 | Success (list, detail, update, summary) | ✅ |
| 201 | Created (users POST, reports POST, roles/permissions POST) | ✅ |
| 204 | Deleted (roles/permissions DELETE) | ✅ |
| 400 | Validation error (Zod parse failure) | ✅ |
| 401 | Missing/invalid auth, bad credentials | ✅ |
| 403 | Forbidden (wrong role, deactivated account) | ✅ |
| 404 | Resource not found | ✅ |
| 409 | Email conflict (users POST) | ✅ |
| 429 | Rate limited (error handler has the branch, but no rate limiter installed) | ⚠️ Unused |
| 500 | Internal error fallback | ✅ |

**Issue #1 (Low):** `DELETE /api/users/:id` returns `200` with body `{ id, isActive }` (soft delete), while `DELETE /api/roles/:id/permissions` returns `204` with no body. Both are valid patterns but inconsistent with each other. The users endpoint behavior is actually preferred for soft-deletes (returning the new state).

---

## 2. Error Response Format — ✅ Consistent

All errors follow the `ApiErrorResponse` interface:
```typescript
{ message: string; code: string; details?: unknown }
```

The only exception is `requireAuth` and `requireRole` middleware which inline their error responses, but they still follow the same format.

**Defined error codes:**

| Code | Source |
|------|--------|
| `VALIDATION_ERROR` | Zod validation errors |
| `NO_AUTH_HEADER` | Missing Authorization header |
| `TOKEN_EXPIRED` | Expired JWT |
| `INVALID_TOKEN` | Bad/malformed JWT |
| `RATE_LIMITED` | Rate limited (unused — no rate limiter installed) |
| `INTERNAL_ERROR` | Unhandled server errors |
| `INVALID_CREDENTIALS` | Bad login email/password |
| `ACCOUNT_DISABLED` | Deactivated user login attempt |
| `NOT_FOUND` | Resource not found |
| `FORBIDDEN` | Insufficient role permissions |
| `UNAUTHORIZED` | Missing or invalid auth |
| `EMAIL_CONFLICT` | Duplicate email on user creation |

---

## 3. Zod Validation — ✅ Good Coverage (2 gaps)

### What's validated:
- **Auth login:** `email` (z.string().email()), `password` (z.string().min(1))
- **Create user:** `email` (email), `password` (min 6), `name` (min 1), `roleId` (uuid)
- **Update user:** All fields optional with proper types
- **Update device:** `name`, `status` (enum), `notes`, `tags`, `lastMaintenance`
- **Update alert:** `status` (enum: open/acknowledged/resolved), `resolution`, `acknowledgedBy` (uuid), `resolvedBy` (uuid)
- **Create report:** `name` (min 1), `type` (enum), `format` (enum), `dateRangeStart/End` (string), `filters` (optional object)
- **Grant permission:** `resource` (min 1), `action` (min 1)

### Issues:

**Issue #2 (Medium):** `PATCH /api/users/:id` validates `roleId` as `z.string().uuid()` but does NOT verify the role exists. If a non-existent UUID is passed, it will hit a PostgreSQL foreign key constraint error (500) instead of returning a proper 400/404.

**Issue #3 (Low):** `PATCH /api/settings/:key` uses `z.any()` for the value. While appropriate for a generic key-value store, users could set any JSON type (arrays, objects, booleans) where a number was expected (e.g. `password_min_length`). Consider type-specific validators per known key.

---

## 4. Authentication — ✅ Properly Enforced

| Endpoint Group | Auth Required | Notes |
|----------------|---------------|-------|
| `GET /api/health` | ❌ Public | Correct |
| `POST /api/auth/login` | ❌ Public | Correct |
| `GET /api/auth/me` | ✅ JWT verify in handler | Correct |
| All other endpoints | ✅ `requireAuth` via preHandler | Correct |

No unauthenticated endpoints are missing auth guards.

---

## 5. RBAC Enforcement — ❌ Major Gaps (4 critical, 3 medium)

### Currently restricted to admin:
- `POST /api/users` — ✅ `requireRole("admin")`
- `DELETE /api/users/:id` — ✅ `requireRole("admin")`
- `POST /api/roles/:id/permissions` — ✅ `requireRole("admin")`
- `DELETE /api/roles/:id/permissions` — ✅ `requireRole("admin")`

### Critical Gaps:

**Issue #4 (Critical):** `PATCH /api/settings/:key` — no `requireRole("admin")`. Any authenticated user can update platform settings (maintenance mode, security settings, feature flags).

```typescript
// apps/api/src/routes/settings.ts:18
app.patch("/:key", { preHandler: [requireAuth] }, async (request, reply) => {
```

**Issue #5 (Critical):** `PATCH /api/users/:id` — no `requireRole("admin")`. Any authenticated user can change another user's role, name, or active status — including promoting themselves to admin.

```typescript
// apps/api/src/routes/users.ts:167
app.patch("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
```

**Issue #6 (Critical):** `PATCH /api/devices/:id` — no role restriction. Support, installer, and customer roles should not have equal write access.

**Issue #7 (Critical):** `PATCH /api/alerts/:id` — no role restriction. Acknowledge/resolve actions should require support or admin role.

### Medium Gaps:

**Issue #8 (Medium):** `GET /api/users` — no role restriction. Customer role users can list all platform users (should be self-only or admin-only).

**Issue #9 (Medium):** `GET /api/events` — no data isolation. A customer can see events across all estates, not just their own. Requires estate-level filtering by customer association.

**Issue #10 (Medium):** `GET /api/devices` — no data isolation. Customers can see all devices, not just those in their estates.

---

## 6. Pagination — ✅ Consistent Pattern

All list endpoints use the same pagination pattern:

```typescript
const page = Math.max(1, parseInt(query.page ?? "1"));
const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20")));
const offset = (page - 1) * limit;
```

Response shape (all consistent):
```typescript
{
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

Default: page=1, limit=20, max=100. ✅

---

## 7. Filtering — ✅ Good Coverage (2 gaps)

| Endpoint | Filters |
|----------|---------|
| Devices | `status`, `type`, `site_id`, `estate_id`, `search` |
| Events | `severity`, `category`, `device_id`, `estate_id`, `start_date`, `end_date`, `search` |
| Alerts | `severity`, `status`, `category`, `device_id`, `estate_id` |
| Users | `search`, `role`, `status` (active/inactive) |
| Audit | `action`, `resource`, `search`, `start_date`, `end_date` |
| Roles | None (only 4 roles) |
| Reports | None for list (only page/limit/sort/order) |

**Issue #11 (Low):** Alerts — missing `search` and `start_date`/`end_date` filters. For a production alert workflow, users need to search by title/description and filter by date range.

**Issue #12 (Low):** Reports list — no filtering by `type`, `status`, or `date_range`. Users can't filter the list of generated reports.

---

## 8. Sorting — ✅ Consistent

All endpoints support `sort` and `order` params with sensible defaults:

| Endpoint | Sortable Fields | Default Sort | Default Order |
|----------|----------------|--------------|---------------|
| Devices | `name`, `createdAt` | `createdAt` | `asc` |
| Events | `title`, `occurredAt` | `occurredAt` | `desc` |
| Alerts | `title`, `occurredAt` | `occurredAt` | `desc` |
| Users | `email`, `name` | `name` | `asc` |
| Audit | `action`, `createdAt` | `createdAt` | `desc` |
| Reports | `name`, `createdAt` | `createdAt` | `desc` |

Gap: Sort field values are not validated. Passing `sort=invalid` falls through to the default. Not a crash, but silent.

---

## 9. Search — ⚠️ Partial (2 gaps)

| Endpoint | Search Targets |
|----------|---------------|
| Devices | ✅ `name` only |
| Events | ✅ `title`, `description` |
| Alerts | ❌ No search |
| Users | ✅ `name`, `email` |
| Audit | ✅ `userName`, `description`, `resource` |

**Issue #13 (Low):** Device search does not include `serialNumber` or `macAddress`. Support engineers often search by serial number.

**Issue #14 (Low):** No search on alerts endpoint.

---

## 10. Transactions — ❌ Not Used

No Drizzle transactions (`db.transaction()`) are used in any route handler:

- `GET /api/devices/:id` — 3 sequential queries (device → site → estate) without isolation. If a site is deleted between queries, the response is inconsistent.
- `POST /api/reports` — Insert + immediate update as separate queries.
- Seed script — All inserts are sequential, no rollback on failure.

**Recommendation:** Not critical for dev with low concurrency, but add transactions to write operations that span multiple tables before production.

---

## 11. Response Shape Consistency — ⚠️ (2 inconsistencies)

**Issue #15 (Low):** `PATCH /api/devices/:id` returns the raw device row without joined `siteName`/`estateName`, while `GET /api/devices/:id` includes these joins. After updating a device, the response shape differs from the detail endpoint.

**Issue #16 (Low):** `POST /api/reports` returns the report record directly. All list endpoints wrap in `{ data: [...], pagination: {...} }`. Create endpoints return the item directly — this is a valid REST pattern but slightly inconsistent with `POST /api/users` which does a second query to join the role name.

---

## 12. Documentation / OpenAPI — ⚠️ Partial

**Documented in `docs/backend-api.md`:**
- ✅ Health, Auth, Users, Roles, Devices, Events, Alerts, Reports, Settings
- ✅ Query parameters overview
- ✅ Demo accounts and seed data
- ✅ Error format documentation

**Not documented:**
- ❌ `/api/roles/:id/permissions` — POST and DELETE endpoints
- ❌ `/api/reports/summary` — query parameters, response shape
- ❌ `/api/reports/trends` — query parameters, response shape
- ❌ `/api/audit-logs` specific filters (`action`, `resource`, `search`, date range)
- ❌ No OpenAPI/Swagger spec generation

---

## Issues Found: Complete List

| # | Severity | Endpoint | Issue | Fix |
|---|----------|----------|-------|-----|
| 4 | **CRITICAL** | `PATCH /api/settings/:key` | No admin role check — any user can change settings | Add `requireRole("admin")` |
| 5 | **CRITICAL** | `PATCH /api/users/:id` | No admin role check — any user can change roles/promote self | Add `requireRole("admin")` |
| 6 | **CRITICAL** | `PATCH /api/devices/:id` | No role restriction — any user can update devices | Add role check (admin/support) |
| 7 | **CRITICAL** | `PATCH /api/alerts/:id` | No role restriction — any user can acknowledge/resolve | Add role check (admin/support) |
| 2 | **MEDIUM** | `PATCH /api/users/:id` | `roleId` uuid not verified to exist | Add role existence check |
| 8 | **MEDIUM** | `GET /api/users` | No role restriction — customer can list all users | Add admin-only or self-scoped |
| 9 | **MEDIUM** | `GET /api/events` | No data isolation per customer | Add estate-level customer scoping |
| 10 | **MEDIUM** | `GET /api/devices` | No data isolation per customer | Add estate-level customer scoping |
| 1 | LOW | `DELETE /api/users/:id` | Returns 200 instead of 204 for soft-delete (inconsistent) | Keep as-is (preferred for soft-delete) |
| 3 | LOW | `PATCH /api/settings/:key` | `z.any()` allows invalid value types | Add per-key type validators |
| 11 | LOW | `GET /api/alerts` | Missing `search`, `start_date`, `end_date` filters | Add filter support |
| 12 | LOW | `GET /api/reports` | No filtering on generated report list | Add type/status/date filtering |
| 13 | LOW | `GET /api/devices` | Search doesn't include serialNumber or macAddress | Extend search coverage |
| 14 | LOW | `GET /api/alerts` | No search support | Add search across title/description |
| 15 | LOW | `PATCH /api/devices/:id` | Response shape differs from detail endpoint | Add site/estate name joins |
| 16 | LOW | `POST /api/reports` | Response has no `id` pagination wrapper (valid, but pattern varies) | Document as intentional |

---

## RBAC Matrix — Current vs Required

| Endpoint | Current | Required |
|----------|---------|----------|
| `GET /api/users` | Any auth user | Admin only |
| `GET /api/users/:id` | Any auth user | Admin, or self |
| `POST /api/users` | Admin only | Admin only ✅ |
| `PATCH /api/users/:id` | Any auth user | **Admin only** |
| `DELETE /api/users/:id` | Admin only | Admin only ✅ |
| `PATCH /api/settings/:key` | Any auth user | **Admin only** |
| `PATCH /api/devices/:id` | Any auth user | **Admin or Support** |
| `PATCH /api/alerts/:id` | Any auth user | **Admin or Support** |
| `GET /api/devices` | Any auth user | Add **customer data isolation** |
| `GET /api/events` | Any auth user | Add **customer data isolation** |

---

## Build Status

- `pnpm lint`: ✅ Clean — all 8 packages pass (including API package after RBAC changes)
- `pnpm build`: ✅ Success — 26 static pages generated, zero errors

---

## Recommended Fix Priority

### Phase 3a — Fix Critical RBAC Gaps (4 fixes)

1. `PATCH /api/settings/:key` — add `requireRole("admin")`
2. `PATCH /api/users/:id` — add `requireRole("admin")`
3. `PATCH /api/devices/:id` — add role check (admin/support only)
4. `PATCH /api/alerts/:id` — add role check (admin/support only)

### Phase 3b — Fix Medium Issues (2 fixes)

5. `PATCH /api/users/:id` — validate roleId exists before updating
6. `GET /api/users` — add `requireRole("admin")`

### Phase 3c — Documentation & Low Priority (tracked as debt)

7. Document undocumented endpoints in `docs/backend-api.md`
8. Extend alert filters (search, date range)
9. Extend device search (serial number)
10. Track customer data isolation and transactions as technical debt

---

## Remaining API Debt (tracked in TECHNICAL_DEBT.md)

- No OpenAPI/Swagger spec
- Customer-level data isolation not implemented (customers can see all data)
- No transactions on multi-query operations
- No rate limiting (`@fastify/rate-limit`)
- SHA-256 password hashing (needs bcrypt/argon2)
- No structured request logging middleware
- CORS `origin: true` allows any origin
- No refresh token mechanism (24h JWT only)
- No WebSocket event emission from REST mutations (alerts acknowledged via API don't emit socket events)
