# API Coverage

> **Four-layer coverage tracker.** Maps every feature to its frontend, backend, database, and test implementation status.
> Use this to track progress through the v1.5.x product completion milestones.
> Last updated: 2026-07-16 (v1.8.0 — Fleet Operations Foundation delivered)

---

## Definitions of Done

### ✅ Complete

| Layer | Criteria |
|-------|----------|
| **Frontend** | Uses production API via TanStack Query hook. No mock/hardcoded data. Handles loading, error, and empty states. Dark mode and responsive verified. |
| **Backend** | API endpoint implemented with Zod validation, authentication, and RBAC enforcement. Returns consistent error format. |
| **Database** | Schema defined with Drizzle migration. Proper indexes for read patterns. Foreign key constraints. Seed data exists. |
| **Tests** | Covered by UI regression suite (Playwright) or full-stack E2E validation. |

### ⚠️ Partial

| Layer | Criteria |
|-------|----------|
| **Frontend** | Page exists but uses mock/hardcoded data, or has UI-only mutations that don't persist. |
| **Backend** | Endpoint exists but missing validation, RBAC, or has known gaps (e.g. missing filters). |
| **Database** | Table exists but missing indexes, constraints, or seed data. |
| **Tests** | Partial coverage — some flows tested, not all states covered. |

### 🔴 Missing

| Layer | Criteria |
|-------|----------|
| **Frontend** | No real page component, or page is a non-functional placeholder. |
| **Backend** | No API endpoint exists for this feature. |
| **Database** | No table or schema defined for this feature's data. |
| **Tests** | No test coverage. |

### — Not Applicable

The layer does not apply to this feature (e.g. CSV/PDF export has no database table).

---

## Coverage Table

| Feature | Frontend | Backend | Database | Tests | Notes | Milestone |
|---------|----------|---------|----------|-------|-------|-----------|
| **Authentication** |
| Login | ✅ | ✅ | ✅ | ⚠️ | Real JWT via `POST /api/auth/login` | v1.0.0 |
| Forgot Password | ✅ | ✅ | ✅ | 🔴 | Secure token, email abstraction, no user enumeration | v1.5.3 |
| MFA Setup/Verify | ✅ | ✅ | ✅ | 🔴 | TOTP via otplib, QR code, login challenge flow | v1.5.3 |
| Password Reset | ✅ | ✅ | ✅ | 🔴 | Token verification, expiry, single-use, DB transaction | v1.5.3 |
| Change Password | ✅ | ✅ | ✅ | 🔴 | Current password verification, bcrypt re-hash | v1.5.3 |
| **Entities** |
| Estates | ✅ | ✅ | ✅ | 🔴 | Full CRUD via API, create dialog, delete with protection | v1.5.1 |
| Sites | ✅ | ✅ | ✅ | 🔴 | Full CRUD via API, estate filter, delete with protection | v1.5.1 |
| **Devices** |
| Device List | ✅ | ✅ | ✅ | ⚠️ | Full CRUD, search, filters, pagination | v1.0.0 |
| Device Detail | ✅ | ✅ | ✅ | 🔴 | 6 tabs, firmware, I/O, config from API | v1.0.0 |
| Device Diagnostics | 🔴 | 🔴 | 🔴 | 🔴 | Placeholder tools, hardcoded results | **v1.5.2** |
| **Telemetry** |
| Live Dashboard | ✅ | ✅ | ✅ | 🔴 | Simulator + live device store | v1.0.0 |
| Dashboard Summary | ⚠️ | 🔴 | 🔴 | 🔴 | Mock fallback without simulator | **v1.5.4** |
| Distribution Charts | ✅ | ✅ | ✅ | 🔴 | Battery/signal/temp from live store | v1.0.0 |
| **Alerts & Events** |
| Alerts | ✅ | ✅ | ✅ | ⚠️ | CRUD, acknowledge/resolve, filters | v1.0.0 |
| Events | ✅ | ✅ | ✅ | ⚠️ | Full filtering, search, pagination | v1.0.0 |
| **Reports** |
| Report Summary | ✅ | ✅ | ✅ | ⚠️ | API-backed with live overlay | v1.0.0 |
| Report Trends | ✅ | ✅ | ✅ | ⚠️ | Time series, availability charts | v1.0.0 |
| CSV Export | ✅ | ⚠️ | — | ⚠️ | Client-side generation (no backend endpoint) | v1.0.0 |
| PDF Export | ✅ | — | — | 🔴 | Client-side via html2canvas + jspdf | v1.3.0 |
| Schedule Reports | 🔴 | 🔴 | 🔴 | 🔴 | "Coming Soon" placeholder card | **v1.5.4** |
| **User Management** |
| Users CRUD | ✅ | ✅ | ✅ | ⚠️ | List, create, edit, deactivate, pagination | v1.0.0 |
| Roles & Permissions | ✅ | ✅ | ✅ | ⚠️ | Matrix with inline grant/revoke toggles | v1.0.0 |
| Profile | ✅ | ✅ | ✅ | 🔴 | Name/email/password/MFA persisted via API | v1.5.3 |
| **Admin** |
| API Keys | ✅ | ✅ | ✅ | ✅ | Full lifecycle, masked display | v1.0.0 |
| Notification Rules | ✅ | ✅ | ✅ | ✅ | Edit, save, role-based preferences | v1.0.0 |
| Audit Log | ✅ | ✅ | ✅ | ✅ | Server-side filters, pagination, CSV export | v1.0.0 |
| Platform Health | ⚠️ | ⚠️ | 🔴 | 🔴 | 4 of 5 services hardcoded | **v1.5.4** |
| Admin Overview | ⚠️ | 🔴 | 🔴 | 🔴 | Stats are hardcoded strings | **v1.5.4** |
| **Settings** |
| General Settings | ✅ | ✅ | ✅ | ⚠️ | Platform name, timezone persisted via API | v1.0.0 |
| Security Settings | ✅ | ✅ | ✅ | ⚠️ | Password policy, session timeout, MFA toggle | v1.0.0 |
| Maintenance Settings | ✅ | ✅ | ✅ | ⚠️ | Data retention, maintenance mode persisted | v1.0.0 |
| Tenant Settings | ⚠️ | 🔴 | 🔴 | 🔴 | UI-only, not persisted | **v1.5.4** |
| Notification Channels | ⚠️ | 🔴 | 🔴 | 🔴 | UI-only toggles, not persisted | **v1.5.4** |
| **Notifications** |
| Notification List | ✅ | ✅ | ✅ | ✅ | Filters, pagination, mark read | v1.0.0 |
| Real-time Feed | ✅ | ✅ | ✅ | 🔴 | Socket.IO + simulated merge | v1.0.0 |
| **Tags & Groups** | | | | | |
| Device Tags | ✅ | ✅ | ✅ | ✅ | Tags column, filter, inline editor | v1.7.0 |
| Device Groups CRUD | ✅ | ✅ | ✅ | ✅ | List/detail pages with pagination, search, RBAC | v1.7.0 |
| Group Device List | ✅ | ✅ | ✅ | ✅ | Server-side pagination, search within group | v1.8.0 |
| Bulk Tag Operations | ✅ | ✅ | ✅ | ✅ | Apply/remove tags to all group members | v1.8.0 |
| Group Membership | ✅ | ✅ | ✅ | ✅ | Bidirectional: device detail shows groups, add/remove | v1.8.0 |
| Group Duplicate | ✅ | ✅ | ✅ | ✅ | Copy name + devices with "(Copy)" suffix | v1.8.0 |
| Group Archive/Restore | ✅ | ✅ | ✅ | ✅ | Soft-delete with `archivedAt`, status filter | v1.8.0 |

