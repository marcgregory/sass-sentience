# Job Execution Runtime Architecture

> **Generic execution platform for long-running fleet operations.**
> Firmware Rollouts (Sprint 11) provide the orchestration schema. This document
> defines the runtime that drives forward progress — the component that transforms
> `draft → running → completed` by dispatching work to devices and tracking results.
>
> **Status:** Draft (pre-Sprint 12)
> **Applies to:** Firmware Rollouts (v1.9.0), Batch Diagnostics (Sprint 12),
> Fleet Automation (Sprint 14)

---

## 1. Goals & Non-Goals

### Goals

- **Drive jobs to completion** — transition jobs and their device steps through
  their state machines, emitting audit events at every transition.
- **One runtime, many job types** — the same worker infrastructure handles
  firmware rollouts, batch diagnostics, fleet automation, and future job types
  through a common handler interface.
- **Crash-safe** — a worker crash mid-job does not corrupt state. Recovery is
  automatic via re-claiming uncompleted jobs.
- **Observable** — every transition is audited. Progress, failures, and
  bottlenecks are measurable.
- **Idempotent** — retrying a device step is safe. Duplicate dispatch does not
  cause double execution for non-idempotent handlers.

### Non-Goals

- **Device protocol specifics** — the runtime does not know how to flash
  firmware or run a diagnostic test. Handlers implement device communication.
- **Firmware binary storage** — the runtime references packages by ID; binary
  storage is a separate concern.
- **Real-time guarantees** — polling-based execution is sufficient. Sub-second
  latency is not required.
- **Horizontal scaling of a single job** — one worker owns one job. Multiple
  jobs can run on different workers.
- **Scheduling** — future-dated or cron-style execution is out of scope for
  v1.  Workers process jobs that are already in `running` status.

---

## 2. Architecture

### System Overview

```
             REST API (expresses intent)
                 │
                 ▼
         ┌────────────────┐
         │   rollouts     │
         │   status =     │
         │   "running"    │
         └────┬───────────┘
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
  Worker A            Worker B        (process, stateless)
    │
    ├─ claim lease
    ├─ UPDATE rollouts SET lease_holder = $me
    │
    ▼
  ┌──────────────────────┐
  │   rollout_devices    │   ← Worker-only writes
  └──────────────────────┘
    │
    ▼
  Device Handler (per job_type)
    │
    ├─ MQTT / HTTP / CoAP → device
    │
    ▼
  ┌───────────┐   ┌───────────┐
  │ audit_log │   │  metrics  │
  └───────────┘   └───────────┘
```

**Ownership principle:** The API expresses *intent*. The Worker drives *execution*.
The Database owns *truth*. Handlers own *device-specific behavior*.

### Persistence Boundary

Who is allowed to write which tables:

| Table | Writer | Reader | Notes |
|---|---|---|---|
| `rollouts` | API + Worker | API, Worker, Frontend | API creates, starts, requests cancel. Worker claims, completes, retries. |
| `rollout_devices` | **Worker only** | API, Worker, Frontend | API never writes directly. Per-device state is the worker's domain. |
| `firmware_packages` | API only | API, Worker | Worker reads for validation (`prepare`), never writes. |
| `audit_log` | API + Worker | Frontend | Both layers emit their own events. Worker events include `workerId`. |
| `device_groups` | API only | API, Worker | Immutable to the worker. |
| `diagnostic_results` | Worker | API, Frontend | Worker writes results after `execute()` returns. |

**Rule:** If a table tracks execution progress (`rollout_devices`), the worker is
its sole writer. If a table tracks configuration or metadata, the API is its
sole writer. This prevents architectural drift over time.

### Ownership Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  POST /rollouts          → status = "draft"                 │
│  POST /rollouts/:id/start → status = "running"              │
│  POST /rollouts/:id/cancel → status = "cancelled" (request) │
│  GET  /rollouts          → read current state               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ observes jobs in "running"
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Execution Worker                         │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ Job Claimer  │  │ Device Dispatcher│  │ Completion       │  │
│  │ (poll + lock)│  │ (handler per job)│  │ Detector        │  │
│  └─────────────┘  └────────────────┘  └──────────────────┘  │
│                                                             │
│  ● Polls for unclaimed running jobs                          │
│  ● Claims exclusive ownership via lease                      │
│  ● Dispatches device steps through JobHandler interface      │
│  ● Tracks per-device progress                                │
│  ● Transitions job to terminal state when all devices done  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ writes device status
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database                                 │
│  rollouts              rollouts_devices   audit_log          │
│  ┌───────────┐        ┌──────────────┐   ┌──────────────┐   │
│  │ id        │        │ id           │   │ id           │   │
│  │ status    │──┐     │ rollout_id   │   │ action       │   │
│  │ job_type  │  │     │ device_id    │   │ description  │   │
│  │ start/end │  └────►│ status       │   │ details      │   │
│  │ lease     │        │ error_msg    │   │ timestamp    │   │
│  └───────────┘        │ started_at   │   └──────────────┘   │
│                       │ completed_at │                      │
│                       └──────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow (Normal Path)

