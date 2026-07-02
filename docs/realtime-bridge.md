# MQTT-to-Socket.IO Bridge (`apps/realtime`)

Connects the Mosquitto MQTT broker to the browser frontend via Socket.IO. Subscribes to device telemetry, status, and events on MQTT, normalizes the payloads, and emits typed Socket.IO events to connected clients.

This is the missing real-time layer that bridges the device simulator (or real hardware) and the Next.js web app.

## Architecture

```
┌──────────────────┐   MQTT    ┌──────────────────┐   WS    ┌─────────────┐
│  MQTT Simulator  │ ────────▶ │  @sentience/     │ ──────▶ │  Next.js    │
│  (packages/mock) │           │  realtime bridge  │         │  (Vercel)   │
│                  │           │                    │         │             │
│  sentience/      │           │  - subscribe MQTT  │         │  useSocket  │
│  devices/{id}/   │           │  - normalize       │         │  hook       │
│  telemetry       │           │  - emit Socket.IO  │         │             │
│  status          │           │  - room routing    │         │             │
│  events          │           │                    │         │             │
└──────────────────┘           └─────────┬──────────┘         └─────────────┘
                                         │
                                         │ Mosquitto
                                         ▼
                                  ┌──────────────┐
                                  │  Eclipse      │
                                  │  Mosquitto    │
                                  │  (Docker)     │
                                  └──────────────┘
```

## Running

### Prerequisites

- Docker Desktop (for Mosquitto)
- Node.js >= 18, pnpm installed
- All workspace dependencies installed

### 1. Start the MQTT broker

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 2. Start the device simulator

```bash
pnpm --filter @sentience/mock simulate -- --count 5
```

### 3. Start the realtime bridge

```bash
pnpm --filter @sentience/realtime start
```

Or with custom options:

```bash
MQTT_URL=mqtt://localhost:1883 \
  SOCKET_PORT=3001 \
  CORS_ORIGIN=http://localhost:3000 \
  pnpm --filter @sentience/realtime start
```

### 4. Start the web app

```bash
pnpm --filter @sentience/web dev
```

### 5. Open the browser and verify

Open the browser at `http://localhost:3000`. The bridge logs show:

```
═══ MQTT → Socket.IO Bridge ═══
  MQTT:    mqtt://localhost:1883
  Socket:  port 3001
  CORS:    http://localhost:3000

[mqtt] Subscribed to 3 topic patterns
[socket] Server listening on port 3001
[status] dev-abc: online → online
[telemetry] dev-abc → battery=78%
```

### 6. Expected result in the UI

After all four services are running:

1. **Dashboard** — The header connection indicator shows a green `Live` badge. KPI cards (Total Devices, Online, Offline, Faults, Warnings) update to reflect live simulator data. The System Health donut chart and Recent Alerts panel populate from the live event feed.
2. **Devices page** — Device rows show live battery %, signal strength, and temperature values that update without a page refresh. Status badges reflect the latest status from the simulator.
3. **Events page** — Live `event:new` messages appear as new timeline entries.
4. **Alerts page** — Critical/warning/info events from the live feed populate the alert list.

### Quick-start command sequence

```bash
# Terminal 1: MQTT broker
docker compose -f docker/docker-compose.yml up -d

# Terminal 2: Device simulator (5 devices)
pnpm --filter @sentience/mock simulate -- --count 5

# Terminal 3: Realtime bridge
pnpm --filter @sentience/realtime start

# Terminal 4: Web app
pnpm --filter @sentience/web dev
```

### Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| Header shows "Disconnected" | Realtime bridge not running or wrong port |
| No devices appearing on dashboard | Simulator not publishing — check terminal 2 |
| Values not updating | Socket.IO disconnected — check terminal 3 logs |
| Simulator starts but bridge sees no MQTT | Mosquitto not running — `docker ps` to verify |

### Architecture overview