---

## Summary by Layer

| Layer | Complete | Partial | Missing | N/A |
|-------|----------|---------|---------|-----|
| **Frontend** | 37 | 4 | 0 | 1 |
| **Backend** | 36 | 2 | 2 | 1 |
| **Database** | 33 | 0 | 6 | 1 |
| **Tests** | 11 | 10 | 17 | 1 |

### Gap Analysis

| Pattern | Count | Features |
|---------|-------|----------|
| All four layers complete (✅✅✅✅) | 10 | API Keys, Notification Rules, Audit Log, **Device Tags**, **Device Groups CRUD**, **Group Device List**, **Bulk Tag Operations**, **Group Membership**, **Group Duplicate**, **Group Archive/Restore** |
| FE+BE+DB complete, tests partial/🔴 | 20 | Login, Device List, Device Detail, Dashboard, Alerts, Events, Reports, Users, Roles, Settings (3), Notifications, **Estates**, **Sites**, **Forgot Password**, **MFA**, **Password Reset**, **Profile**, **Change Password** |
| FE partial, no backend | 4 | Dashboard Summary, Platform Health, Admin Overview, Tenant/Notification Settings |
| Nothing implemented (🔴🔴🔴🔴) | 1 | Schedule Reports |

---

## Implementation Order

Milestones are sequenced by product impact and dependency:

1. **v1.5.1 — Core Entity Management** — Estates, Sites ✅ **Complete** (2026-07-06)
2. **v1.5.2 — Device Diagnostics** ✅ **Complete** (2026-07-06)
3. **v1.5.3 — Account Management** ✅ **Complete** (2026-07-06) — Forgot Password, MFA, Password Reset, Profile
4. **v1.5.4 — Platform Administration** ⬜ **Next** — Dashboard Summary, Platform Health, Admin Overview, Tenant/Notification Settings, Schedule Reports
5. **v1.6.0 — Full-Stack E2E Validation** 🔒 Blocked by v1.5.1–v1.5.4