```
1. API:   POST /rollouts/:id/start    → rollouts.status = "running"
2. Worker: SELECT * FROM rollouts
           WHERE status = 'running'
           AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
3. Worker: UPDATE rollouts SET lease_holder = $worker, lease_expires_at = $now+30s
           WHERE id = $id AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
           [if 0 rows affected, another worker claimed it → skip]
4. Worker: SELECT * FROM rollout_devices WHERE rollout_id = $id AND status = 'pending'
           [batch size: configurable, default 10]
5. Worker: For each device:
     a. UPDATE rollout_devices SET status = 'running', started_at = NOW() WHERE id = $id
     b. Call handler.execute(device, job_config)
     c. On success: UPDATE rollout_devices SET status = 'succeeded', completed_at = NOW()
     d. On failure: UPDATE rollout_devices SET status = 'failed', error_message = $msg
     e. Emit audit event for each device transition
6. Worker: After device batch:
     a. SELECT count of terminal vs total devices
     b. If all terminal:
        - On any failures: UPDATE rollouts SET status = 'failed', completed_at = NOW()
        - On all succeeded: UPDATE rollouts SET status = 'completed', completed_at = NOW()
     c. If pending devices remain → GOTO 4
     d. Emit audit event for job completion
7. Worker: Release lease: UPDATE rollouts SET lease_holder = NULL, lease_expires_at = NULL
```

---

## 3. Execution Lifecycle

### Rollout-Level State Machine

```
                          ┌──────────────────────┐
                          │        Draft          │
                          └──────────┬───────────┘
                                     │  POST /start
                                     ▼
                          ┌──────────────────────┐
                    ┌────►│       Running         │◄────────────┐
                    │     └──┬────┬────┬────┬────┘             │
                    │        │    │    │    │                  │
                    │        │    │    │    │                  │
                    │        ▼    ▼    ▼    ▼                  │
                    │   ┌─────┐ ┌──┐ ┌──┐ ┌──┐               │
                    │   │All  │ │Any│ │All│ │Cancel│          │
                    │   │ succ│ │fail│ │done│ │request│        │
                    │   └──┬──┘ └┬──┘ └┬──┘ └──┬───┘          │
                    │      │     │     │        │              │
                    │      ▼     ▼     ▼        ▼              │
                    │   ┌────┐ ┌────┐ ┌────┐ ┌────────┐      │
                    │   │Com-│ │Fail│ │Com-│ │Cancel- │      │
                    │   │plet│ │ed* │ │plet│ │led     │      │
                    │   │ed  │ │    │ │ed  │ │        │      │
                    │   └────┘ └────┘ └────┘ └────────┘      │
                    │                                         │
                    │  * "completed" if all devices terminal   │
                    │     "failed" if any device failed        │
                    │     (policy-configurable in job_config)  │
                    │                                         │
                    └─────────────────────────────────────────┘
                                 Retry → resets failed devices
                                         to pending, sets
                                         job back to running
                    (if it was terminal)
```

### Per-Device State Machine

```
             ┌──────────┐
             │  Pending  │
             └─────┬────┘
                   │  worker claims
                   ▼
             ┌──────────┐
      ┌──────│  Running  │──────┐
      │      └─────┬────┘      │
      │            │            │
      ▼            ▼            ▼
  ┌──────┐   ┌────────┐   ┌─────────┐
  │Succee│   │ Failed │   │Cancelled│
  │ded   │   │        │   │         │
  └──────┘   └───┬────┘   └─────────┘
                 │
                 │  retry (API)
                 ▼
             ┌──────────┐
             │  Pending  │
             └──────────┘
```

### Transition Ownership

| Transition | Owner | Notes |
|---|---|---|
| `draft → running` | **API** | `POST /rollouts/:id/start` — lightweight, no device work |
| `running → completed` | **Worker** | All devices succeeded |
| `running → failed` | **Worker** | Any device failed (policy-dependent) |
| `running → cancelled` | **API (request), Worker (executes)** | API sets `cancelled_at`; Worker marks pending devices as cancelled |
| `completed → running` | **Worker** | Implicit: retry of a completed job with failed devices resets to running |
| `failed → running` | **Worker** | Implicit: same as above |
| `pending → running` | **Worker** | Worker dispatches device |
| `running → succeeded` | **Worker** | Handler reports success |
| `running → failed` | **Worker** | Handler reports failure |
| `failed → pending` | **Worker** | Retry: resets device for re-execution |
| `pending → cancelled` | **Worker** | Cancel: marks unstarted devices |

**Rule:** Only the Worker writes `rollout_devices` status. The API never touches
per-device rows directly.

---

## 4. Worker Model

### Phase 1: Polling Worker (MVP)

The initial implementation is a simple polling loop — not a queue consumer or
event-driven subscriber. This is the right starting point because:

- **Reliable** — no broker dependency, no message loss, no DLQ management
- **Reconstructable** — job state lives entirely in the database
- **Simple to debug** — any worker's current activity is visible in the DB
- **Sufficient** — firmware rollouts and batch diagnostics do not need
  sub-second latency

