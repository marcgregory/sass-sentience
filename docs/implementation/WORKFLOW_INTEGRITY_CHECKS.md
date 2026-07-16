# Workflow Integrity Checks

> Supplemental validation for execution-engine features (rollouts, jobs, diagnostics).
> Added during v1.9.0-rc1 as a Gate 4 extension to verify the engine directly.

---

## Purpose

UI E2E tests verify the visible behavior of a feature. Workflow integrity checks verify the **engine itself** — the state machine, data persistence, audit trail, and edge cases that the UI abstracts away.

This separation matters because the execution framework is designed for reuse. A bug in the engine affects every future feature built on it (Batch Diagnostics, Fleet Automation, policy engine). UI tests alone cannot guarantee engine correctness.

---

## Checklist

### State Machine Integrity

- [ ] Rollout: `draft → running → completed` — all status transitions valid
- [ ] Rollout: `draft → running → cancelled` — cancellation works
- [ ] Rollout: `draft → running → failed` — failure detection works
- [ ] Invalid transitions rejected: retry on completed, cancel on draft
- [ ] Per-device: `pending → running → succeeded | failed | skipped | cancelled`
- [ ] Per-device: retry resets `failed → pending`; `succeeded` untouched
- [ ] Per-device: cancel leaves `running` devices in-flight; `pending` unchanged

### Data Integrity

- [ ] `rollout_devices` row count = eligible device count
- [ ] No orphan `rollout_devices` rows (every row has a valid `rollout_id`)
- [ ] No orphan `rollout_devices` rows (every row has a valid `device_id`)
- [ ] Summary endpoint counts match raw SQL counts
- [ ] `completed_count + failed_count + skipped_count + cancelled_count + pending_count = total device_count`
- [ ] Completed rollouts are immutable — no further status changes

### Audit Trail

- [ ] Lifecycle events recorded: created, started, cancelled, retried, completed
- [ ] Each event has: actor (user ID), timestamp, rollout ID, action description
- [ ] No missing transitions in audit trail for a known rollout history
- [ ] Bulk retry produces one audit event (not N per-device events)

### Idempotency

- [ ] Retry on already-retried rollout: no-op (no duplicate devices)
- [ ] Cancel on already-cancelled rollout: no-op
- [ ] Duplicate eligibility request returns same result (for same state)

---

## When to Run

Run workflow integrity checks **during staging validation (Gate 4)** for any sprint that:

- Introduces or modifies the rollout/job execution framework
- Adds a new `job_type` discriminator value
- Changes the state machine transition logic
- Modifies audit event emission for execution features

Do NOT run these for pure UI changes or read-only features.
