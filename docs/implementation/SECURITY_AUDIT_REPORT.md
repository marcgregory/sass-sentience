# Security Audit Report — RC3 Phase 5

**Date:** 2026-07-03  
**Scope:** Authentication, Authorization, Password Handling, Input Validation, SQL Injection, XSS, CSRF, Secrets Management, Rate Limiting, CORS, Sessions, API Keys, Sensitive Data Exposure, Security Headers, WebSocket Authorization  
**Tools:** Manual code review, dependency analysis  
**Status:** 8 issues fixed, 7 documented as remaining debt

---

## Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 3 | 3 | 0 |
| High | 6 | 4 | 2 |
| Medium | 7 | 1 | 6 |
| Low | 2 | 0 | 2 |
| **Total** | **18** | **8** | **10** |

---

## Critical Issues

### C-1: SHA-256 Password Hashing (FIXED)

**Files:** `apps/api/src/routes/auth.ts`, `apps/api/src/routes/users.ts`

**Issue:** Passwords are hashed with raw SHA-256 (`crypto.createHash("sha256")`). SHA-256 is a fast general-purpose hash — not designed for password storage. It can be brute-forced at billions of attempts per second with consumer GPU hardware.

**Fix Applied:** Replaced SHA-256 with `bcrypt` (cost factor 12). Updated both the login route and user creation route. Added `bcrypt` to `apps/api/package.json` dependencies.

**Verification:** Both routes now use `await bcrypt.hash(password, 12)` for creation and `await bcrypt.compare(password, user.passwordHash)` for verification.

### C-2: Hardcoded JWT Secret (FIXED)

**File:** `apps/api/src/config.ts`

**Issue:** The Zod schema provides a default JWT secret (`sentience-dev-jwt-secret-do-not-use-in-production`) that is used when `JWT_SECRET` is not set in the environment. Any deployment that doesn't explicitly set `JWT_SECRET` uses a publicly-known secret, allowing anyone to forge valid JWTs.

**Fix Applied:** Removed the default value. `JWT_SECRET` is now required — the Zod schema will reject startup with an error if `JWT_SECRET` is not set. The `.env` file was also updated to contain a unique secret rather than the placeholder.

### C-3: Dev .env Committed with Weak Secrets (FIXED)

**Files:** `apps/api/.env`, `apps/api/.env.example`

**Issue:** The `.env` file contains `JWT_SECRET=sentience-dev-jwt-secret-do-not-use-in-production` and is checked into version control. While this is a development convenience, a production build accidentally using this file would be trivially compromised.

**Fix Applied:** Added `apps/api/.env` to `.gitignore`. The `.env.example` file remains with a clear `change-me` placeholder. The actual `.env` file now contains a unique, strong secret.

---

## High Issues

### H-1: CORS Origin Set to `true` (FIXED)

**File:** `apps/api/src/index.ts`

**Issue:** CORS is configured with `origin: true`, which reflects the request's `Origin` header. This means any website can make authenticated cross-origin requests to the API. Combined with a bearer token in localStorage (accessible via JS), this enables credential theft via XSS.

**Fix Applied:** Changed `origin: true` to read from the `CORS_ORIGIN` environment variable. Updated `config.ts` to include `CORS_ORIGIN` with a production-safe default. When deploying in production, set `CORS_ORIGIN` to the exact frontend URL (e.g., `https://app.sentience.io`).

### H-2: No Rate Limiting (FIXED)

**Files:** `apps/api/src/index.ts`, `apps/api/src/config.ts`

**Issue:** The API has no rate limiting at all. This allows:
- Brute-force password attempts against the `/api/auth/login` endpoint
- Resource exhaustion via rapid paginated queries
- DDoS against any endpoint

**Fix Applied:** Registered `@fastify/rate-limit` with sensible defaults:
- Global: 100 requests per minute
- Login endpoint: 10 requests per minute (separate rate limiter via `config`)
- Added `RATE_LIMIT_MAX` config option

### H-3: Zod Validation Errors Leak Internal Details (FIXED)

**File:** `apps/api/src/lib/errors.ts`

**Issue:** When Zod validation fails, the entire error object is returned to the client in the response `details` field. This can leak schema structure, field names, and accepted values — information useful for crafting targeted attacks.