```
Phase 1 (MVP):
API  →  Postgres  ←  Polling Worker

Phase 2 (optional, wake-up):
API  →  Postgres  ←  Notification (NOTIFY) + Polling Worker (watchdog)

Phase 3 (optional, scale):
API  →  Queue  →  Worker  →  Postgres
         (wake-up only; Postgres still source of truth)
```

### Phase 1 Poll Loop

```
while (true) {
  sleep(5s)  // configurable poll interval

  // Step 1: Claim available jobs
  jobs = db.query(
    SELECT * FROM rollouts
    WHERE status = 'running'
      AND (lease_holder IS NULL OR lease_expires_at < NOW())
    LIMIT $maxConcurrentJobs
  )

  for (job in jobs) {
    // Step 2: Acquire lease (atomic update)
    claimed = db.execute(
      UPDATE rollouts
      SET lease_holder = $workerId, lease_expires_at = NOW() + $leaseDuration
      WHERE id = $job.id
        AND (lease_holder IS NULL OR lease_expires_at < NOW())
    )
    if (claimed.rowCount === 0) continue  // another worker got it

    // Step 3: Execute job (async, with lease refresh)
    await executeJob(job)
  }
}
```

### Phase 2: Event-Driven Wake-Up (Future)

When polling latency becomes a bottleneck, add a lightweight notification
mechanism. The worker subscribes to a channel (Postgres `NOTIFY`, Redis pub/sub,
or a simple in-memory signal) that fires when `rollouts.status` changes to
`running`. The poll loop remains the fallback.

```
NOTIFY "job_ready" with rollout_id;
```

The worker wakes on notification, polls the DB for the specific job ID, and
processes it. The poll loop still runs as a watchdog for missed notifications.

### Phase 3: Queue-Mediated Dispatch (Future)

If queue-based dispatch becomes necessary for throughput or cross-service
boundaries, the queue serves as a wake-up mechanism only — the worker still
reads from the DB and writes results to the DB. The database remains the
single source of truth; the queue is a signalling layer, not an execution
state store.

### Worker Identity

Each worker instance generates a unique ID at startup (e.g. `worker-{hostname}-{pid}`).
This ID is used for lease claiming and appears in audit events so every
transition is attributable to a specific worker instance.

---

## 5. Job Claiming & Concurrency

### Lease Model

The runtime uses an optimistic locking / lease pattern rather than a queue:

```sql
-- Claim a job
UPDATE rollouts
SET
  lease_holder = $workerId,
  lease_expires_at = NOW() + interval '60 seconds'
WHERE id = $jobId
  AND status = 'running'
  AND (lease_holder IS NULL OR lease_expires_at < NOW());

-- Critical: check affected rows
-- rows_affected == 1 → lease acquired, worker owns this job
-- rows_affected == 0 → another worker owns it or job is no longer claimable
-- Workers MUST NOT proceed without confirming they hold the lease.

-- Refresh lease (during active processing)
UPDATE rollouts
SET lease_expires_at = NOW() + interval '30 seconds'
WHERE id = $jobId
  AND lease_holder = $workerId;

-- Release lease (on completion)
UPDATE rollouts
SET lease_holder = NULL, lease_expires_at = NULL
WHERE id = $jobId
  AND lease_holder = $workerId;
```

### Lease Parameters

| Parameter | Default | Notes |
|---|---|---|
| Lease duration | 60 seconds | Long enough for one device batch cycle |
| Lease refresh interval | 10 seconds | Heartbeat interval; must be < lease duration |
| Max concurrent jobs per worker | 5 | Prevents one worker from hoarding all jobs |
| Max devices per batch | 10 | Devices dispatched per poll cycle within one job |

### Lease Claim Contract

The claim SQL is an atomic compare-and-swap. The worker MUST check the
number of affected rows after execution:

```
rows_affected == 1 → lease acquired. Worker owns this job.
rows_affected == 0 → claim failed. Another worker holds the lease,
                     or the job is no longer in 'running' status.
                     Worker MUST NOT proceed.
```

This is the only mechanism that prevents two workers from processing
the same job concurrently. Ignoring `rows_affected` would introduce a race
condition. Every worker implementation must enforce this check.

| Parameter | Default | Notes |
|---|---|---|
| Lease duration | 60 seconds | Long enough for one device batch cycle |
| Lease refresh interval | 10 seconds | Heartbeat interval; must be < lease duration |
| Max concurrent jobs per worker | 5 | Prevents one worker from hoarding all jobs |
| Max devices per batch | 10 | Devices dispatched per poll cycle within one job |

### Lease Expiration Rule

```
lease_timeout = 60 seconds
heartbeat     = every 10 seconds

if now > lease_expires_at:
    → the lease is expired
    → any worker may claim the rollout
    → the previous lease holder is presumed dead
```

The worker refreshes its lease (`lease_expires_at = NOW() + 60s`) every 10
seconds while actively processing a job. If the worker crashes or stalls,
the lease expires 60 seconds after the last refresh.

**Why 60 seconds?** It's long enough that transient network issues or GC
pauses won't cause false expiration, but short enough that a dead worker's
job is re-claimed within a minute.

