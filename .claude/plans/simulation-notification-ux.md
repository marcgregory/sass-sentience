# Plan: Simulation Mode — Complete Notification UX Without Persistence

## Overview

The backend bridge listener already handles simulated notifications correctly (no DB writes, broadcasts `isSimulated: true` over WebSocket). The frontend store and socket handler also handle them. However, three UX gaps remain that make the simulated experience feel broken.

## Current State

| Aspect | Status |
|--------|--------|
| No DB writes for simulated notifs | ✅ Correct — `bridge-listener.ts` fast-path |
| Socket handler routes to `addSimulatedNotification` | ✅ Correct — `use-socket.ts` line 228 |
| Header badge counts simulated + API | ✅ Correct — `useNotificationUnreadCount` line 82 |
| "Simulated" badge on notifications page | ✅ Correct — page.tsx line 254 |
| Merge simulated with API for display | ✅ Correct — page.tsx line 83-108 |
| **Unread count on notifications page** | **❌ Bug — shows API count (0) instead of merged** |
| **Filters not applied to simulated notifs** | **❌ Bug — filtering "unread only" still shows read simulated notifs** |
| **Simulator stop doesn't clear simulated notifs** | **❌ Missing — `simulator:reset` handler doesn't clear** |
| **Simulator mode toggle off→on shows stale notifs** | **❌ Minor — should clear when toggling off** |

## Three Changes Required

### Change 1: `notification-store.ts` — Add `clearSimulatedNotifications` action

Add a method that removes all `isSimulated: true` notifications from the store and subtracts their unread count. Needed for simulator-reset cleanup and mode toggle.

### Change 2: `use-socket.ts` — Clear simulated notifs on simulator:reset

In the existing `simulatorResetHandler`, add a call to clear simulated notifications from the store so they disappear when the simulator stops.

Also add the same clear when toggling simulator mode OFF via a new event or the existing toggle mechanism.

### Change 3: `notifications/page.tsx` — Fix unread count and filtering

- **Line 130**: Replace `data?.unreadCount ?? ...` with `notifications.filter(n => !n.isRead).length` so the page shows the true merged unread count
- Apply the page's active filters (`filterRead`, `filterCategory`) to simulated notifications before they get merged, so filtering by "unread only" works correctly for simulated notifs too

## Files Modified

1. `apps/web/src/stores/notification-store.ts` — Add action
2. `apps/web/src/hooks/use-socket.ts` — Wire clear on reset
3. `apps/web/src/app/(dashboard)/notifications/page.tsx` — Fix count + filter

## What Stays Unchanged

- `bridge-listener.ts` — No changes needed
- `packages/types/src/notification.ts` — No changes
- `apps/api/src/routes/notifications.ts` — No changes
- `apps/web/src/hooks/use-notifications.ts` — No changes (badge already correct)
- `apps/web/src/lib/notifications.ts` — No changes
