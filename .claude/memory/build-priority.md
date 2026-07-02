---
name: build-priority
description: Product-first rule — infrastructure frozen, sprint-priority order
metadata:
  type: project
---

The infrastructure phase is **complete** (frozen). All effort now goes to user-facing product modules.

**Document charter:**
- `ROADMAP.md` = Product backlog (what is done, in progress, next, blocked)
- `BUILD_PLAN.md` = Engineering execution (sprint goal, tasks, acceptance criteria, demo)

**Sprint discipline:** Only one sprint active at a time. A sprint must pass all Definition of Done items (TypeScript, build, dark mode, responsive, docs updated) before the next begins.

Priority order:
1. **Device Management** — detail page, live telemetry, config, diagnostics, I/O, firmware
2. **Dashboard** — health score, trends, charts, fault overview, activity feed
3. **Alerts** — list, acknowledge, resolve, assignment, timeline
4. **Event History** — filters, search, export, timeline, drill-down
5. **Reports** — daily/weekly/monthly, CSV, PDF
6. **User Management** — RBAC, users, roles, permissions
7. **Admin** — settings, audit logs, API keys, feature flags

No new infrastructure (Kubernetes, Redis, CI/CD, multi-region, scaling, monitoring) unless required by a current sprint. Prefer completing vertical slices over expanding the platform horizontally.

**Why:** The original goal is an enterprise IoT monitoring platform that users can operate. The current architecture supports all remaining modules. Continuing to build infrastructure gives diminishing returns.

**How to apply:** Follow `docs/implementation/BUILD_PLAN.md`. Update `ROADMAP.md` and `CHANGELOG.md` after each milestone. `pnpm lint && pnpm build` before marking anything done.
