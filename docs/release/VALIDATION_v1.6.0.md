# Validation Record — v1.6.0

> Real Infrastructure E2E Validation
>
> Fill in results as each gate is executed.
> Template: `docs/release/VALIDATION_TEMPLATE.md`
> Process: `docs/release/RELEASE_PROCESS.md`

---

## 1. Release Information

| Field | Value |
|-------|-------|
| **Version** | `v1.6.0` |
| **Git Commit** | `<fill>` |
| **Git Tag** | `v1.6.0` |
| **Validation Date** | `<fill>` |
| **Validator** | `<fill>` |
| **Environment (OS)** | |
| **Docker Version** | |
| **Docker Compose Version** | |
| **Node Version** | |
| **pnpm Version** | |

### Container Images Validated

| Service | Image ID / Digest |
|---------|-------------------|
| API | `<fill after Gate 1 — docker images sentience-e2e-api --digest>` |
| Web | `<fill>` |
| Bridge | `<fill>` |
| Simulator | `<fill>` |
| Playwright | `<fill>` |

---

## 2. Gate Results

| # | Gate | Status | Evidence (Required / Recommended) |
|---|------|--------|-----------------------------------|
| 0 | **Repository Baseline** | ⏳ | Commit, working tree, lint, build |
| 1 | **Docker Build** | ⏳ | Build exit code, per-image success |
| 2 | **Stack Startup** | ⏳ | `docker compose ps` output |
| 3 | **Readiness** | ⏳ | `curl /api/ready` response |
| 4 | **Real E2E Tests** | ⏳ | Playwright summary |
| 5 | **Failure Modes** | ⏳ | Health transitions per scenario |

---

### 2.0 Gate 0 — Repository Baseline

Establishes that the repository itself is in a valid state before Docker validation begins.

**Required evidence:**

```bash
git log --oneline -1
# → <fill>

git status --short
# → <fill>

git tag --points-at HEAD
# → <fill>

pnpm install --frozen-lockfile
# → <fill>

pnpm lint
# → <fill>

pnpm build
# → <fill>
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.1 Gate 1 — Docker Build

**Command:**
```bash
docker compose -f docker-compose.e2e.yml build
```

**Expected:** 6 services build successfully (api, realtime, web, simulator, playwright). All exit 0. No workspace resolution errors, frozen-lockfile mismatches, or native dependency failures.

**Images that should build:**
- `sentience-e2e-api` — Fastify + PostgreSQL
- `sentience-e2e-realtime` — Socket.IO bridge + MQTT client
- `sentience-e2e-web` — Next.js standalone
- `sentience-e2e-simulator` — MQTT device generator
- `sentience-e2e-playwright` — Playwright runner (extends web)

**Required evidence:** Build exit code, per-image success confirmation, image IDs/digests for the Container Images table in Section 1.

To capture image digests after build:
```bash
docker images sentience-e2e-* --digests --format "table {{.Repository}}\t{{.Tag}}\t{{.Digest}}"
```

**Actual:**
```
<paste key build output lines — last 20 lines per service, any warnings>
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.2 Gate 2 — Stack Startup

**Command:**
```bash
docker compose -f docker-compose.e2e.yml up -d
docker compose -f docker-compose.e2e.yml ps
```

**Expected:**

| Service | Status |
|---------|--------|
| `sentience-e2e-postgres` | healthy |
| `sentience-e2e-mosquitto` | healthy |
| `sentience-e2e-api` | healthy |
| `sentience-e2e-realtime` | healthy |
| `sentience-e2e-simulator` | running |
| `sentience-e2e-web` | healthy |

**Startup order:** postgres → mosquitto → api (waits for postgres) → realtime (waits for mosquitto) → simulator (waits for mosquitto) → web (waits for api + realtime)

**Required evidence:** Full `docker compose ps` output.

**Actual:**
```
<docker compose ps output>
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.3 Gate 3 — Readiness

**Command:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/ready
curl -s http://localhost:3001/api/ready
```

**Expected:** HTTP 200 with body `{"status":"ready"}`.

This verifies:
- API can connect to PostgreSQL
- Migrations have been applied (entrypoint runs `pnpm db:migrate`)
- Seed data has been loaded (`SEED_DATABASE: "true"`)
- API is ready to serve authenticated requests

**Required evidence:** HTTP status code and response body.

