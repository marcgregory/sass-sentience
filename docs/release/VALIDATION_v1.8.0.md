# Validation Record — v1.8.0

> Real Infrastructure E2E Validation — Fleet Operations Foundation
>
> Fill in results as each gate is executed.
> Template: `docs/release/VALIDATION_TEMPLATE.md`
> Process: `docs/release/RELEASE_PROCESS.md`

---

## 1. Release Information

| Field | Value |
|-------|-------|
| **Version** | `v1.8.0` |
| **Git Commit** | `—` |
| **Git Tag** | `—` (tag created post-approval — see RELEASE_PROCESS.md §6) |
| **Validation Date** | 2026-07-16 |
| **Validator** | Claude Code |
| **Environment (OS)** | Windows 10 Pro (22H2) |
| **Docker Version** | v29.5.3 |
| **Docker Compose Version** | v5.1.4 |
| **Node Version** | 20-alpine (container base) |
| **pnpm Version** | v10.14.0 |

### Container Images Validated

| Service | Image ID / Digest |
|---------|-------------------|
| API | `—` |
| Web | `—` |
| Bridge (realtime) | `—` |
| Simulator | `—` |
| Playwright | `—` |
| Infrastructure (postgres) | `postgres:16-alpine` (pre-built) |
| Infrastructure (mosquitto) | `eclipse-mosquitto:2` (pre-built) |

---

## 2. Gate Results

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 0 | **Repository Baseline** | ⏳ | Commit, working tree, lint, build |
| 1 | **Docker Build** | ⏳ | Build command output, image count |
| 2 | **Stack Startup** | ⏳ | `docker compose ps`, service health |
| 3 | **Readiness** | ⏳ | `curl /api/ready` response |
| 4 | **Real E2E Tests** | ⏳ | Playwright summary |
| 5 | **Failure Modes** | ⏳ | MQTT/DB/Bridge health transitions |

### 2.0 Gate 0 — Repository Baseline

Establishes that the repository itself is in a valid state before Docker validation begins.

**Commands:**
```bash
git log --oneline -1
git status --short
pnpm lint
pnpm build
```

**Expected:** Correct commit checked out, working tree clean, lint and build both succeed.

**Actual:**

```
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.1 Gate 1 — Docker Build

**Command:**
```bash
docker compose -f docker-compose.e2e.yml build
```

**Expected:** All services build successfully (exit 0).

**Actual:**

```
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
{"status": "ready"}
```

**Actual:**

```
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.4 Gate 4 — Real E2E Tests

**Command:**
```bash
docker compose -f docker-compose.e2e.yml run playwright
```

**Expected:** All real-infrastructure tests pass.

**Actual:**

```
```

**Status:** `⏳ Pending / ✅ Passed / ❌ Failed`

---

### 2.5 Gate 5 — Failure Modes

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
