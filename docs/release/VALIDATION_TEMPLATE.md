# Validation Record — vX.Y.Z

> One file per release. Copy this template for each new version.
> Instructions in `RELEASE_PROCESS.md`.

---

## 1. Release Information

| Field | Value |
|-------|-------|
| **Version** | `vX.Y.Z` |
| **Commit SHA** | `<full SHA>` |
| **Validation date** | YYYY-MM-DD |
| **Validator** | `<name / CI run>` |
| **Environment** | OS: , Docker: , Node: , pnpm: |

---

## 2. Gate Results

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 1 | **Docker Build** | `⏳ / ✅ / ❌` | Build command output, image count |
| 2 | **Stack Startup** | `⏳ / ✅ / ❌` | `docker compose ps` output, health status per service |
| 3 | **Readiness** | `⏳ / ✅ / ❌` | `curl /api/ready` response |
| 4 | **Real E2E Tests** | `⏳ / ✅ / ❌` | Playwright summary: tests passed / total |
| 5 | **Failure Modes** | `⏳ / ✅ / ❌` | MQTT stop/start, DB kill, bridge disconnect — health transitions |

### 2.1 Gate 1 — Docker Build

**Command:**
```bash
docker compose -f docker-compose.e2e.yml build
```

**Expected:** All services build successfully (exit 0). No missing dependencies, workspace resolution errors, or native dependency failures.

**Actual:**
```
<output summary — last 10-20 lines of build output, key warnings, any retries>
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
| postgres | healthy |
| mosquitto | healthy |
| api | healthy |
| bridge | healthy |
| simulator | running |
| web | healthy |

**Actual:**
```
<docker compose ps output>
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.3 Gate 3 — Readiness

**Command:**
```bash
curl http://localhost:<api-port>/api/ready
```

**Expected:**
```json
{"status": "ready"}
```

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

**Expected:** All real-infrastructure tests pass. The telemetry pipeline test (Simulator → MQTT → Bridge → Socket.IO → Browser UI) is the highest-value assertion.

**Actual:**
```
<Playwright summary — tests passed / total, failure details if any>
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.5 Gate 5 — Failure Modes

#### 2.5.1 MQTT Outage

| Step | Command | Expected | Actual |
|------|---------|----------|--------|
| Stop | `docker compose stop mosquitto` | Health reports unhealthy | |
| Verify | `curl /api/admin/health` or health page | MQTT check fails | |
| Restart | `docker compose start mosquitto` | Health recovers | |
| Re-verify | `curl /api/admin/health` | MQTT check passes | |

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

#### 2.5.2 Bridge Disconnect

| Step | Command | Expected | Actual |
|------|---------|----------|--------|
| Stop | `docker compose stop bridge` | Health reflects disconnect | |
| Restart | `docker compose start bridge` | Bridge reconnects | |

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

#### 2.5.3 Database Failure

| Step | Command | Expected | Actual |
|------|---------|----------|--------|
| Stop | `docker compose stop postgres` | `/api/ready` fails, health reports DB down | |
| Restart | `docker compose start postgres` | `/api/ready` recovers | |

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

## 3. Issues Encountered

| # | Gate | Problem | Resolution | Follow-up |
|---|------|---------|------------|-----------|
|  |  |  |  |  |
|  |  |  |  |  |

---

## 4. Artifacts

| Artifact | Location / Path |
|----------|----------------|
| Playwright HTML report | `<path>` |
| Traces / Screenshots / Videos | `<path>` |
| Container logs archive | `<path>` |
| Additional evidence | `<path>` |

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