### Lease State Machine

```
Available (no lease holder, or expired)
    │
    ├─ claim ──→ Held (lease_holder = $worker)
    │                │
    │                ├─ refresh ──→ Held (lease_expires_at extended)
    │                ├─ release ──→ Available (on job completion)
    │                └─ crash ──→ Available (after lease_timeout)
    │
    └─ (another worker claims after expiration)
```

### Crash Recovery

If a worker crashes, its leases expire after the lease duration. On the next
poll cycle, another worker sees `lease_expires_at < NOW()` and claims the job.
The job resumes from wherever it was — pending devices are dispatched,
already-completed devices are untouched.

**Crash scenario:**
```
T=0:   Worker-1 claims job. lease_expires_at = T+60
T=10:  Worker-1 refreshes lease. lease_expires_at = T+70
T=15:  Worker-1 crashes
T=70:  Lease expires (60s after last refresh at T=10)
T=75:  Worker-2 polls, sees expired lease, claims job
T=80:  Worker-2 resumes processing pending devices
```

The worst-case delay is one lease duration + one poll interval.

**Crash scenario:**
```
T=0:  Worker-1 claims job
T=5:  Worker-1 crashes
T=35: Lease expires (30s after last refresh)
T=40: Worker-2 polls, sees expired lease, claims job
T=45: Worker-2 resumes processing pending devices
```

The worst-case delay is one lease duration + one poll interval.

### Concurrency Invariants

- A job is claimed by at most one worker at any time.
- A device is processed by at most one worker at a time (enforced by the
  `pending → running` state transition being an atomic UPDATE).
- Multiple workers can process different jobs simultaneously.
- A worker can process multiple jobs sequentially (configured by
  `maxConcurrentJobs`).

### Anti-Entropy: Stale Lease Recovery

As a defense-in-depth measure, a periodic background check (every 5 minutes)
reclaims jobs whose lease has expired and whose `cancelled_at` is set but
pending devices were never marked cancelled — a sign the cancelling worker
crashed mid-cleanup.

---

## 6. Handler Interface

The handler interface is the abstraction that makes the runtime generic.
Each `job_type` implements `JobHandler`, and the worker calls it at the
appropriate lifecycle points.

The interface separates **orchestration** (owned by the worker) from
**device-specific logic** (owned by the handler). The runtime controls the
dispatch loop, completion detection, and state transitions. The handler
controls what happens to each device and may prepare or finalize the job.

```typescript
/** Minimal context passed to execute() — the handler sees only what
 *  it needs to perform its device operation, not the full runtime state. */
interface ExecuteContext {
  deviceId: string;
  deviceType: string;
  jobConfig: Record<string, unknown>;  // type-specific payload
  // Utilities (not runtime internals)
  logger: Logger;
  recordResult: (key: string, value: unknown) => void;
}

interface JobResult {
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;  // handler-specific output
}

interface DeviceBatch {
  deviceIds: string[];
}

interface JobHandler {
  /** Unique identifier for this job type, matching rollouts.job_type. */
  readonly jobType: string;

  /** PREPARE — Called once when the worker claims the job, before any
   *  devices are dispatched.
   *  Validates prerequisites (e.g., firmware package still active,
   *  target devices reachable). Returns false to abort the job. */
  prepare(job: JobRecord): Promise<{ ok: boolean; reason?: string }>;

  /** NEXT BATCH — Select the next set of devices for this job.
   *  The runtime controls concurrency (batch size, rate limiting).
   *  The handler controls which devices are eligible (e.g., rolling
   *  groups, canary percentage, dependency ordering).
   *
   *  Ownership boundary:
   *  - Runtime: how many devices to process at once, when to pause/resume
   *  - Handler: which devices to process next, in what order
   *
   *  Default implementation: return all pending device IDs up to `limit`. */
  nextBatch?(job: JobRecord, limit: number): Promise<DeviceBatch>;

  /** EXECUTE — Perform the operation on a single device.
   *  Receives only what it needs: device identity, job configuration,
   *  and utility functions. The runtime manages the device's state
   *  machine (pending → running → succeeded/failed); the handler only
   *  decides success or failure. */
  execute(context: ExecuteContext): Promise<JobResult>;

  /** RETRY — Called when a device is retried after a previous failure.
   *  Default: calls execute(). Handlers may override for cleanup
   *  before retry (e.g., resetting device state, clearing flags).
   *
   *  Retry is never concurrent: the worker holds the lease and processes
   *  retried devices synchronously within its dispatch loop. No other
   *  worker can retry the same rollout simultaneously. */
  retry?(context: ExecuteContext): Promise<JobResult>;

  /** CANCEL — Called when the job is cancelled. Optional — the runtime
   *  does not require cancellation support. If unimplemented, in-flight
   *  devices are allowed to finish normally.
   *  The worker already marks pending devices as cancelled; this hook
   *  handles running devices that may need active teardown. */
  cancel?(job: JobRecord): Promise<void>;

  /** FINALIZE — Called after all devices in a job have reached a
   *  terminal state. Handlers may perform post-job cleanup, generate
   *  summaries, or emit additional audit events. */
  finalize?(job: JobRecord): Promise<void>;
}
```

