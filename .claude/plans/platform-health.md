# Plan: Platform Health Subsystem (v1.5.4)

## Goal

Replace hardcoded service status in `/admin/health` and the Settings Maintenance tab with a real `GET /api/admin/health` endpoint that checks all platform services and returns live metrics.

## Design

### Backend: `GET /api/admin/health`

All checks happen inside the **one API process** — no separate health-check services needed:

| Service | Check Method | How It Works |
|---------|-------------|--------------|
| **API** | `process.uptime()` | Already in-process |
| **Database** | `pool.query("SELECT 1")` + `pg_database_size()` | Already have `pg` pool |
| **MQTT** | `net.connect(host, 1883)` → success/refused/timeout | Node.js built-in `net` module, no extra deps |
| **Bridge** | Expose bridge-listener's Socket.IO `connected` status | Already in-process via `bridge-listener.ts` |
| **Simulator** | Query DB: `SELECT COUNT(*) FROM events WHERE timestamp > NOW() - INTERVAL '30 seconds'` | Checks if simulator is actively publishing |

**Response shape** — matches existing `PlatformService` type so frontend needs no new types:

```json
{
  "overallStatus": "healthy",
  "lastChecked": "2026-07-15T...",
  "services": [
    {
      "id": "api",
      "name": "API Service",
      "status": "healthy",
      "description": "...",
      "uptime": 45230,
      "lastCheck": "2026-07-15T...",
      "metrics": [
        { "label": "Uptime", "value": "12h 33m" },
        { "label": "Memory", "value": "124 MB" },
        { "label": "Version", "value": "v1.5.x" }
      ]
    },
    {
      "id": "database",
      "name": "Database",
      "status": "healthy",
      "description": "PostgreSQL 16",
      "uptime": 45230,
      "lastCheck": "2026-07-15T...",
      "metrics": [
        { "label": "Connections", "value": "12" },
        { "label": "Storage", "value": "2.3 GB" },
        { "label": "Latency", "value": "3ms" }
      ]
    },
    {
      "id": "mqtt",
      "name": "MQTT Broker",
      "status": "healthy",
      "description": "Mosquitto message broker",
      "uptime": 45230,
      "lastCheck": "2026-07-15T...",
      "metrics": [
        { "label": "Port", "value": "1883" },
        { "label": "Status", "value": "Connected" },
        { "label": "Host", "value": "localhost" }
      ]
    },
    {
      "id": "bridge",
      "name": "Realtime Bridge",
      "status": "healthy",
      "description": "Socket.IO event gateway",
      "uptime": 45230,
      "lastCheck": "2026-07-15T...",
      "metrics": [
        { "label": "Connected", "value": "Yes" },
        { "label": "Realtime URL", "value": "ws://localhost:3002" },
        { "label": "Status", "value": "Active" }
      ]
    },
    {
      "id": "simulator",
      "name": "Device Simulator",
      "status": "healthy",
      "description": "Telemetry simulator",
      "uptime": 45230,
      "lastCheck": "2026-07-15T...",
      "metrics": [
        { "label": "Devices", "value": "24" },
        { "label": "Last Event", "value": "12s ago" },
        { "label": "Status", "value": "Active" }
      ]
    }
  ]
}
```

### Overall Status Computation

```
overallStatus =
  any "down"       → "down"
  any "degraded"   → "degraded"
  else             → "healthy"
```

Each service is:
- **down** if TCP check refused/timeout (MQTT), query fails (DB), socket disconnected (Bridge), no recent events (Simulator), or process exited (API)
- **degraded** if slow response or intermittent connectivity
- **healthy** otherwise

## Files to Create

### `apps/api/src/routes/admin-health.ts`
- Export `adminHealthRoutes(app)` — registers `GET /health` under api prefix
- Implements all 5 health checks
- Exposes bridge-listener connection state (add an accessor to bridge-listener.ts)

### `apps/web/src/hooks/use-platform-health.ts`
- `usePlatformHealth()` hook using TanStack Query with 15s polling

## Files to Modify

### `apps/api/src/socket/bridge-listener.ts`
- Add `getBridgeStatus()` exported function returning `{ connected: boolean, url: string }`

### `apps/api/src/index.ts`
- Register `adminHealthRoutes` at `/api/admin/health`

### `apps/web/src/lib/query-keys.ts`
- Add `admin.health` query key

### `apps/web/src/lib/admin.ts`
- Add `getPlatformHealth()` API client function

### `apps/web/src/app/(dashboard)/admin/health/page.tsx`
- Replace `staticServices` + derived API/DB services with single hook call
- Remove all static/placeholder code (~lines 43-92)
- Keep the same card rendering UI and status config — just feed it real data
- Add auto-polling via `refetchInterval: 15_000` (already in the hook)

### `apps/web/src/app/(dashboard)/settings/page.tsx`
- In the Maintenance tab's "Service Status" section, import and use the platform health hook
- Replace hardcoded MQTT "Connected to mosquitto://localhost:1883" and "PostgreSQL 16 — 2.3 GB used" with live values from the health endpoint

## Implementation Order

1. Add `getBridgeStatus()` accessor to `bridge-listener.ts`
2. Create `admin-health.ts` route with all 5 service checks
3. Register the new route in `index.ts`
4. Add `admin.health` to `query-keys.ts`
5. Add `getPlatformHealth()` to `lib/admin.ts`
6. Create `use-platform-health.ts` hook
7. Rewrite Platform Health page — remove all hardcoded services, use hook
8. Update Settings Maintenance tab to reuse health data
9. Verify with `pnpm lint && pnpm build`
