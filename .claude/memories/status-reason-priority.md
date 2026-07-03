---
name: status-reason-priority
description: Severity-based priority in deriveDeviceHealth for consistent status derivation
metadata:
  type: reference
---

`deriveDeviceHealth()` in `packages/utils/src/selectors.ts` collects ALL applicable status reasons first, then derives the final status from the **most severe** reason using this hierarchy:

```
Offline  ── highest priority (returns immediately, heartbeat or raw offline)
Fault    ── overrides Warning
Warning  ── overrides Online (default when no reasons)
```

Offline is handled as an early return because it's definitive regardless of telemetry values. For fault vs warning, the function checks whether any reason is `BATTERY_CRITICAL` or `HARDWARE_DIAGNOSTIC_FAILED` — if so, status is `fault`; otherwise `warning`.

This prevents inconsistent results if checks are ever reordered. Previously, early returns meant that `BATTERY_CRITICAL` was the only fault reason ever collected — now the function gathers all reasons (e.g., `BATTERY_CRITICAL` + `WEAK_SIGNAL`) and picks the right status.

**Why:** A device with `BATTERY_CRITICAL` (fault) and `WEAK_SIGNAL` (warning) should show as `fault`, not whichever check runs last.

**Related:** [[status-reasons-arch]] — the original reasons implementation.