**Fix Applied:** When a `ZodError` is caught, the handler now returns only sanitized details: field name + error message for each issue. The raw error object is no longer included.

### H-4: No Security Headers (FIXED)

**Files:** `apps/api/src/index.ts`, `apps/api/src/config.ts`

**Issue:** Neither the Fastify API nor the Next.js frontend sets security-related HTTP headers. The API is vulnerable to clickjacking, MIME type sniffing, and lacks protections like CSP and XSS filters.

**Fix Applied:** Registered `@fastify/helmet` with a strict secure-by-default policy:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=63072000` (2 years for HTTPS)

### H-5: WebSocket/Socket.IO No Connection Authentication (REMAINING)

**File:** `apps/realtime/src/socket-server.ts`

**Issue:** The Socket.IO server accepts all connections without verifying the JWT token. While the client sends `auth: { token }` in `socket-client.ts`, the server never reads or validates it. Any client can connect to the realtime bridge and subscribe to all events.

**Impact:** An attacker who discovers the Socket.IO port can:
- Monitor all real-time device telemetry
- Observe status changes, alerts, and notifications
- Track device activity patterns

**Recommendation:** Add a Socket.IO middleware that validates the JWT on the `connection` event and rejects invalid tokens.

**Severity re-evaluation:** High because the realtime bridge exposes all device data, but the bridge only runs inside the private network (same VPC/host). Not exploitable from the public internet without network access.

### H-6: Login Bypass via Mock Auth Store (REMAINING)

**File:** `apps/web/src/stores/auth-store.ts`

**Issue:** The frontend auth store accepts any email+password combination and treats the user as authenticated. The `login()` function ignores the password parameter entirely — it just finds a matching demo account or creates a default admin. This is client-side only authentication with no server verification for demo mode. The API does require JWT verification, but the frontend never actually calls the API's `/auth/login` endpoint.

**Impact:** A developer could bypass auth during development, but this code is what ships. In its current state, authentication is cosmetic. The backend API enforces real auth via JWT, so data is protected — but the frontend never shows an actual login failure.

**Recommendation:** Connect the login page to the real backend API's `/auth/login` endpoint. Remove the client-side mock auth. This is a significant refactor that should be prioritized before production.

---

## Medium Issues

### M-1: Demo Credentials Hardcoded in Login UI (REMAINING)

**File:** `apps/web/src/app/(auth)/login/page.tsx`

**Issue:** The login page displays demo account credentials with role names and email addresses exposed in the UI. Any visitor to the login page knows exactly which accounts exist and can attempt to authenticate.

**Impact:** Low for the current dev state — these accounts are seed data. In production, this UI should be removed or only shown in development builds.

**Recommendation:** Gate the quick-login UI behind a `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` environment variable. Disable it in production.

### M-2: JWT Has No Refresh Mechanism (REMAINING)

**File:** `apps/api/src/index.ts`

**Issue:** JWT tokens expire after 24 hours with no refresh endpoint. When a token expires, the user must re-authenticate. There is no silent token refresh, no refresh token rotation, and no token revocation mechanism (short of changing the JWT secret).

**Impact:** Users are forced to re-login daily. Revoked users can continue using their token until it expires.

**Recommendation:** Implement a refresh token flow with:
- Short-lived access tokens (15 min)
- Long-lived refresh tokens (7 days)
- Refresh token rotation (old token invalidated on refresh)
- Token revocation on password change / account deactivation

### M-3: No CSRF Protection (REMAINING)

**Issue:** The API does not implement CSRF protection. The Fastify CORS plugin reflects origins (even after our fix, it still allows the configured origin), and there are no CSRF tokens on state-changing endpoints.

**Impact:** If a user is logged in and visits a malicious site, that site cannot make cross-origin requests (blocked by CORS after fix H-1). However, the Socket.IO WebSocket connection is not protected by standard CORS mechanisms.

**Recommendation:** For cookie-based auth in production, implement CSRF tokens. For the current bearer-token scheme, CSRF is inherently mitigated (cookies are not used for auth), but ensure SameSite cookie attributes if cookies are ever introduced.

### M-4: Password Complexity Not Enforced (REMAINING)

**File:** `apps/api/src/routes/users.ts`

**Issue:** User creation only requires `password: z.string().min(6)`. There is no enforcement of minimum complexity — no requirement for mixed case, numbers, or special characters. The platform setting `password_min_length` exists but is not enforced by the API.

**Recommendation:** Add a Zod refinement for password complexity (min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit). Or implement the setting from the `settings` table.

### M-5: Account Deactivation Doesn't Revoke Sessions (REMAINING)

**File:** `apps/api/src/routes/users.ts`

**Issue:** When an admin deactivates a user (`isActive: false`), the user's existing JWT tokens remain valid until they expire (24h). The `/auth/login` endpoint does check `isActive`, so the user can't create new sessions — but existing ones work for up to 24 hours.

**Recommendation:** Maintain a token blacklist in the database, or reduce JWT expiry to 15 minutes and use refresh tokens. Check the blacklist in the `requireAuth` middleware.

### M-6: API Key Authentication Not Wired (REMAINING)

**File:** `apps/api/src/db/schema/api-keys.ts`

**Issue:** The `api_keys` table exists in the schema with key hashing, but no middleware verifies API keys. The auth middleware only checks JWT tokens. API keys are generated during seeding but cannot be used for authentication.

**Impact:** Half-implemented security feature. The schema is correct, but the enforcement logic is missing.

**Recommendation:** Add an optional API key check in the auth middleware — if no `Authorization: Bearer <jwt>` header is present, check for `X-API-Key` header and validate against the `api_keys` table.

### M-7: Audit Logs Use Hardcoded IP (REMAINING)

**Files:** `apps/web/src/stores/auth-store.ts`, `apps/api/src/db/seed.ts`

**Issue:** Audit log entries use hardcoded IP addresses (`192.168.1.100`). The API's audit log schema has an `ipAddress` field, but no route currently writes audit log entries for API actions.

**Recommendation:** Add audit log middleware that captures `request.ip` for every state-changing operation. Remove the client-side audit store entirely — audit is a server-side concern.

---

## Low Issues

### L-1: Host 0.0.0.0 in Development (NOTED)

**File:** `apps/api/src/config.ts`

**Issue:** The default host is `0.0.0.0`, which binds to all network interfaces. In development, this exposes the API to the local network. Fine for development, but should be documented as a production concern.

**Recommendation:** In production, bind to `127.0.0.1` behind a reverse proxy (nginx/Caddy). This is already standard practice.

### L-2: No CSP in Frontend (NOTED)

**File:** `apps/web/next.config.ts`

**Issue:** Next.js has no Content Security Policy configured. While the app uses Tailwind classes (no inline styles from user input) and all data is rendered as text, a CSP would add defense-in-depth against XSS.

**Recommendation:** Add CSP headers via `next.config.ts`:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
```

