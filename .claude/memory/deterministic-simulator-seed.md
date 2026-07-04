---
name: deterministic-simulator-seed
description: Future improvement — make simulator device IDs stable across restarts via SIMULATOR_SEED
metadata:
  type: reference
---

## Next improvement: Deterministic Simulator Seed

**Problem:** Simulator generates random UUIDs (`faker.string.uuid()`) every restart, treating each run as entirely new devices. TTL cleanup mitigates the accumulation, but it doesn't fix the root cause — devices shouldn't appear to churn on every restart.

**Fix needed in:** `packages/mock/src/device-generator.ts`

**Approach:** Add a `SIMULATOR_SEED` env var (e.g., `SIMULATOR_SEED=sentience-demo`). When set, pass it to `faker.seed()` so the same device IDs are generated every run. When unset, keep current random behavior.

**Reference:** The user suggested the env var name `SIMULATOR_SEED`.

This was deferred to keep the current deploy focused on the TTL cleanup fix in the realtime bridge.
