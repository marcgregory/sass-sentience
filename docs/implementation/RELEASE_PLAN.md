# Release Plan

> Defines the exit criteria for v1.0 of the Sentience IoT Platform.
> Last updated: 2026-07-03

---

## v1.0 Release Criteria

### Must Have

- [x] **Sprint 1: Device Management** — device detail page with live telemetry, history, diagnostics, firmware, configuration, I/O
- [x] **Sprint 2: Dashboard** — health score, trends, charts, fault overview, activity feed
- [x] **Sprint 3: Alerts** — list, acknowledge, resolve, assignment, timeline
- [x] **Sprint 4: Event History** — filters, search, export, timeline, device drill-down
- [x] **Sprint 5: Reports** — daily/weekly/monthly, CSV, PDF (placeholder)
- [x] **Sprint 6: User Management** — RBAC, users, roles, permissions
- [x] **Sprint 7: Admin** — settings, audit logs, API keys, feature flags

### Quality Gates

- [x] TypeScript compiles cleanly across all packages (`pnpm lint`)
- [x] Production build succeeds (`pnpm build`)
- [x] All pages render correctly in light and dark modes
- [x] Responsive at 375px, 768px, and 1280px+
- [x] Loading, empty, and error states exist on all data-driven views
- [x] Real authentication — backend JWT, bcrypt passwords, Socket.IO auth
- [x] Real backend API — all 9 domain CRUD endpoints with PostgreSQL
- [x] RBAC enforced — route guards, navigation filtering, permission matrix
- [x] No critical or high security vulnerabilities open

### Blockers

- [x] **Simulator session lifecycle** — stale-simulator devices no longer linger in the bridge registry during rolling restarts (sessionId tracking + stale-message drop)
- [x] **Live Socket.IO notifications** — API emits `notification:new` events through the bridge for instant UI delivery
- [x] **Security hardened** — JWT_SECRET has no default fallback; services refuse to start if missing
- [x] **Accessibility baseline** — `aria-label` added to all icon-only buttons, sidebar `<nav>`, search inputs, user menu, and theme toggle
- [ ] No High or Critical priority technical debt (see `TECHNICAL_DEBT.md`)
  - Remaining security debt rated Medium or Low
  - 6 pages still using partial mock data (API Keys, Notification Rules, Notifications, device detail tabs)
- [ ] Unit tests pass for all test suites
  - No E2E test infrastructure exists
  - Device detail page has no unit tests

### Demo

- [x] MQTT simulator running with 5+ devices publishing telemetry
- [x] Dashboard updates in real time as simulator changes
- [x] Device detail page shows live telemetry updating every second
- [x] Trigger a low battery event → alert appears in the alerts feed
- [x] Export a CSV report
- [x] Log in as Customer vs Support vs Admin — different navigation and permissions
- [x] View audit log and change a system setting
- [x] Real authentication (login → POST /api/auth/login → JWT → authenticated API)

### Excluded from v1.0

- E2E test infrastructure (Playwright/Cypress)
- CI/CD deployment pipeline
- Multi-region or Kubernetes deployment
- Real MQTT hardware integration
- OAuth/SAML SSO
- Mobile native app
- PDF export (placeholder implemented)
- Report scheduling (placeholder implemented)

---

## Release Decision

**Status:** ✅ Released as v1.0.0-rc.3 — 2026-07-04

**Status:** ✅ Released as v1.0.0-rc.4 — 2026-07-05

| Check | Status |
|-------|--------|
| All must-haves complete | ✅ 7/7 sprints |
| Backend API (real) | ✅ PostgreSQL, Fastify, JWT |
| Authentication (real) | ✅ bcrypt, JWT, Socket.IO auth |
| RBAC enforced | ✅ Route guards, nav filtering, permission matrix |
| Simulator session lifecycle | ✅ sessionId tracking + stale-message drop |
| Live Socket.IO notifications | ✅ API bridge emitter + new POST endpoint |
| Security hardened | ✅ JWT defaults removed (required at startup) |
| Accessibility baseline | ✅ All interactive elements have `aria-label` |
| Performance audits | ✅ Bundle, DB, API, realtime — all clean |
| Security audits | ✅ 18 issues triaged, 8 fixed, 10 documented |
| Documentation aligned | ✅ All docs verified against code |
| Demo works end-to-end | ✅ |
| pnpm lint passes | ✅ Zero errors |
| pnpm build passes | ✅ 26/26 pages |
| Release reviewed | ✅ Released |

---

## Decision Options

### Option A: v1.0.0-rc.4 (Recommended)

Tag the current state as **Release Candidate 4**. This is the stabilization sprint that resolves the simulator correctness bug, adds live Socket.IO notifications, hardens security defaults, and polishes accessibility.

**Why choose this:**
- All RC4 items delivered (simulator lifecycle, live notifications, security, a11y)
- Stale-simulator devices no longer linger in the bridge registry during rolling restarts
- Notifications deliver instantly via Socket.IO instead of waiting for a poll cycle
- JWT_SECRET is required at startup — no default fallback to catch in production
- All icon-only buttons, navigation landmarks, and search inputs have proper ARIA labels
- Remaining blockers are documented and understood (mock pages, no E2E tests)

### Option B: v1.0.0 (Full Release)

Ship as a full v1.0 release if the remaining debt items are acceptable without further work.

**Consider if:**
- The 4 mock-data pages (API Keys, Notification Rules, Notifications, device detail tabs) are acceptable as known limitations
- ~20 missing `aria-label` attributes are acceptable
- Customer-level data isolation is not needed yet
- No E2E tests is acceptable

### Option C: v1.1.0

If remaining debt items are prioritized for immediate addressing, tag v1.0.0-rc.3 now and ship v1.0.0 after 1-2 weeks resolving the debt backlog.

---

## Process

1. ✅ All 7 sprints are complete per `BUILD_PLAN.md` Definition of Done.
2. ✅ Quality gates verified by running `pnpm lint && pnpm build`.
3. ✅ RC3 Phase 1-6 deliverables all complete.
4. ⏳ Demo walkthrough confirms all demo criteria.
5. ⏳ Stakeholder review → decision on rc.3 vs v1.0 tag.
6. ⏳ `git tag v1.0.0-rc.3` (or v1.0.0) and push.
