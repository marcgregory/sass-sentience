# Sprint 11 Charter — Firmware Rollout (v1.9.0)

> **Objective:** Deliver a reliable, auditable firmware rollout system that enables administrators to deploy firmware to device groups with progress tracking, safety controls, and rollback support.

---

## 1. Why This Sprint

Firmware Rollout is the logical successor to Sprint 10's Fleet Operations Foundation. The infrastructure now in place — Device Groups, server-side membership queries, bulk operations, RBAC, audit logging, and lifecycle management — maps directly to what firmware deployment needs.

This sprint also introduces **job management infrastructure** (long-running operations, progress tracking, retry, cancellation) that Batch Diagnostics and Fleet Automation will both reuse in later sprints.

### Sprint Priority Order

| Sprint | Feature | Rationale |
|--------|---------|-----------|
| 11 (v1.9.0) | **Firmware Rollout** | Reuses Group infrastructure; establishes job management patterns |
| 12 | Batch Diagnostics | Reads from job infrastructure; read-oriented |
| 13 | Dynamic / Rule-Based Groups | Design informed by rollout/diagnostics use cases |
| 14 | Fleet Automation | Composes all prior primitives |

---

## 2. Scope

### In Scope (must deliver)

**A. Firmware Package Management**
- Upload/firmware binary metadata (name, version, device type, release notes, file hash, file size)
- List, detail, delete firmware packages
- RBAC: admin manages packages; support reads

**B. Rollout Creation & Targeting**
- Create rollout targeting a Device Group
- Eligibility checks: device type compatibility, current firmware version, device online status
- Preview: show affected device count, version delta, ineligible devices with reasons
- Confirmation dialog before rollout begins

**C. Rollout Execution**
- Backend rollout job with explicit state machine:

  **Rollout lifecycle:**
  ```
  Draft
     │
  Start
     ▼
  Running
     │
     ├────► Completed
     ├────► Failed
     └────► Cancelled
  ```

  **Per-device lifecycle:**
  ```
  Pending
     │
  Running
     │
     ├────► Succeeded
     ├────► Failed
     ├────► Skipped
     └────► Cancelled
  ```

- Distribute firmware to eligible devices incrementally
- Poll-based progress tracking (jobs table, no WebSocket streaming)
- Cancel rollout (stops further distribution; already-started devices finish)
- Retry: resets `failed` devices back to `pending` for re-execution; leaves `succeeded` untouched

**D. Progress Dashboard**
- Rollout list with status, target group, version, progress %, timing
- Rollout detail: per-device status table with device name, current version, target version, status, error message
- Loading, empty, error states on all views
- Retry failed devices individually or as a batch

**E. Audit Trail & History**
- All rollout lifecycle events in audit log (create, cancel, complete, retry)
- Per-device firmware update history

**F. RBAC & Permissions**
- New resource: `firmware` with actions `manage` (admin) and `view` (support/read)
- New resource: `rollouts` with `create/update/delete` (admin) and `read` (support)

### Out of Scope (deferred)

- Differential/delta updates (binary diff patches)
- Canary deployments (percentage-based phased rollout)
- Automatic rollback on failure threshold
- Scheduled rollouts (future date/time)
- Multi-version rollout policies
- Firmware binary storage (metadata only; binaries assumed managed externally)

---

## 3. Architecture & Reuse

### Existing Patterns to Reuse

| Sprint 10 Pattern | How It Maps to Firmware Rollout |
|-------------------|--------------------------------|
| `POST /api/device-groups/:id/tags` (bulk operation) | Model for `POST /api/rollouts` targeting a group |
| `GET /api/device-groups/:id/devices` (scoped query) | Eligibility check queries against group members |
| `archivedAt` / soft-delete pattern | Rollout cancellation (soft-cancel with `cancelledAt`) |
| Audit logging in device-groups routes | Audit every rollout lifecycle transition |
| TanStack Query hooks + mutation patterns | `useRollouts()`, `useCreateRollout()`, `useCancelRollout()` |
| Pagination + search pattern | Rollout list and per-device status pagination |
| `PageHeader` + `EmptyState` + `StatusBadge` | Reuse all shared components |
| RBAC resource definitions | Follow existing `/src/lib/permissions.ts` pattern |

### Design Principle: Separate Rollout from Execution

The `rollouts` and `rollout_devices` tables are designed with **generic column semantics** rather than firmware-specific ones. This ensures Diagnostics (Sprint 12) and Automation (Sprint 14) can reuse the same infrastructure with different *execution payloads*.

