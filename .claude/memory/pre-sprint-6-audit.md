---
name: pre-sprint-6-audit
description: Before Sprint 6 (RBAC), perform a full cross-page consistency audit of live metrics
metadata:
  type: feedback
---

Before starting Sprint 6 (Users/RBAC), perform a full consistency audit across the application.

Verify that dashboard, devices, alerts, events, and reports pages always compute the **same values** when viewing the same live data:

- Total/online/offline/fault/warning device counts
- Fleet Health score
- Battery and signal distributions
- Estate totals, site totals
- Event totals, alert totals

If any values are computed differently across pages, refactor them to use a **shared selector or utility** instead of duplicating business logic.

The same live data must always produce identical metrics everywhere.

Document any inconsistencies found and fix them before Sprint 6.

**Why:** Without this audit, the same data could show different counts on different pages, eroding user trust. A shared source of truth is more maintainable and consistent.

**How to apply:** Before any Sprint 6 work, run a cross-page audit. Create shared selectors or utilities for derived metrics. Fix inconsistencies found. Only then begin Sprint 6.