**Actual:**
```
<HTTP status code>
<response body>
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.4 Gate 4 — Real E2E Tests

**Command:**
```bash
docker compose -f docker-compose.e2e.yml run playwright
```

**Expected:** 10 tests pass, 0 fail. Test breakdown by spec file:

| Spec | Tests | Description |
|------|-------|-------------|
| `e2e/real/auth.spec.ts` | 4 | Login, logout, invalid creds, RBAC isolation |
| `e2e/real/telemetry-pipeline.spec.ts` | 3 | Dashboard updates, live device data, status stream |
| `e2e/real/health.spec.ts` | 2 | Health endpoint, readiness endpoint, admin health page |
| `e2e/real/devices.spec.ts` | 1 | Device list, detail, diagnostics |

**Highest-value test:** Telemetry pipeline — Simulator → MQTT → Bridge → Socket.IO → Browser UI assertion.

**Required evidence:** Playwright summary line (passed / failed / skipped).

**Recommended evidence:** Link to Playwright HTML report.

**Actual:**
```
<Playwright summary — passed / total, failure details if any>
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.5 Gate 5 — Failure Modes

**Required evidence:** For each scenario, record the health endpoint response before, during, and after the failure.

#### 2.5.1 MQTT Outage

| Step | Command | Expected | Actual |
|------|---------|----------|--------|
| Stop | `docker compose -f docker-compose.e2e.yml stop mosquitto` | Container stops cleanly | |
| Verify health | `curl http://localhost:3001/api/admin/health` | MQTT check reports unhealthy | |
| Restart | `docker compose -f docker-compose.e2e.yml start mosquitto` | Container starts, healthcheck passes | |
| Re-verify health | `curl http://localhost:3001/api/admin/health` | MQTT check recovers | |

**Notes:** After stopping mosquitto, the realtime bridge should also reflect the disconnection. The simulator may show reconnection errors (expected — the health endpoint should still report the overall platform status accurately).

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

#### 2.5.2 Bridge Disconnect

| Step | Command | Expected | Actual |
|------|---------|----------|--------|
| Stop | `docker compose -f docker-compose.e2e.yml stop realtime` | Container stops | |
| Verify health | `curl http://localhost:3001/api/admin/health` | Bridge check reports unhealthy | |
| Restart | `docker compose -f docker-compose.e2e.yml start realtime` | Bridge reconnects, healthcheck passes | |
| Re-verify health | `curl http://localhost:3001/api/admin/health` | Bridge check recovers | |

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

#### 2.5.3 Database Failure

| Step | Command | Expected | Actual |
|------|---------|----------|--------|
| Stop | `docker compose -f docker-compose.e2e.yml stop postgres` | Container stops | |
| Verify readiness | `curl http://localhost:3001/api/ready` | Returns 503 (not ready) | |
| Verify health | `curl http://localhost:3001/api/admin/health` | DB check reports unhealthy | |
| Restart | `docker compose -f docker-compose.e2e.yml start postgres` | PostgreSQL restarts, healthcheck passes | |
| Re-verify readiness | `curl http://localhost:3001/api/ready` | Returns `{"status":"ready"}` | |
| Re-verify health | `curl http://localhost:3001/api/admin/health` | DB check recovers | |

**Note:** API may crash or restart when DB becomes unavailable — the entrypoint does not handle mid-lifecycle DB disconnection. Document actual behavior.

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

## 3. Issues Encountered

| # | Gate | Problem | Resolution | Follow-up |
|---|------|---------|------------|-----------|
| | | | | |
| | | | | |

---

## 4. Artifacts

| Artifact | Location / Path |
|----------|----------------|
| Playwright HTML report | `<fill after e2e run>` |
| Traces / Screenshots / Videos | `<fill>` |
| Container logs | `docker compose logs --tail=100 <service>` |
| Build output | `<fill>` |

---

## 5. Release Decision

| Decision | Meaning |
|----------|---------|
| **Approved** | All required gates passed; no release-blocking issues. |
| **Approved with Conditions** | Non-blocking issues documented with follow-up actions. |
| **Blocked** | One or more required gates failed; release cannot proceed. |

```
Release Recommendation: ☐ Approved / ☐ Approved with conditions / ☐ Blocked

Conditions / Blockers:
- ...

Summary:
- ...
```
