# Phase D — Operations UI Implementation Plan

## Analysis: What Phase C Already Built

Phase C delivered the full create-wizard workflow. The list and detail pages already have substantial scaffolding:

| Component | Current State |
|-----------|---------------|
| Rollouts list (`/rollouts`) | ✅ Search + status filters, progress bars, pagination, loading/empty/error states |
| Rollout detail (`/rollouts/[id]`) | ✅ Summary card, progress bar, start/cancel/retry actions, device table with filters |
| Create wizard (`/rollouts/create`) | ✅ 4-step wizard (from Phase C) |

## The Gaps (Phase D scope)

### 1. Progress Summary Endpoint (NEW — API)
The user explicitly recommended this. Currently the UI has no efficient way to get aggregate device status counts. The per-device endpoint is paginated and doesn't serve dashboard-level summaries.

**`GET /api/rollouts/:id/summary`** returns:
```json
{
  "pending": 12,
  "running": 3,
  "succeeded": 181,
  "failed": 4,
  "skipped": 9,
  "cancelled": 0
}
```

### 2. Stat Cards on Detail Page (enhance existing detail)
Replace the single combined progress bar with individual stat cards showing each device status count, sourced from the summary endpoint.

### 3. Rollout Audit Trail on Detail Page (enhance existing detail)
Add an audit events section showing state-changing actions on the rollout: creation, start, cancel, retry. Query audit logs filtered by `resource=Rollout, resourceId=rolloutId`.

### 4. Firmware & Group Filters on List Page (enhance existing list)
Add dropdown-style filter buttons for firmware package and target group on the `/rollouts` list page.

### 5. TypeScript & Build Verification
`pnpm lint && pnpm build` passes cleanly.

## Non-Goals

- ❌ WebSocket/SSE real-time progress (future sprint)
- ❌ Date range filter (simple addition later, scope discipline)
- ❌ Pause/resume rollout actions

## Files to Create

1. `apps/api/src/routes/rollout-summary.ts` — New route for progress summary endpoint

## Files to Modify

2. `apps/api/src/index.ts` — Register the new route
3. `apps/api/src/routes/rollouts.ts` — Export state transition helpers for audit queries
4. `apps/web/src/lib/firmware.ts` — Add `getRolloutSummary()` API function + `RolloutSummary` type
5. `apps/web/src/hooks/use-firmware.ts` — Add `useRolloutSummary()` hook
6. `apps/web/src/app/(dashboard)/rollouts/[id]/page.tsx` — Add stat cards + audit trail
7. `apps/web/src/app/(dashboard)/rollouts/page.tsx` — Add firmware + group filters

## Acceptance Criteria

```
✓ Progress summary endpoint returns aggregate device status counts
✓ Stat cards on detail page (pending/running/succeeded/failed/skipped)
✓ Audit trail section on detail page
✓ Firmware package filter on list page
✓ Target group filter on list page
✓ TypeScript clean
✓ Build clean
```
