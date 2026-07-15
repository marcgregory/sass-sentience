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
| **Commit SHA** | `<fill after validation>` |
| **Validation date** | `<fill>` |
| **Validator** | `<fill>` |
| **Environment** | OS: , Docker: , Node: , pnpm: |

---

## 2. Gate Results

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 1 | **Docker Build** | ⏳ | |
| 2 | **Stack Startup** | ⏳ | |
| 3 | **Readiness** | ⏳ | |
| 4 | **Real E2E Tests** | ⏳ | |
| 5 | **Failure Modes** | ⏳ | |

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

**Actual:**
```
<paste key build output lines here — last 20 lines per service, any warnings>
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

**Actual:**
```
<docker compose ps output>
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.3 Gate 3 — Readiness

**Command:**
```bash
curl http://localhost:3001/api/ready
```

**Expected:**
```json
{"status":"ready"}
```

This verifies:
- API can connect to PostgreSQL
- Migrations have been applied (entrypoint runs `pnpm db:migrate`)
- Seed data has been loaded (`SEED_DATABASE: "true"`)
- API is ready to serve authenticated requests

**Actual:**
```
<curl response>
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

**Actual:**
```
<Playwright test summary — passed / total, failure details if any>
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.5 Gate 5 — Failure Modes

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

```
Release Recommendation

☐ Approved
☐ Approved with conditions
☐ Blocked

Conditions / Blockers:
- ...

Summary:
- ...
```