**Separation rationale:** The runtime owns orchestration (`nextBatch`,
completion detection, state transitions). The handler owns device-specific
behavior (`execute`, `retry`, `cancel`). `prepare` and `finalize` are the
transition points between the two domains. This keeps firmware-specific
logic from leaking into the engine — a new job type implements the same
methods without touching the worker.

**Contract surface:** The `ExecuteContext` intentionally exposes less than
the full runtime state. This prevents handlers from depending on internal
worker fields that may change. If a handler needs more context, the
interface evolves explicitly rather than by implicit access.

### Firmware Rollout Handler (Example)

```typescript
class FirmwareRolloutHandler implements JobHandler {
  readonly jobType = "firmware";

  async prepare(job: JobRecord): Promise<{ ok: boolean; reason?: string }> {
    // Verify firmware package is still active
    const fw = await db.firmwarePackages.findById(job.firmwarePackageId);
    if (!fw || fw.status !== "active") {
      return { ok: false, reason: "Firmware package is no longer active" };
    }
    return { ok: true };
  }

  async execute(context: ExecuteContext): Promise<JobResult> {
    // In production: communicate with the device via MQTT/CoAP/HTTP
    // to trigger firmware download and installation.
    //
    // For MVP: simulate a successful update with a brief delay.
    const firmwarePackageId = context.jobConfig.firmwarePackageId;
    const result = await deviceClient.sendUpdateCommand(
      context.deviceId,
      firmwarePackageId,
    );
    return result;
  }

  async cancel(job: JobRecord): Promise<void> {
    // Send abort signal to any devices currently being updated
    await deviceClient.broadcastCancel(job.id);
  }
}
```

### Handler Registry

```typescript
const handlerRegistry = new Map<string, JobHandler>();

export function registerHandler(handler: JobHandler): void {
  handlerRegistry.set(handler.jobType, handler);
}

export function getHandler(jobType: string): JobHandler | undefined {
  return handlerRegistry.get(jobType);
}

// Registration at startup
registerHandler(new FirmwareRolloutHandler());
registerHandler(new BatchDiagnosticsHandler());  // Sprint 12
```

---

## 7. Cancellation Semantics

Cancellation is the hardest distributed systems problem in this design.
The following protocol defines exactly what happens, in what order, and
what guarantees the worker provides.

### Cancellation Flow

```
User clicks "Cancel" → POST /rollouts/:id/cancel
                             │
                             ▼
API sets:
  rollouts.status = 'cancelled'
  rollouts.cancelled_at = NOW()
                             │
                             ▼
Worker observes (next poll or immediate if notification-driven):
  rollout.status = 'cancelled'
                             │
                             ├── (1) STOP DISPATCHING NEW DEVICES
                             │     Worker does not claim new pending devices.
                             │     The next poll skips this job.
                             │
                             ├── (2) MARK PENDING DEVICES AS CANCELLED
                             │     UPDATE rollout_devices
                             │     SET status = 'cancelled'
                             │     WHERE rollout_id = $id
                             │       AND status = 'pending'
                             │
                             ├── (3) HANDLE RUNNING DEVICES
                             │     For each device in 'running':
                             │     ├── handler.cancel(job)
                             │     │   → sends abort signal to device
                             │     │   → device responds (ack or timeout)
                             │     ├── if handler confirms:
                             │     │   UPDATE SET status = 'cancelled'
                             │     └── if timeout:
                             │         UPDATE SET status = 'running' (leave as-is)
                             │         (in-flight device is allowed to complete)
                             │
                             └── (4) FINALIZE
                                   handler.finalize(job)
                                   Emit rollout.cancelled audit event
```

### Cancellation Guarantees

| Guarantee | Detail |
|---|---|
| **No new dispatches** | Once `cancelled_at` is set, the worker never dispatches new devices from this job. |
| **Pending devices are immediate** | Devices in `pending` are transitioned to `cancelled` in a single batch UPDATE — no per-device work. |
| **Running devices are best-effort** | The worker calls `handler.cancel()` for each running device. **Cancellation is handler-dependent — the runtime does not require every handler to support it.** If the handler does not implement `cancel()`, in-flight devices are allowed to finish and are marked `succeeded` or `failed` normally. |
| **Completion vs. cancellation** | A running device that finishes after cancellation is marked `succeeded` — the worker does not forcefully revert it. Cancellation stops *new* work, not *in-flight* work. |
| **Idempotent cancel** | Calling `POST /cancel` twice is safe. The second call observes `status = 'cancelled'` and returns success without side effects. |

### Design Rationale

Cancellation has two phases because pending and running devices have
different semantics:

- **Pending devices** are trivially cancellable — no work has started.
  A single UPDATE covers all of them atomically.
- **Running devices** are in an indeterminate state. The device may have
  received the command, be mid-execution, or be unreachable. The handler
  knows the protocol and decides what "abort" means for that job type.

This means cancellation latency is:
- **~0 for pending devices** (single UPDATE)
- **Handler-dependent for running devices** (typically 1–30 seconds
  per device, depending on protocol timeout)

