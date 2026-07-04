# v1.0.0-rc.3 — Release Summary

**Date:** 2026-07-04
**Tag:** `v1.0.0-rc.3`

---

## What's Changed

### RC3 Phase 1 — Application Audit
Audited all 26 pages for mock data leaks, state management violations, dead code, and missed optimistic updates. Fixed 6 mutations lacking rollback, deleted dead `use-live-devices.ts`, removed mock seed data from audit store.

### RC3 Phase 2 — UX Audit & Fixes
Hardened loading, empty, and error states across 20 pages. Fixed 14 accessibility issues (ARIA labels, radio roles, form validation). Added mutation feedback on user/role/settings saves.

### RC3 Phase 3 — API Audit & RBAC Hardening
Patched **5 RBAC gaps** (4 critical, 1 medium): settings/ users/ devices/ alerts mutations now properly gated by role. Full API audit across 12 dimensions.

### RC3 Phase 4 — Performance Audit
Dashboard JS reduced from 222 kB → **123 kB** via Recharts lazy-loading. Shared JS chunk at **102 kB**. Added database indexes, 30s staleTime on non-critical queries, 100ms socket invalidation debounce.

### RC3 Phase 5 — Security Audit
- **SHA-256 → bcrypt** password hashing (cost 12)
- **JWT secret required** — no default fallback
- **Real auth** — login calls `POST /api/auth/login`, JWT stored in Zustand, injected by api-client
- **Socket.IO JWT auth** — handshake verifies token, reconnects on login/logout
- 18 issues triaged (8 fixed, 10 tracked as debt)

### RC3 Phase 6 — Documentation & Release Readiness
All docs aligned with implementation. Production Readiness Report delivered. Final build verified: `pnpm lint` ✅, `pnpm build` ✅ (26/26 pages).

---

## Build Output

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      128 B         102 kB
├ ○ /dashboard                           11.3 kB         126 kB
├ ○ /devices                             4.07 kB         132 kB
├ ○ /alerts                              8.31 kB         135 kB
├ ○ /events                              8.62 kB         134 kB
├ ○ /reports                              122 kB         244 kB
├ ○ /users                               4.14 kB         137 kB
├ ○ /roles                                3.3 kB         136 kB
├ ○ /settings                            8.91 kB         138 kB
├ ○ /admin/*                          3.3–5.3 kB     122–134 kB
└ ○ /login                               6.11 kB         119 kB
+ First Load JS shared by all             102 kB
```

---

## Known Limitations (v1.0.0-rc.3)

- 4 pages still use partial mock data: API Keys, Notification Rules, Notifications, device detail tabs
- ~20 icon-only buttons missing `aria-label`
- Customer-level data isolation not implemented
- No rate limiting on API
- No E2E tests
- PDF export and report scheduling are placeholders

---

## Next

**Sprint 9: Event Model Refactor** — DeviceIdentity type, event codes, EventClassifier, heartbeat events, and simulator persistence.