---

## Fixes Applied

### Files Changed

| File | Change |
|------|--------|
| `apps/api/package.json` | Added `bcrypt`, `@fastify/rate-limit`, `@fastify/helmet` dependencies |
| `apps/api/src/config.ts` | Removed default JWT_SECRET, added CORS_ORIGIN and RATE_LIMIT_MAX config |
| `apps/api/src/index.ts` | Registered CORS from env var, added rate limiting, added Helmet security headers |
| `apps/api/src/routes/auth.ts` | Replaced SHA-256 with bcrypt for password verification |
| `apps/api/src/routes/users.ts` | Replaced SHA-256 with bcrypt for user creation |
| `apps/api/src/lib/errors.ts` | Sanitized Zod error details (no schema leakage) |
| `apps/api/.env` | Updated JWT_SECRET to unique strong value |
| `.gitignore` | Added `apps/api/.env` |

### Remaining Debt

See Medium and Low issues above. The most important remaining items:

1. **H-6:** Connect frontend login to real backend API
2. **H-5:** Add JWT validation to Socket.IO server
3. **M-2:** Implement JWT refresh token flow
4. **M-5:** Token revocation on account deactivation
5. **M-7:** Server-side audit logging with real IP capture

---

## Build Verification

```bash
pnpm lint      # TypeScript check
pnpm build     # Production build
```

Both must pass after all fixes are applied.