---

## 8. State Machine Contract

### Invariants (Enforced at the Database Level)

1. **No direct transitions to terminal states exist in the API.**
   The API may set `cancelled_at` (requesting cancellation) but the actual
   device status changes are the worker's responsibility.

2. **The `rollout_devices.status` column is write-once by convention**
   (except retry). Once a device reaches `succeeded`, `skipped`, or
   `cancelled`, only an explicit retry resets it to `pending`.

3. **A rollout reaches terminal state only when all devices are terminal.**
   The worker computes this atomically: `count(terminal) == count(total)`.
   Terminal device states: `succeeded`, `failed`, `skipped`, `cancelled`.

4. **Workers never bypass state machine validation.**
   The `isValidRolloutTransition()` and `isValidDeviceTransition()` functions
   from the API are shared code (imported from a common module) used by both
   the API routes and the worker.

### Transition Table (Complete)

| Entity | From | To | Trigger | Owner | Idempotent |
|---|---|---|---|---|---|
| Rollout | `draft` | `running` | POST /start | API | Yes |
| Rollout | `running` | `completed` | All devices succeeded | Worker | Yes |
| Rollout | `running` | `failed` | Some devices failed | Worker | Yes |
| Rollout | `running` | `cancelled` | POST /cancel | API → Worker | Yes |
| Rollout | `completed` | `running` | POST /retry (implied) | Worker | Yes |
| Rollout | `failed` | `running` | POST /retry (implied) | Worker | Yes |
| Device | `pending` | `running` | Worker dispatch | Worker | Yes |
| Device | `running` | `succeeded` | Handler returns success | Worker | Yes |
| Device | `running` | `failed` | Handler returns failure | Worker | Yes |
| Device | `failed` | `pending` | Retry | Worker | Yes |
| Device | `pending` | `cancelled` | Job cancelled | Worker | Yes |
| Device | `running` | `cancelled` | Job cancelled + handler cleanup | Worker | No (handler-dependent) |

---

## 9. Idempotency & Retry

### Worker-Level Idempotency

The worker's dispatch loop is designed to be safe to interrupt and restart:

- Device status transitions use `UPDATE ... WHERE status = 'pending'`.
  If two workers race, exactly one wins; the loser's UPDATE affects 0 rows.
- Completed devices are not re-dispatched because the worker queries for
  `status = 'pending'` only.
- Audit events include the worker ID so duplicate events (from a retried
  dispatch cycle) can be identified and filtered.

### Handler-Level Idempotency

Handlers that communicate with devices over the network should implement
client-side idempotency:

- Include a request ID derived from `{rolloutId, deviceId, attemptNumber}`
  in the command sent to the device.
- Devices should reject duplicate commands with the same request ID.
- For firmware updates specifically: check the device's current firmware
  version before attempting an update; skip if already at the target.

### Retry Policy

| Parameter | Default | Notes |
|---|---|---|
| Max retries per device | 3 | Configurable per job in `job_config.maxRetries` |
| Backoff between retries | None for MVP | Future: exponential backoff `2^n * 30s` |
| Retry scope | Failed devices only | Retry never touches succeeded devices |
| Retry trigger | `POST /rollouts/:id/retry` | Explicit, not automatic |
| Automatic retry | Out of scope for v1 | Future: configurable auto-retry with threshold |

### Retry Concurrency Guard

Retry is never concurrent with other execution for the same rollout.
The worker must hold the lease before processing a retry, and retried
devices are processed synchronously within the worker's dispatch loop.

```
1. User clicks "Retry" → POST /rollouts/:id/retry
2. API validates rollout is in a retryable state (running/completed/failed)
3. Worker (next poll cycle, must hold lease):
   a. UPDATE rollout_devices
      SET status = 'pending', error_message = NULL, started_at = NULL, completed_at = NULL
      WHERE rollout_id = $id AND status = 'failed'
   b. If rollout was terminal (completed/failed) → UPDATE rollouts SET status = 'running'
   c. Dispatch retried devices through the normal execution loop

Invariant: A worker MUST hold the lease before executing a retry.
A retry without a lease creates a concurrent execution path.
```

### Completion Detection

Completion is derived from a SQL aggregation, never from in-memory counters:

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE status = 'running') AS running,
  COUNT(*) FILTER (WHERE status IN ('succeeded', 'failed', 'skipped', 'cancelled')) AS terminal
