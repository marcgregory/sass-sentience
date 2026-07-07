# Remove Hardcoded Mock Dashboard Statistics

## Problem

When Simulator Mode is OFF, the dashboard shows hardcoded mock values
(2847 devices, 2631 online, 87.2 fleet health, fake estate summaries,
fake battery/signal/temperature distributions). This is misleading —
the database has real seeded data (24 devices, 4 estates, real alerts).
When the DB is empty, it should show proper zeros.

## Files to Change

| File | Change |
|------|--------|
| `apps/api/src/routes/dashboard.ts` | **Create** — new `GET /api/dashboard/summary` endpoint |
| `apps/api/src/index.ts` | Register dashboard routes |
| `apps/web/src/lib/dashboard.ts` | **Create** — `getDashboardSummary()` API client function |
| `apps/web/src/lib/query-keys.ts` | Add `dashboard.summary` query key |
| `apps/web/src/app/(dashboard)/dashboard/use-dashboard-data.ts` | **Rewrite** — remove all `MOCK_*` constants, replace with TanStack Query for DB data |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Update banner text, remove "mock data" language |

## Implementation Steps

### Step 1: Create GET /api/dashboard/summary

**File:** `apps/api/src/routes/dashboard.ts`

New route with `requireAuth` preHandler. Customer data isolation applied.

Returns:

```json
{
  "totalDevices": 24,
  "onlineDevices": 12,
  "offlineDevices": 3,
  "faultCount": 4,
  "warningCount": 5,
  "batteryDistribution": [
    { "label": "Good (>60%)", "value": 67, "count": 12, "color": "bg-emerald-500" },
    { "label": "Fair (20–60%)", "value": 22, "count": 4, "color": "bg-amber-500" },
    { "label": "Low (<20%)", "value": 11, "count": 2, "color": "bg-red-500" }
  ],
  "signalDistribution": [
    { "label": "Excellent", "value": 28, "count": 5, "color": "bg-emerald-500" },
    { "label": "Good", "value": 33, "count": 6, "color": "bg-blue-500" },
    { "label": "Fair", "value": 22, "count": 4, "color": "bg-amber-500" },
    { "label": "Poor", "value": 17, "count": 3, "color": "bg-red-500" }
  ],
  "temperatureDistribution": [
    { "label": "Normal", "value": 72, "count": 13, "color": "bg-emerald-500" },
    { "label": "High", "value": 22, "count": 4, "color": "bg-amber-500" },
    { "label": "Critical", "value": 6, "count": 1, "color": "bg-red-500" }
  ],
  "fleetHealth": 68.5,
  "estates": [...],
  "sites": 8,
  "openAlerts": 7
}
```

**Query strategy** (all in one route handler):
- Count devices by status (`GROUP BY status`)
- Query estates for counts (they have `deviceCount`, `onlineCount`, etc. pre-computed)
- Count sites
- Compute battery/signal/temperature distributions from devices table
- Compute fleet health: `onlineRatio * 40 + batteryHealthRatio * 30 + signalHealthRatio * 30`
- Count open alerts
- Apply `customerScope()` for multi-tenant isolation

### Step 2: Register the route

Add to `apps/api/src/index.ts`:
```ts
import { dashboardRoutes } from "./routes/dashboard";
await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
```

### Step 3: Create API client

**File:** `apps/web/src/lib/dashboard.ts`

```ts
import { get } from "./api-client";

export interface DashboardSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  faultCount: number;
  warningCount: number;
  batteryDistribution: { label: string; value: number; count: number; color: string }[];
  signalDistribution: { label: string; value: number; count: number; color: string }[];
  temperatureDistribution: { label: string; value: number; count: number; color: string }[];
  fleetHealth: number;
  estates: { id: string; name: string; total: number; online: number; offline: number; fault: number; warning: number }[];
  sites: number;
  openAlerts: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return get<DashboardSummary>("/dashboard/summary");
}
```

### Step 4: Add query key

Add to `query-keys.ts`:
```ts
dashboard: {
  summary: ["dashboard", "summary"] as const,
  kpis: (estateId?: string) => ["dashboard", "kpis", estateId] as const,
},
```

### Step 5: Rewrite useDashboardData hook

**Remove all mock constants** (`MOCK_KPIS`, `MOCK_HEALTH`, `MOCK_BATTERY`, `MOCK_SIGNAL`, `MOCK_TEMPERATURE`, `MOCK_ESTATES`).

New mode logic:

| Simulator ON + live data | Simulator ON + no data | Simulator OFF |
|---|---|---|
| Live device store (unchanged) | Zero state (unchanged) | **TanStack Query → API → DB data** |

When Simulator is OFF, use `useQuery` with `queryKeys.dashboard.summary` to fetch from the API.

The hook returns the same shape, just the data source changes:
- `hasLiveData` — `true` only when simulator is ON and has data
- `isSocketConnected` — only meaningful for simulator mode
- When simulator is OFF but API returns data: show DB values, `hasLiveData = false`
- When DB is empty (0 devices): show zeros, `hasLiveData = false`
- When API fails: `isError` state, show zeros with retry option

The component already handles `hasLiveData = false` gracefully — it shows the "Simulator not running" banner with database values. Just need to update the banner text to remove "showing mock data."

**No mock fallback on error** — if the API call fails, show zeros and a retry button.

### Step 6: Update banner text in page.tsx

The banner at line 120 says "showing mock data" — change to "showing database values" or similar.

## States

| State | KPIs | Charts | Alerts/Activity | Banner |
|-------|------|--------|-----------------|--------|
| Sim ON + live data | From store | From store | From store events | "Simulator Mode Active" |
| Sim ON + no data | All zeros | Zeros | Empty | "Simulator waiting for data" |
| Sim OFF + API OK + DB has data | From API | From API | From API (open alerts) | None |
| Sim OFF + API OK + DB empty | All zeros | Zeros | Empty | None |
| Sim OFF + API error | All zeros | Zeros | Empty | "Retry Connection" button |
| Sim OFF + socket offline (MQTT down) | From API (DB data) | From API | From API | "Realtime unavailable" (NEW) |

## Key Principle

Never return mock data. If the data source has nothing, return zeros. If the API errors, return zeros with a retry. No fake numbers at any layer.