```
┌──────────────────┐   MQTT    ┌──────────────────┐   WS    ┌─────────────────────┐
│  MQTT Simulator  │ ────────▶ │  @sentience/     │ ──────▶ │  Next.js            │
│  (packages/mock) │           │  realtime bridge  │         │  (apps/web)          │
│                  │           │                    │         │                      │
│  sentience/      │           │  - subscribe MQTT  │         │  useSocket() hook    │
│  devices/{id}/   │           │  - normalize       │         │  ↓                   │
│  telemetry       │           │  - emit Socket.IO  │         │  live-device-store   │
│  status          │           │  - room routing    │         │  (Zustand, ephemeral)│
│  events          │           │                    │         │  ↓                   │
└──────────────────┘           └─────────┬──────────┘         │  Dashboard / Devices │
                                         │                    │  / Events / Alerts   │
                                         │ Mosquitto          └─────────────────────┘
                                         ▼
                                  ┌──────────────┐
                                  │  Eclipse      │
                                  │  Mosquitto    │
                                  │  (Docker)     │
                                  └──────────────┘
```

Data flow: **Simulator → MQTT → Mosquitto → Realtime Bridge → Socket.IO → Web app → Zustand live store → React re-render**

Events are also invalidated in the TanStack Query cache for behind-the-scenes data consistency, but the live store provides instant UI updates without waiting for query refetches.

## Incoming MQTT payload → outgoing Socket.IO events

| MQTT topic | MQTT payload | Socket.IO event | Normalized payload |
|-----------|-------------|-----------------|-------------------|
| `sentience/devices/{id}/telemetry` | Flat JSON with deviceId, battery, signal, temperature, timestamp | `device:telemetry` | `{ deviceId, siteId, battery, voltage, temperature, signalStrength, timestamp }` |
| `sentience/devices/{id}/status` | Flat JSON with deviceId, status, fault, warning, timestamp | `device:status` | `{ deviceId, siteId, status, previousStatus, timestamp }` |
| `sentience/devices/{id}/events` | Flat JSON with deviceId, eventType, battery/signal/temperature context | `event:new` | `{ eventId, deviceId, category, severity, title, timestamp }` |
| `sentience/devices/{id}/events` (fault/warning) | Same as events | `device:diagnostic` | `{ deviceId, siteId, diagnostic: { type, status, message }, timestamp }` |

## Room routing

| Room | Scope | Emitted when |
|------|-------|-------------|
| `room:dashboard` | All connected clients | Every event |
| `room:device:{deviceId}` | Subscribers to a specific device | Every event for that device |
| `room:site:{siteId}` | Subscribers to a specific site | Device belongs to a known site |
| `room:estate:{estateId}` | Subscribers to a specific estate | Device belongs to a known estate |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MQTT_URL` | `mqtt://localhost:1883` | MQTT broker URL |
| `MQTT_USERNAME` | (none) | MQTT broker username (required for production) |
| `MQTT_PASSWORD` | (none) | MQTT broker password (required for production) |
| `SOCKET_PORT` | `3001` | Socket.IO server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `MQTT_TOPIC_PREFIX` | `sentience` | MQTT topic prefix |
| `LOG_LEVEL` | `info` | `debug` for per-message telemetry log |

## Frontend compatibility

The bridge emits events that match the `ServerToClientEvents` interface in `apps/web/src/lib/socket-client.ts`. The frontend `useSocket` hook at `apps/web/src/hooks/use-socket.ts` listens for these events and invalidates the TanStack Query cache accordingly.

The `device:status` event triggers invalidation of the devices list query. The `device:telemetry` event invalidates a single device detail query. The `event:new` event invalidates the events list query (and potentially the device detail query if the event references a specific device).

## Development

```bash
# Watch mode (restarts on file changes)
pnpm --filter @sentience/realtime dev

# TypeScript check
pnpm --filter @sentience/realtime lint

# Run tests
pnpm --filter @sentience/realtime test
```