```
Rollout (generic orchestration)
    ↓
Execution (generic step tracking)
    ↓
Target Device

Firmware:   firmware_package_id  +  rollout_executions  +  per-device tracking
Diagnostics: diagnostic_job_id   +  rollout_executions  +  per-device tracking
Automation: automation_rule_id   +  rollout_executions  +  per-device tracking
```

The `rollouts` table carries a polymorphic `job_type` discriminator and a nullable, typed `job_config` JSONB column. Today: `job_type = 'firmware'`. Tomorrow: `'diagnostics'`, `'automation'`.

```sql
firmware_packages
  id            UUID PK
  name          text NOT NULL
  version       text NOT NULL
  device_type   text[] (compatible device types)
  release_notes text
  file_hash     text
  file_size     integer
  created_at    timestamptz
  updated_at    timestamptz

rollouts  (generic — "jobs" or "executions" conceptually)
  id                  UUID PK
  job_type            text NOT NULL DEFAULT 'firmware'    -- discriminator: firmware | diagnostics | automation
  name                text NOT NULL
  firmware_package_id UUID FK → firmware_packages        -- NULL for non-firmware job types
  job_config          jsonb                              -- typed payload (Diagnostics params, Automation rule, etc.)
  target_group_id     UUID FK → device_groups
  status              rollout_status: draft | running | completed | failed | cancelled
  device_count        integer
  completed_count     integer
  failed_count        integer
  created_by          UUID FK → users
  started_at          timestamptz
  completed_at        timestamptz
  cancelled_at        timestamptz
  created_at          timestamptz
  updated_at          timestamptz

rollout_devices  (generic — "execution steps" conceptually)
  id                UUID PK
  rollout_id        UUID FK → rollouts
  device_id         UUID FK → devices
  status            execution_status: pending | running | succeeded | failed | skipped | cancelled
  error_message     text
  started_at        timestamptz
  completed_at      timestamptz
```

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/firmware` | List firmware packages (paginated, searchable) |
| `POST` | `/api/firmware` | Create firmware package metadata |
| `GET` | `/api/firmware/:id` | Firmware package detail |
| `DELETE` | `/api/firmware/:id` | Delete firmware package (admin) |
| `POST` | `/api/rollouts` | Create rollout targeting a device group |
| `GET` | `/api/rollouts` | List rollouts (paginated, filterable by status) |
| `GET` | `/api/rollouts/:id` | Rollout detail with progress summary |
| `GET` | `/api/rollouts/:id/devices` | Per-device status (paginated, filterable by status) |
| `POST` | `/api/rollouts/:id/cancel` | Cancel rollout |
| `POST` | `/api/rollouts/:id/retry` | Retry failed devices in rollout |
| `GET` | `/api/rollouts/:id/eligibility` | Preview eligible/ineligible devices before creating rollout |

### Frontend Pages

| Route | Content |
|-------|---------|
| `/firmware` | Firmware package list with create/delete |
| `/firmware/[id]` | Package detail + rollout history for this version |
| `/rollouts` | Rollout list with status, progress, timing |
| `/rollouts/[id]` | Rollout detail with per-device status table, cancel/retry controls |
| Nav entry | `/firmware` in sidebar (admin/support) |

---

## 4. Definition of Done

- [ ] TypeScript compiles cleanly (`pnpm lint`)
- [ ] Production build succeeds (`pnpm build`)
- [ ] Drizzle migration applies cleanly (new tables + indexes)
- [ ] All API endpoints have Zod validation + RBAC
- [ ] All data-driven views handle loading, empty, and error states
- [ ] Rollout lifecycle state machine is correct (no invalid transitions)
- [ ] Cancellation stops new distributions; in-flight devices complete
- [ ] Retry only targets failed devices; leaves completed ones untouched
- [ ] Audit events recorded for create, cancel, retry, and complete transitions
- [ ] Dark mode renders correctly on all new/edited pages
- [ ] Responsive at 375px, 768px, and 1280px+
- [ ] Every rollout is fully reconstructable from persisted state and audit history (who started it, when, which firmware, which devices, which succeeded/failed/skipped and why — without relying on transient logs)
- [ ] E2E Playwright tests cover core rollout workflow (create, progress, cancel, retry)
- [ ] ROADMAP.md, CHANGELOG.md, BUILD_PLAN.md, API_COVERAGE.md updated
- [ ] Migration verification added to pre-release checklist

---

## 5. Non-Goals (explicitly deferred)

- Physical firmware binary upload/storage (metadata only)
- Differential/delta updates
- Canary / phased percentage rollouts
- Automatic rollback on threshold breach
- Scheduled rollouts
- Multi-version policies
- WebSocket-based real-time progress (polling is sufficient for MVP)
