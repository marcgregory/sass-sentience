# Runtime Conformance Checklist

> **Checklist for every `JobHandler` implementation.**
> A handler must pass all items before it can be registered in the execution runtime.
>
> **Applies to:** FirmwareRolloutHandler, BatchDiagnosticsHandler,
> AutomationHandler, and any future job type.
>
> **Status:** Active (Sprint 12+)

---

## Interface Conformance

- [ ] Implements `prepare()` — validates prerequisites before execution begins
- [ ] Implements `execute()` — performs the device operation and returns success/failure
- [ ] Implements `retry()` — or is satisfied with the default (calls `execute()` again)
- [ ] Implements `cancel()` — or explicitly documents that in-flight devices will complete without interruption
- [ ] Implements `finalize()` — or has no post-job cleanup requirements
- [ ] `jobType` is unique across all registered handlers

## Idempotency

- [ ] `execute()` is safe to call multiple times for the same device-state input
- [ ] Duplicate execution does not cause side effects (device is already at target state)
- [ ] Request ID derivation: `{rolloutId, deviceId, attemptNumber}` or equivalent
- [ ] Devices reject duplicate commands with the same request ID

## Persistence

- [ ] Handler does not write to `rollout_devices` directly (runtime-owned table)
- [ ] Handler does not write to `rollouts` directly (runtime-owned table)
- [ ] All handler output is returned via `JobResult.metadata`, not written to runtime tables
- [ ] No mutable in-memory state retained between `execute()` calls

## Cancellation

- [ ] If cancellation is supported: `cancel()` sends a best-effort abort signal to devices
- [ ] If cancellation is not supported: handler documents that in-flight devices will finish before the job transitions to `cancelled`
- [ ] Cancellation does not corrupt device state (device is left in a valid, known state)

## Retry

- [ ] `retry()` resets device state to a clean pre-execution condition
- [ ] Retry does not touch devices that already succeeded
- [ ] Retry respects the concurrency invariant (requires lease ownership)

## Audit

- [ ] All device-level state transitions (pending → running, running → succeeded/failed, failed → pending) are emitted as audit events
- [ ] Audit events include `workerId`, `jobType`, `deviceId`, and transition `from → to`
- [ ] Audit events are emitted within the same logical operation as the state change

## Determinism

- [ ] Given the same device state and job configuration, `execute()` produces the same outcome
- [ ] No dependence on handler-internal counters, timers, or caches

## Observability

- [ ] Handler logs are structured JSON with `job_id`, `device_id`, and `event` fields
- [ ] Handler does not log directly to stdout without structured context
- [ ] Metrics: handler contributes to device throughput, duration, and success/failure counters

## Integration

- [ ] Passes the runtime integration test suite:
  - [ ] Handler processes a single device successfully
  - [ ] Handler processes a batch of devices
  - [ ] Handler handles device failure gracefully (returns `{ success: false }`)
  - [ ] Handler retry: failed device is reset → retried → succeeds
  - [ ] Handler cancel: job is requested to cancel → pending devices marked cancelled → in-flight devices handled per contract
  - [ ] Handler idempotency: duplicate dispatch does not cause errors
  - [ ] Handler produces correct audit events for all transitions
