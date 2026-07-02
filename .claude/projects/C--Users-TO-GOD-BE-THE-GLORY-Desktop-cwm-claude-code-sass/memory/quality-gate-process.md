---
name: quality-gate-process
description: Every feature sprint is followed by a quality pass before the next sprint begins
metadata:
  type: reference
  updated: 2026-07-03
---

After every feature sprint, run a full quality pass before updating ROADMAP/CHANGELOG and beginning the next sprint.

**Workflow:**
```
Feature Sprint → Quality Pass → Accept → Update ROADMAP.md → Update CHANGELOG.md → Next Sprint
```

**Quality Pass checklist (derived from user feedback):**

1. **Status transitions** — never emit events for same→same status transitions
2. **Severity normalization** — single severity model across Dashboard, Alerts, Events, Reports
3. **Number formatting** — battery (integer/1dp), signal (1dp), temperature (1dp), no long floats
4. **Fleet Health labels** — 90-100 Excellent, 75-89 Healthy, 50-74 Warning, 0-49 Critical
5. **Charts** — tooltips show actual counts AND percentages; totals match dashboard
6. **Recent Activity** — no duplicate spam; group repeated threshold events
7. **Event Details** — Copy Event ID, Copy JSON, raw metadata display
8. **Reports** — metrics match Dashboard; CSV export matches filtered dataset exactly
9. **Cross-page consistency** — all counts derive from same source of truth
10. **QA** — test with MQTT simulator, without simulator, dark mode, responsive, pnpm lint, pnpm build

**Why:** A dedicated quality gate between feature sprints separates polished products from feature dumps. Every polish item compounds — one format inconsistency across pages signals "this is a demo" to a stakeholder.

**How to apply:** When a sprint is code-complete but before marking it done in ROADMAP.md/CHANGELOG.md, run the full checklist above. Do not begin the next sprint until the quality pass is accepted.
