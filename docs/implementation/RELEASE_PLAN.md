# Release Plan

> Defines the exit criteria for v1.0 of the Sentience IoT Platform.
> Last updated: 2026-07-02

---

## v1.0 Release Criteria

### Must Have

- [ ] **Sprint 1: Device Management** — device detail page with live telemetry, history, diagnostics, firmware, configuration, I/O
- [ ] **Sprint 2: Dashboard** — health score, trends, charts, fault overview, activity feed
- [ ] **Sprint 3: Alerts** — list, acknowledge, resolve, assignment, timeline
- [ ] **Sprint 4: Event History** — filters, search, export, timeline, device drill-down
- [ ] **Sprint 5: Reports** — daily/weekly/monthly, CSV, PDF
- [ ] **Sprint 6: User Management** — RBAC, users, roles, permissions
- [ ] **Sprint 7: Admin** — settings, audit logs, API keys, feature flags

### Quality Gates

- [ ] TypeScript compiles cleanly across all packages (`pnpm lint`)
- [ ] Production build succeeds (`pnpm build`)
- [ ] Unit tests pass for all test suites
- [ ] All pages render correctly in light and dark modes
- [ ] Responsive at 375px, 768px, and 1280px+
- [ ] Accessibility baseline passes (keyboard navigation, focus management, ARIA labels on interactive elements)
- [ ] No High or Critical priority technical debt (see `TECHNICAL_DEBT.md`)
- [ ] Loading, empty, and error states exist on all data-driven views

### Demo

- [ ] MQTT simulator running with 5+ devices publishing telemetry
- [ ] Dashboard updates in real time as simulator changes
- [ ] Device detail page shows live telemetry updating every second
- [ ] Trigger a low battery event → alert appears in the alerts feed
- [ ] Export a monthly report to CSV and PDF
- [ ] Log in as Customer vs Support vs Admin — different navigation and permissions
- [ ] View audit log and change a system setting

### Excluded from v1.0

- REST API backend (mock data sufficient for demo)
- E2E test infrastructure (Playwright/Cypress)
- CI/CD deployment pipeline
- Multi-region or Kubernetes deployment
- Real MQTT hardware integration
- OAuth/SAML SSO
- Mobile native app

---

## Release Decision

**Status:** ⏳ Not ready

| Check | Status |
|-------|--------|
| All must-haves complete | ❌ 0/7 sprints |
| All quality gates pass | ❌ |
| Demo works end-to-end | ❌ |
| Release reviewed | ❌ |

---

## Process

1. All 7 sprints are complete per `BUILD_PLAN.md` Definition of Done.
2. Quality gates are verified by running `pnpm lint && pnpm build` and reviewing `TECHNICAL_DEBT.md`.
3. Demo walkthrough confirms all demo criteria.
4. Status changes to **Ready**, ## Release Decision updated, and v1.0 tagged in git.
