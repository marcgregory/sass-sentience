# Plan: Fix Stale Live-Device Cache After Simulator Restart

## Problem

When the simulator is restarted (via admin health page → Render deploy API), the frontend's Zustand live-device store, live-alert store, and TanStack Query cache still hold old device data. These stale entries remain visible until the user manually refreshes the browser.

## Root Cause

The restart flow (`POST /api/admin/simulator/restart`) only calls the Render deploy API. There is no Socket.IO event emitted to tell connected frontend clients to clear their caches. The frontend has no way to know the simulator fleet changed.

## Solution

Add a `simulator:reset` Socket.IO event that the frontend health page emits after a successful restart. The realtime bridge rebroadcasts it to all connected clients, and every client clears its live stores and invalidates React Query caches.

```
Admin clicks "Restart Simulator"
  → POST /api/admin/simulator/restart (existing)
  → onSuccess: socket.emit("simulator:reset", payload) [NEW]
  → Bridge broadcasts to all clients via room:dashboard [NEW]
  → All frontend tabs clear live stores + invalidate queries [NEW]
```

### Why emit from the frontend, not the API server?

The realtime bridge (port 3002) is the only Socket.IO server the frontend connects to. The API server (port 3001) has its own Socket.IO for user notifications. Emitting from the frontend is simpler than routing through two Socket.IO servers or adding MQTT publish to the API route.

---

## Changes (5 files)

### 1. `apps/realtime/src/socket-server.ts` — Add `SIMULATOR_RESET` event

- Add `SIMULATOR_RESET: "simulator:reset"` to the `EVENTS` constant.
- In the `io.on("connection")` handler, add a listener for client-emitted `"simulator:reset"` that broadcasts the payload to `room:dashboard`.

### 2. `apps/web/src/lib/socket-client.ts` — Add event type + emit helper

- Add `"simulator:reset"` to `ServerToClientEvents` (frontend receives it) with payload: `{ sessionId: string; deviceCount: number; startedAt: string }`.
- Add `"simulator:reset"` to `ClientToServerEvents` (frontend can emit it).
- Export a `simulatorReset()` helper function that gets the socket and emits the event.

### 3. `apps/web/src/hooks/use-socket.ts` — Handle `simulator:reset` event

- Add `"simulator:reset"` to the `eventToKeys` invalidation map → invalidate `devices.all`, `alerts.all`, `events.all`, `dashboard.kpis(undefined)`.
- Add a live-store handler that:
  - Calls `useLiveDeviceStore.getState().clearLiveState()`
  - Calls `useLiveAlertStore.getState().clearAlerts()`
- Add a toast notification via the notification store: "Simulator restarted — refreshing live devices".

### 4. `apps/web/src/app/(dashboard)/admin/health/page.tsx` — Emit event on restart

- Import `getSocket` from `@/lib/socket-client`.
- In `handleRestartSimulator`'s `onSuccess` callback, after the existing `notifyRestart` call, get the socket and emit `"simulator:reset"` with a payload containing `sessionId`, `deviceCount`, and `startedAt`.

### 5. `apps/web/src/lib/query-keys.ts` — No changes needed (already has `devices.all`, `alerts.all`, `events.all`, `dashboard.kpis`)

---

## Acceptance Criteria

1. **Restart simulator from admin health page** → old simulator devices disappear without browser refresh.
2. **New devices appear** as telemetry arrives via the existing Socket.IO stream.
3. **Dashboard device count** resets correctly (was showing old+synthetic count).
4. **Devices table** does not mix old and new simulator fleets.
5. **Multiple open tabs** — all tabs clear simultaneously (the event is broadcast via the bridge).
6. **`pnpm lint` and `pnpm build`** pass.
7. **No regression** in existing telemetry/status/event/alert handling.

## Edge Cases

- **Simulator not running**: The emit still fires. Stores clear, queries invalidate. New telemetry won't arrive until the simulator connects and publishes. This is the desired behavior (shows "no devices" instead of stale ones).
- **Socket disconnected**: `getSocket()` auto-reconnects. If the socket is not connected when emit is called, the event is silently dropped (Socket.IO stores it in the write buffer if `volatile: false`). To handle this, we check `socket.connected` before emitting.
- **Rapid successive restarts**: Each restart emits a new event. Stores are idempotent (clear+invalidate is safe to call repeatedly).
