---
name: sprint-6-rbac-completion
description: Sprint 6 delivered — full RBAC with user/role management, route guards, audit log, and demo role switching
metadata:
  type: project
---

Sprint 6 (User Management / RBAC) was completed on 2026-07-03.

**Delivered:**
- Permission matrix in `@/lib/permissions` — 4 roles × 14 resources × 5 actions
- Auth store with real `hasPermission()`/`hasRole()`, `loginAsRole()` for instant demo switching
- Sidebar filtered by role permissions (Admin: 13, Support: 10, Customer: 5)
- `AuthGuard` — redirects unauthenticated to /login; `RequirePermission` — shows Access Denied for unauthorized roles
- `/users` — list, create, search/filter, inline role change, activate/deactivate, audit logging
- `/roles` — role summary cards, expandable permission matrix with toggles
- `/audit-log` — live store, search, action filter, CSV export, pagination
- `/settings` — tabbed UI (General/Security/Notifications/Maintenance), mock fields
- `/profile` — live auth data, personal info edit, password change with validation
- Login page — 4 quick-login role cards + standard email/password form
- Header — role badge, "Switch Role (Demo)" modal, user dropdown menu

**Key architectural decisions:**
- `@/lib/permissions` as pure functions (no React dependency) — single source of truth for RBAC
- Permission matrix is client-side only; toggles on `/roles` are non-persistent (simulated for demo)
- Audit store is Zustand in-memory with seed data — entries persist only in session
- Demo accounts are predefined in auth-store with matching email→role mapping

**Known issues:**
- Permission toggles on Roles page are client-side only (not persisted to real API)
- No backend API — all user/role/audit data is mock or in-memory

**Do not start Sprint 7 without explicit instruction.**
