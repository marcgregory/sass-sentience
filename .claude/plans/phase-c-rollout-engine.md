# Phase C — Rollout Engine Implementation Plan

## Analysis

The Rollout Engine has **strong backend scaffolding** already in place from Phases A/B:

| Component | Status |
|-----------|--------|
| DB schema (`rollouts`, `rollout_devices`) | ✅ Built (with CHECK constraints) |
| Type definitions (`@sentience/types`) | ✅ Built |
| API routes (`rollouts.ts`) | ✅ Built (create, list, detail, start, cancel, retry, devices, eligibility) |
| API client functions (`lib/firmware.ts`) | ✅ Built |
| TanStack Query hooks (`use-firmware.ts`) | ✅ Built |
| Query keys | ✅ Built |
| Permissions config | ✅ Built |
| Sidebar navigation | ✅ Built |
| Rollouts list page | ✅ Built |
| Rollout detail page | ✅ Built |

**What's missing** — the `Create Rollout` wizard page (linked from the list page as `/rollouts/create` but no file exists) and the rollout history section on the firmware package detail page.

---

## Scope

### Task 1 — Create Rollout Wizard Page (`/rollouts/create`)

A multi-step form page following the existing UI patterns:

**Step 1: Select Firmware Package**
- Dropdown/select listing active firmware packages
- Show name, version, device types in each option
- Filtered to `active` status only (deprecated excluded)

**Step 2: Select Target Device Group**
- Dropdown/select listing device groups
- Show name, device count
- Only groups with devices

**Step 3: Eligibility Preview**
- On selection of both firmware + group, call `GET /rollouts/eligibility/group/:groupId/package/:firmwarePackageId`
- Show eligible devices (green) and ineligible devices (gray/yellow) with reasons
- Shows counts: X eligible, Y ineligible

**Step 4: Name & Create**
- Free-text name field (default: `"<firmwareName> → <groupName>"`)
- Create button → `POST /rollouts`
- Loading state during creation
- On success, redirect to `/rollouts/<id>`
- On error, show inline error message

Empty states:
- No active firmware packages → disable step 1, show message
- No non-empty device groups → disable step 2, show message
- All devices ineligible → show warning, allow override creation

Loading states:
- Skeleton/pulse during eligibility fetch
- Button loading spinner during creation

### Task 2 — Rollout History on Firmware Package Detail Page

Replace the current empty-state stub in `firmware/[id]/page.tsx` with a live list of rollouts using the firmware package, showing:
- Rollout name, status badge, target group name, device count
- Clickable rows → navigate to `/rollouts/<id>`
- Empty state when no rollouts exist (keep current)

### Task 3 — TypeScript & Build Verification

- `pnpm lint && pnpm build` passes cleanly

---

## Non-Goals (Deferred)

- ❌ Real OTA delivery / MQTT commands
- ❌ Scheduling (cron/delayed start)
- ❌ Canary / staged rollout
- ❌ Automatic rollback
- ❌ WebSocket progress streaming
- ❌ Playwright E2E tests (separate sprint validation phase)

---

## Files to Create

1. `apps/web/src/app/(dashboard)/rollouts/create/page.tsx` — Multi-step wizard

## Files to Modify

2. `apps/web/src/app/(dashboard)/firmware/[id]/page.tsx` — Replace rollout history empty state with live data

## Acceptance Criteria

```
✓ Create rollout from firmware package + group (frontend wizard)
✓ Eligibility preview works in wizard
✓ TypeScript clean
✓ Build clean
✓ Load / empty / error states for wizard
✓ Rollout history visible on firmware package detail
```
