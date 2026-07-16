# Release Gates — Standard Validation

> Standardized release criteria established during v1.9.0-rc1. After each sprint, confirm these before promoting to final release.

---

## Gate 0: Repository Baseline

- [ ] `git status --short` — clean working tree
- [ ] `pnpm lint` — zero TypeScript errors
- [ ] `pnpm build` — all pages generated, shared JS < 150 kB
- [ ] Tag present (`v{MAJOR}.{MINOR}.{PATCH}-rc1`)
- [ ] Documentation synchronized (ROADMAP, CHANGELOG, BUILD_PLAN, TECH_DEBT)

## Gate 1: Docker Build

- [ ] `docker compose -f docker-compose.e2e.yml build` — exit 0
- [ ] All 5 images built (API, Web, Bridge, Simulator, Playwright)
- [ ] No missing dependencies or workspace resolution errors

## Gate 2: Stack Startup

- [ ] All 6 services healthy (`docker compose ps`)
- [ ] Database migration applies cleanly
- [ ] No orphan or unregistered migration entries

## Gate 3: Readiness

- [ ] `curl /api/ready` returns `{"status": "ready"}`
- [ ] HTTP 200 status code

## Gate 4: Real E2E Tests + Workflow Integrity

- [ ] All real-infrastructure Playwright tests pass
- [ ] No new test failures vs previous release
- [ ] Pre-existing failures documented in Known Issues

### Workflow Integrity Checks (Execution Engine)

When the sprint introduces or modifies an execution engine (rollouts, jobs, diagnostics), verify the engine directly — not just the UI:

| Check | How to Verify |
|-------|---------------|
| **State machine transitions** | Create → Start → Run → Complete. Verify invalid transitions are rejected (e.g., retry on completed rollout, cancel on draft). |
| **Per-device execution records** | Query `rollout_devices` table for correct count, status distribution, and device references. |
| **Summary endpoint accuracy** | Compare `GET /api/rollouts/:id/summary` counts against raw DB counts. Must match. |
| **Audit trail persistence** | Query audit log for lifecycle events (created, started, cancelled, retried, completed). Verify actor, timestamp, and details are recorded. |
| **Immutable execution history** | After completion, verify no status mutations occur on completed/failed devices. |
| **Retry isolation** | Retry failed devices only — verify `succeeded` devices are untouched in DB. |
| **Cancel isolation** | Cancel a running rollout — verify `pending` devices remain pending (not started), `running` devices finish, `completed`/`failed` unchanged. |

## Gate 5: Failure Modes

- [ ] MQTT outage: health transition → recovery verified
- [ ] Bridge disconnect: health transition → recovery verified
- [ ] Database failure: `/api/ready` fails → recovery verified

---

## Release Decision

| Outcome | Criteria |
|---------|----------|
| **Approved** | All required gates pass; no release-blocking issues. |
| **Approved with Conditions** | Non-blocking issues documented with follow-up actions. |
| **Blocked** | One or more required gates failed; release cannot proceed. |

### Pre-existing Failure Policy

Before promoting, verify:

- [ ] Any failures are pre-existing (reproducible on previous release)
- [ ] Failures are documented with issue reference
- [ ] Failures are confirmed NOT introduced by the current sprint
- [ ] Release impact explicitly stated (non-blocking / advisory / blocking)