FROM rollout_devices
WHERE rollout_id = $id;
```

A rollout is terminal when `pending = 0 AND running = 0`. The worker
computes this from the database on every dispatch cycle — never from
an in-memory counter that could diverge after a crash.

This is a consequence of Invariant #9: workers never infer completion
from memory. The DB is the only source of truth for progress.

---

## 10. Observability

Observability is split into two independent categories:

- **Infrastructure metrics** — health of the worker itself (alive, leases,
  poll cycles, throughput). These tell you whether the runtime is functioning.
- **Business metrics** — outcome of jobs and device operations (duration,
  success rate, retry rate). These tell you whether the fleet is healthy.

The two categories evolve independently and are consumed by different audiences
(operations vs. product).

### Audit Events

Every state transition emits an audit event with a consistent schema:

```typescript
interface ExecutionAuditEvent {
  timestamp: string;
  workerId: string;
  jobId: string;
  jobType: string;
  entity: "rollout" | "rollout_device";
  entityId: string;
  transition: {
    from: string;
    to: string;
  };
  deviceId?: string;
  metadata?: Record<string, unknown>;
  duration?: number;  // ms since last transition for this entity
}
```

Required audit events:

| Event | When |
|---|---|
| `rollout.claimed` | Worker acquires lease on a job |
| `rollout.completed` | All devices terminal, job transitions to `completed` |
| `rollout.failed` | Devices failed, job transitions to `failed` |
| `rollout.cancelled` | Job cancelled, pending devices marked cancelled |
| `device.dispatch` | Device transitions `pending → running` |
| `device.succeeded` | Device transitions `running → succeeded` |
| `device.failed` | Device transitions `running → failed` |
| `device.retried` | Device transitions `failed → pending` for retry |
| `device.cancelled` | Device transitions `pending → cancelled` |
| `lease.refresh` | Worker refreshes lease (periodic, sampled) |
| `lease.expired` | Lease expired without release (crash indicator) |

### Infrastructure Metrics
(Worker health, operations consumption)

| Metric | Type | Labels | Notes |
|---|---|---|---|
| `worker_alive` | Gauge | `worker_id` | 1 if heartbeating, 0 if stalled |
| `leases_held` | Gauge | `worker_id` | Jobs currently claimed by this worker |
| `jobs_per_sec` | Rate | — | Jobs claimed per second (rolling 5m) |
| `pending_jobs` | Gauge | `job_type` | Jobs in `running` with no lease holder |
| `poll_cycle_ms` | Histogram | — | Duration of one complete poll cycle |
| `lease_expirations` | Counter | `worker_id` | Lease expired without release (crash indicator) |
| `device_queue_depth` | Gauge | `job_id` | Number of `pending` rollout_devices for active jobs |

### Business Metrics
(Fleet health, operations outcome)

| Metric | Type | Labels | Notes |
|---|---|---|---|
| `job_duration_ms` | Histogram | `job_type, status` | Time from claim to terminal for completed jobs |
| `job_success_rate` | Gauge | `job_type` | Rolling 7-day ratio of succeeded to total jobs |
| `devices_dispatched` | Counter | `job_type` | Total device dispatch attempts |
| `devices_succeeded` | Counter | `job_type` | Successful device operations |
| `devices_failed` | Counter | `job_type, error_code` | Failed device operations |
| `device_duration_ms` | Histogram | `job_type, status` | Time per device operation |
| `device_retry_rate` | Gauge | `job_type` | Ratio of retried to total devices |
| `device_throughput` | Rate | `job_type` | Devices completed per second |

### Structured Logging

```
{
  "level": "info",
  "worker": "worker-node-1-12345",
  "job_id": "abc-123",
  "job_type": "firmware",
  "device_id": "dev-456",
  "event": "device.dispatch",
  "from": "pending",
  "to": "running",
  "duration_ms": 0,
  "batch_index": 3,
  "batch_total": 10
}
```

### Health Indicators

The worker exposes a health endpoint or heartbeat:

```json
{
  "worker_id": "worker-node-1-12345",
  "status": "healthy",
  "uptime_seconds": 86400,
  "claimed_jobs": 2,
  "jobs_completed_total": 150,
  "devices_processed_total": 3200,
  "last_poll_cycle_ms": 120,
  "last_lease_refresh_ms": 8000,
  "is_polling": true
}
```

Unhealthy signals:
- `is_polling: false` — worker's poll loop has stalled (process is alive but not making progress)
- `last_poll_cycle_ms > 5 * poll_interval` — poll cycle taking too long
- `last_lease_refresh_ms > 2 * lease_duration` — worker stopped refreshing leases

---

## 11. Worker Invariants

These are the non-negotiable rules that every worker implementation must
preserve, regardless of `job_type`.

| # | Invariant | Enforced By | Violation Consequence |
|---|---|---|---|
| 1 | **A device is processed by at most one worker at a time.** | `UPDATE ... WHERE status = 'pending'` returns 0 rows on race | Data corruption — duplicate device operations |
| 2 | **A terminal device state is immutable except through an explicit retry.** | Worker only queries `status = 'pending'` for dispatch | Lost retry semantics |
| 3 | **A rollout reaches terminal state only after all devices are terminal.** | Worker counts terminal vs total before transition | Incorrect completion signals |
| 4 | **Workers never bypass state-machine validation.** | Shared `isValidTransition()` in common module | Invalid state transitions |
| 5 | **Every state transition emits an audit event.** | Worker calls `emitAuditEvent()` in the same transaction | Non-reconstructable history |
| 6 | **Handlers are deterministic for the same input and device state.** | Handler contract (documented, not enforcable at runtime) | Non-reproducible failures |
| 7 | **A worker must release or refresh its lease within the lease duration.** | `lease_expires_at` check on every poll cycle | Delayed crash recovery |
| 8 | **The API never writes to `rollout_devices`.** This is the primary architectural boundary between orchestration and execution. | Code review + route design; `rollout_devices` is worker-only domain | State machine bypass, concurrent execution paths, phantom completions |
| 9 | **Workers never infer completion from memory. Completion is computed exclusively from persisted `rollout_device` state.** | Poll loop reads device counts from DB each cycle | Subtle crash recovery bugs — phantom completions |
| 10 | **The worker is stateless. Everything needed to resume execution must exist in Postgres.** | No in-memory job queues; all state in DB | Crash = lost progress, horizontal scaling impossible |

Invariant #9 prevents a class of subtle bugs that emerge after crashes: a
worker that was mid-way through dispatching a batch crashes, restarts, and
must not assume "I was about to mark device X as completed." It must re-read
from the DB and compute what actually happened.

Invariant #10 is the enabler for crash recovery, horizontal scaling, rolling
deployments, and debugging. If any state lives only in the worker's memory
(an in-flight HTTP request, a cached device list, an uncommitted audit event),
then a crash loses that state. The database is the only durable memory.

---

## 12. Future Extensions

### Batch Diagnostics (Sprint 12)

Implements `JobHandler` with `job_type = "diagnostics"`:

- `job_config` specifies which diagnostic tests to run
- `execute()` sends a diagnostic command to the device and records results
- Results stored in a new `diagnostic_results` table keyed by `rollout_device.id`
- Frontend reads results via `GET /rollouts/:id/devices/:deviceId/diagnostics`

### Fleet Automation (Sprint 14)

Implements `JobHandler` with `job_type = "automation"`:

- `job_config` defines automation rules (e.g., "update firmware on all devices
  with battery < 20%")
- `prepare()` evaluates rule conditions against the current fleet state
- `execute()` applies the automation action (firmware update, config change, etc.)

### Scheduled Jobs (Future)

- A scheduler service creates rollouts with `status = "draft"` on a cron schedule
- A separate `POST /rollouts/:id/start` call (or the scheduler calling start)
  transitions to `running`, where the worker picks it up
- No changes to the worker needed — it only cares about `running` jobs

### Canary Deployments (Future)

- A rollout targets a percentage of devices (e.g., 10%) by storing
  `job_config.canaryPercent: 10`
- The `nextBatch()` handler selects which devices to include
- If the canary succeeds, a follow-up rollout targets the remaining devices
- The worker dispatches whatever devices are in the `rollout_devices` table

---

## 13. Implementation Order

### Phase 1: Worker Skeleton (Sprint 12, Week 1)

- [ ] Poll loop with configurable interval
- [ ] Job claiming with lease model
- [ ] Lease refresh mechanism
- [ ] Handler registry
- [ ] Basic `Logger` and `emitAuditEvent` utilities
- [ ] Configuration (poll interval, lease duration, max concurrency, batch size)

### Phase 2: Core Execution (Sprint 12, Week 1-2)

- [ ] Device dispatch loop (batch select + status update)
- [ ] Completion detection (all terminal → transition job)
- [ ] `JobHandler` interface with `execute()`, `prepare()`,  and `cancel()`
- [ ] FirmwareRolloutHandler implementation (simulated device communication)
- [ ] Integration test: create rollout → start → worker completes it

### Phase 3: Retry & Resilience (Sprint 12, Week 2-3)

- [ ] Retry flow (failed → pending → re-execute)
- [ ] Crash recovery (lease expiry → re-claim)
- [ ] Anti-entropy: stale lease recovery
- [ ] Audit events for all transitions
- [ ] Metrics collection

### Phase 4: Diagnostics Integration (Sprint 12, Week 3-4)

- [ ] BatchDiagnosticsHandler
- [ ] Diagnostics result storage
- [ ] Per-device diagnostic result API
- [ ] Integration test: diagnostics job through the same worker

---

## Appendix: Key Design Decisions

### Why polling over a message queue?

The database is the source of truth for job state. Adding a message queue (RabbitMQ,
Redis, SQS) introduces a new failure mode: the queue and DB can diverge. Polling
keeps the architecture simple and the database as the single source of truth.

If queue-based dispatch becomes necessary for latency or throughput, the queue
becomes a wake-up mechanism only — the worker still reads from the DB and writes
results to the DB.

### Why lease-based claiming over partitioning?

Partitioning (worker-1 owns rollouts with even IDs, worker-2 owns odd IDs) is
simpler for claiming but creates hot spots and requires rebalancing when workers
join or leave. Leasing is more flexible: any worker can claim any job, and
rebalancing is automatic.

### Why not use the API routes for execution?

The API routes are synchronous HTTP handlers. Execution work is inherently
asynchronous and may take minutes or hours. Keeping execution out of the API
layer prevents request timeouts, keeps API response times predictable, and
allows the worker to retry without the client waiting.

### Why is `cancel()` handler-dependent for running devices?

A device currently being updated is in an indeterminate state. The handler
knows the protocol — whether it can send a "stop" command, whether the device
can safely abort mid-update, and what cleanup is needed. The worker cannot
make these decisions generically.
