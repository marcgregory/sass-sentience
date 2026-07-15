# Validation Record — vX.Y.Z

> One file per release. Copy this template for each new version.
> Process: `docs/release/RELEASE_PROCESS.md`

---

## 1. Release Information

| Field | Value |
|-------|-------|
| **Version** | `vX.Y.Z` |
| **Git Commit** | `<full SHA>` |
| **Git Tag** | `—` (tag created post-approval — see RELEASE_PROCESS.md §6) |
| **Validation Date** | YYYY-MM-DD |
| **Validator** | `<name / CI run>` |
| **Environment (OS)** | |
| **Docker Version** | |
| **Docker Compose Version** | |
| **Node Version** | |
| **pnpm Version** | |

### Container Images Validated

| Service | Image ID / Digest |
|---------|-------------------|
| API | `<image id or sha256:...>` |
| Web | `<image id or sha256:...>` |
| Bridge | `<image id or sha256:...>` |
| Simulator | `<image id or sha256:...>` |
| Playwright | `<image id or sha256:...>` |

---

## 2. Gate Results

| # | Gate | Status | Evidence (Required / Recommended) |
|---|------|--------|-----------------------------------|
| 0 | **Repository Baseline** | `⏳ / ✅ / ❌` | Commit, working tree, lint, build |
| 1 | **Docker Build** | `⏳ / ✅ / ❌` | Build command output, image count |
| 2 | **Stack Startup** | `⏳ / ✅ / ❌` | `docker compose ps`, service health status |
| 3 | **Readiness** | `⏳ / ✅ / ❌` | `curl /api/ready` response |
| 4 | **Real E2E Tests** | `⏳ / ✅ / ❌` | Playwright summary: tests passed / total |
| 5 | **Failure Modes** | `⏳ / ✅ / ❌` | MQTT/DB/Bridge health transitions |

### 2.0 Gate 0 — Repository Baseline

Establishes that the repository itself is in a valid state before Docker validation begins.

**Required evidence:**
```bash
git log --oneline -1
# → abc1234 <commit message>

git status --short
# → <empty — working tree clean>

git tag --points-at HEAD
# → (optional — recorded as informational; tag creation deferred to post-approval per RELEASE_PROCESS.md Section 6)

pnpm install --frozen-lockfile
# → Already up to date

pnpm lint
# → 8 successful, 8 total

pnpm build
# → 28/28 pages
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.1 Gate 1 — Docker Build

**Command:**
```bash
docker compose -f docker-compose.e2e.yml build
```

**Expected:** All services build successfully (exit 0). No missing dependencies, workspace resolution errors, or native dependency failures.

**Required evidence:** Build exit code, per-image success confirmation, image IDs/digests for the Container Images table in Section 1.

To capture image digests after a successful build:
```bash
docker images sentience-e2e-* --digests --format "table {{.Repository}}\t{{.Tag}}\t{{.Digest}}"
```

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
curl http://localhost:<api-port>/api/ready
```

**Expected:**
```json
{"status": "ready"}
```

**Required evidence:** curl response body and HTTP status code.

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

**Required evidence:** Playwright summary line (passed / failed / skipped).

**Recommended evidence:** Link to Playwright HTML report.

**Actual:**
```
<Playwright summary — tests passed / total, failure details if any>
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.5 Gate 5 — Failure Modes

**Required evidence:** For each scenario, record the health endpoint response before, during, and after the failure.

#### 2.5.1 MQTT Outage

| Step | Command | Expected | Actual |
|------|---------|----------|--------|
| Stop | `docker compose stop mosquitto` | Health reports unhealthy | |
| Verify | `curl /api/admin/health` | MQTT check fails | |
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
| Playwright HTML report | |
| Traces / Screenshots / Videos | |
| Container logs | |
| Additional evidence | |

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
