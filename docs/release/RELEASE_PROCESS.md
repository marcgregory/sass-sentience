# Release Process

> Defines the repeatable workflow for validating and approving Sentience IoT Platform releases.
> Last updated: 2026-07-15

---

## 1. Preconditions

Before a release candidate is ready for validation, all of the following must be true:

- [ ] All sprint/user-story deliverables are complete per `BUILD_PLAN.md` Definition of Done
- [ ] TypeScript compiles cleanly across all packages (`pnpm lint`)
- [ ] Production build succeeds (`pnpm build`)
- [ ] No critical or high-priority technical debt items remain open (see `TECHNICAL_DEBT.md`)
- [ ] `ROADMAP.md` updated with completed milestone
- [ ] `CHANGELOG.md` updated with release notes

---

## 2. Validation Gates

Every release candidate must pass all five gates in order. A gate failure blocks progression to the next gate.

| # | Gate | What it proves | Blocking |
|---|------|----------------|----------|
| 1 | **Docker Build** | The repository is containerizable — workspace deps, native modules, and build pipeline work in a clean Linux context | Gate 2 |
| 2 | **Stack Startup** | All services start, pass healthchecks, and form a connected system | Gate 3 |
| 3 | **Readiness** | The platform is usable — API responds to requests, DB is migrated, services communicate | Gate 4 |
| 4 | **Real E2E Tests** | The full IoT pipeline (Simulator → MQTT → Bridge → Socket.IO → Browser UI) works end-to-end | Gate 5 |
| 5 | **Failure Modes** | The platform detects and reports dependency failures accurately, and recovers when they return | Release decision |

### 2.1 Gate 1 — Docker Build

```bash
docker compose -f docker-compose.e2e.yml build
```

**Expected:** All images build with exit 0. Key checks:
- pnpm workspace dependencies resolve correctly inside container
- `--frozen-lockfile` passes (lockfile is in sync)
- Next.js standalone output builds without errors
- No native dependency compilation failures
- Docker layer caching is effective (not invalidated by unrelated changes)

**Failure response:** Fix the build issue → re-run build → confirm green before proceeding.

---

### 2.2 Gate 2 — Stack Startup

```bash
docker compose -f docker-compose.e2e.yml up -d
docker compose -f docker-compose.e2e.yml ps
```

**Expected:** All 6 services show healthy/running status. Key checks:
- PostgreSQL healthcheck passes
- Mosquitto is accepting connections
- API healthcheck passes (DB connected)
- Bridge shows connected to MQTT
- Simulator is publishing telemetry
- Web server is reachable

**Failure response:** Check individual container logs (`docker compose logs <service>`). Identify the root cause (missing env var, networking issue, startup script error) → fix → re-run stack.

---

### 2.3 Gate 3 — Readiness

```bash
curl http://localhost:<api-port>/api/ready
```

**Expected:** Returns `{"status": "ready"}`. This verifies the API has completed migrations and can serve authenticated requests.

**Failure response:** Check API container logs for migration errors or connection failures. Fix → restart API → re-verify.

---

### 2.4 Gate 4 — Real E2E Tests

```bash
docker compose -f docker-compose.e2e.yml run playwright
```

**Expected:** All real-infrastructure Playwright tests pass (10 tests across 4 spec files). The telemetry pipeline test is the highest-value assertion.

**Failure response:**
1. Review Playwright report (traces, screenshots, videos)
2. Check relevant service logs
3. Fix test or infrastructure issue
4. Re-run tests
5. If a flaky test is suspected, run 3 times to confirm consistency

---

### 2.5 Gate 5 — Failure Modes

Three scenarios must be validated:

| Scenario | Action | Expected |
|----------|--------|----------|
| MQTT outage | `docker compose stop mosquitto` | Health monitoring reports unhealthy; recovery on restart |
| Bridge disconnect | `docker compose stop bridge` | Health reflects disconnect; reconnects on restart |
| Database failure | `docker compose stop postgres` | `/api/ready` fails; recovers on restart |

**Failure response:** The health monitoring subsystem needs investigation if it fails to detect or report any of these scenarios. Fix → re-run scenario.

---

## 3. Evidence Collection

For each gate, record:

- The **exact command** executed
- The **expected outcome** from this document
- The **actual outcome** (paste key output lines)
- **Status**: Passed / Failed / Skipped

Evidence is stored in `docs/release/VALIDATION_vX.Y.Z.md` using the template at `docs/release/VALIDATION_TEMPLATE.md`. This file is committed to the repository as part of the release.

---

## 4. Decision Authority

| Role | Decision | Requires |
|------|----------|----------|
| Engineering Lead | Approve release candidate | All 5 gates pass |
| Engineering Lead | Approve with conditions | Minor gate waivers documented with mitigation |
| Engineering Lead | Block release | Any gate failure without known fix |

---

## 5. Handling Failures

### Gate failure during validation

1. **Stop.** Do not proceed to the next gate.
2. **Diagnose.** Identify the root cause. Check service logs, Playwright report, and container state.
3. **Fix.** Apply the fix to the codebase or configuration.
4. **Re-run the failing gate only.** If the fix could affect earlier gates, re-run from the affected gate forward.
5. **Document.** Record the issue, resolution, and any follow-up in the validation document's Issues Encountered section.

### Release blocking

If a gate fails and cannot be resolved within the planned timeline:

1. Document the blocker in `docs/release/VALIDATION_vX.Y.Z.md`
2. Update `ROADMAP.md` to reflect the blocked milestone
3. Decide: defer the release or defer the affected feature

---

## 6. Release Completion

When all gates pass and the release is approved:

1. **Update ROADMAP.md** — mark milestone as "Completed" with validation evidence summary
2. **Update CHANGELOG.md** — add validation notes, link to validation document
3. **Update TECHNICAL_DEBT.md** — add any new debt discovered during validation
4. **Tag the release** — `git tag vX.Y.Z` and push
5. **Archive validation document** — `VALIDATION_vX.Y.Z.md` remains in the repo as the permanent record

---

## 7. Validation Record Lifecycle

| Phase | Document | Purpose |
|-------|----------|---------|
| Setup | `VALIDATION_TEMPLATE.md` | Reusable structure for every release |
| Pre-validation | `VALIDATION_vX.Y.Z.md` | Skeleton with commands and expected outcomes |
| Each gate pass | `VALIDATION_vX.Y.Z.md` | Fill in actual outcomes and status |
| Post-release | `VALIDATION_vX.Y.Z.md` | Complete record committed to repo |

Validation records are permanent. They serve as:
- **Release audit trail** — what was tested and what passed
- **Regression baseline** — compare current validation against prior releases
- **Process improvement** — identify which gates consistently find issues versus which are routine

---

## 8. Related Documents

| Document | Location |
|----------|----------|
| Release plan | `docs/implementation/RELEASE_PLAN.md` |
| Product backlog | `docs/implementation/ROADMAP.md` |
| Changelog | `docs/implementation/CHANGELOG.md` |
| Technical debt | `docs/implementation/TECHNICAL_DEBT.md` |
| Testing strategy | `docs/implementation/TESTING_STRATEGY.md` |
| Validation template | `docs/release/VALIDATION_TEMPLATE.md` |
| Build plan | `docs/implementation/BUILD_PLAN.md` |
