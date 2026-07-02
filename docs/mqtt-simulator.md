# MQTT Device Simulator

Simulates a fleet of Sentience IoT devices publishing telemetry, status, and events over MQTT. Uses a local Mosquitto broker (Docker) and fake device data generated with Faker.

## Architecture

```
┌─────────────────────┐       MQTT (1883)       ┌──────────────────┐
│  device-simulator   │ ──────────────────────▶ │   Mosquitto      │
│  (packages/mock/)   │ ◀────────────────────── │   (Docker)       │
│                     │   subscribe/retain      │                  │
│  Device 1 ─────telemetry, status, events─────▶│  1883 TCP        │
│  Device 2 ─────telemetry, status, events─────▶│  9001 WebSocket  │
│  ...        ─────telemetry, status, events─────▶                  │
└─────────────────────┘                         └──────────────────┘
```

The simulator is completely separate from the web application. It exists only in `@sentience/mock`, which is never imported in production bundles (CLAUDE.md package-boundary rules).

## Prerequisites

- Docker Desktop (or Docker Compose standalone)
- Node.js >= 18, pnpm installed
- All workspace dependencies installed (`pnpm install`)

## Setup

### 1. Start the Mosquitto broker

```bash
# From the repo root
docker compose -f docker/docker-compose.yml up -d

# Verify it's running
docker compose -f docker/docker-compose.yml ps

# Watch the logs
docker compose -f docker/docker-compose.yml logs -f
```

Expected output:

```
NAME                  IMAGE                 COMMAND                  SERVICE    CREATED       STATUS       PORTS
sentience-mosquitto   eclipse-mosquitto:2   "/docker-entrypoint.…"   mosquitto   X seconds ago Up X seconds 0.0.0.0:1883->1883/tcp, 0.0.0.0:9001->9001/tcp
```

### 2. Run the device simulator

```bash
# Default: 5 simulated devices, connects to mqtt://localhost:1883
pnpm --filter @sentience/mock simulate

# Customize device count and broker URL
pnpm --filter @sentience/mock simulate -- --count 20 --broker mqtt://localhost:1883

# With all options
pnpm --filter @sentience/mock simulate -- \
  --count 10 \
  --broker mqtt://localhost:1883 \
  --telemetry-interval 15 \
  --status-change-probability 0.05
```

The simulator outputs:

```
[simulator] Connecting to mqtt://localhost:1883 (client: sentience-sim-a1b2c3)...
[simulator] Spawning 10 simulated devices...
[simulator] Connected. Publishing on sentience/devices/{id}/...
[simulator] Published initial status for 10 devices.
[simulator] Running. Press Ctrl+C to stop.
```

Press **Ctrl+C** to stop gracefully — all devices publish an `offline` status before disconnecting.

## MQTT Topics

| Topic | QoS | Retain | Frequency | Payload |
|-------|-----|--------|-----------|---------|
| `sentience/devices/{deviceId}/telemetry` | 1 | No | Every ~5-15s | Current sensor readings |
| `sentience/devices/{deviceId}/status` | 2 | Yes | On change + initial | Current device state |
| `sentience/devices/{deviceId}/events` | 1 | No | Status transitions + thresholds breached | Event record |

### Example Telemetry Payload

```json
{
  "deviceId": "abc123def456",
  "status": "online",
  "battery": 78,
  "signal": -65,
  "temperature": 24.5,
  "fault": false,
  "warning": false,
  "inputState": true,
  "outputState": false,
  "timestamp": "2026-07-02T19:30:00.000Z"
}
```

### Example Status Payload (retained)

```json
{
  "deviceId": "abc123def456",
  "status": "warning",
  "fault": false,
  "warning": true,
  "battery": 12,
  "signal": -105,
  "temperature": 43.2,
  "inputState": true,
  "outputState": true,
  "timestamp": "2026-07-02T19:35:00.000Z"
}
```

### Example Event Payload

```json
{
  "deviceId": "abc123def456",
  "eventType": "battery_low",
  "status": "warning",
  "battery": 12,
  "signal": -65,
  "temperature": 24.5,
  "fault": false,
  "warning": true,
  "inputState": true,
  "outputState": false,
  "threshold": 15,
  "timestamp": "2026-07-02T19:35:00.000Z"
}
```

## Verifying Messages Are Flowing

### Option 1: Subscribe with mosquitto_sub

```bash
# Subscribe to all Sentience topics
docker exec -it sentience-mosquitto mosquitto_sub -t "sentience/#" -v

# Subscribe to telemetry only
docker exec -it sentience-mosquitto mosquitto_sub -t "sentience/+/telemetry" -v

# Subscribe to a specific device's status (retained)
docker exec -it sentience-mosquitto mosquitto_sub -t "sentience/devices/<deviceId>/status" -v
```

### Option 2: Subscribe with the CLI

```bash
# Using mosquitto_sub from the host (if installed)
mosquitto_sub -h localhost -p 1883 -t "sentience/#" -v
```

### Option 3: Use MQTT Explorer

[MQTT Explorer](https://mqtt-explorer.com/) — a desktop GUI for browsing MQTT topics. Connect to `localhost:1883` and see:

```
sentience/
└── devices/
    ├── abc123/
    │   ├── telemetry   ← updates every ~10s
    │   ├── status      ← retained, shows current state
    │   └── events      ← created on status transitions
    ├── def456/
    │   ├── telemetry
    │   ├── status
    │   └── events
    ...
```

### Option 4: Programmatic subscription

```bash
# Use the simulator's own connection to verify
pnpm --filter @sentience/mock add -D mqtt
node -e "
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');
client.on('connect', () => {
  client.subscribe('sentience/+/telemetry', { qos: 1 });
  client.on('message', (topic, payload) => {
    const data = JSON.parse(payload.toString());
    console.log(topic, '→ battery:', data.battery, 'temp:', data.temperature);
  });
});
"
```

## Simulator Behavior

### Device count and fleet composition

Each simulated device has a random type (controller, sensor, gateway, relay, camera) and status biased toward healthy:

| Status  | Probability | Description |
|---------|-------------|-------------|
| online  | ~85%        | Healthy, publishing normally |
| warning | ~8%         | Minor issue (battery low, signal weak) |
| offline | ~5%         | Not reachable |
| fault   | ~2%         | Hardware fault |

### Status transitions

On each telemetry tick (every ~5-15s per device), there's a configurable probability of status change:

- **online → warning**: 5% per tick — battery or signal degradation
- **online → fault**: 2% — sudden hardware failure
- **warning → online**: 20% — self-recovery
- **warning → fault**: 15% — escalation
- **fault → online**: 10% — auto-recovery
- **offline → online**: 15% — reconnection

### Battery drain

Battery drains continuously with device-specific rates:
- **Normal devices**: ~0.2 units/tick
- **Warning devices**: ~1 unit/tick (faulty battery)
- **Fault devices**: ~2 units/tick (hardware issue)

When battery drops below 15%, the simulator emits `battery_low` events. When signal drops below -100 dBm, it emits `signal_weak` events.

### Graceful shutdown

On Ctrl+C, all devices:
1. Publish an event with the status transition (`online → offline`)
2. Publish a retained `offline` status
3. Disconnect cleanly

## Options Reference

| Argument | Default | Description |
|----------|---------|-------------|
| `--count` | 5 | Number of simulated devices |
| `--broker` | `mqtt://localhost:1883` | MQTT broker URL |
| `--telemetry-interval` | 10 | Base seconds between telemetry publishes |
| `--status-change-probability` | 0.02 | Probability of status transition per tick |

## What Changes When Using Real Hardware

### Topics

| Simulator | Real Hardware | Notes |
|-----------|---------------|-------|
| `sentience/devices/{id}/telemetry` | Same | Payload format remains identical |
| `sentience/devices/{id}/status` | Same | Real devices set retained=true on connect |
| `sentience/devices/{id}/events` | Same | Real devices add `source: "hardware"` |

### Differences

1. **Security**: Real hardware requires TLS and certificate-based auth. The simulator connects anonymously.
2. **Broker**: The simulator talks to a local broker. Real devices talk to a production broker (possibly cloud-hosted with an MQTT bridge).
3. **Payload precision**: Real sensor values have higher precision (e.g., temperature `24.53` instead of `24.5`).
4. **Timing**: Real devices publish on exact intervals (±100ms). The simulator jitters intervals to avoid thundering-herd issues.
5. **Topic structure**: The simulator uses `sentience/devices/{deviceId}/...`. If real hardware uses a different hierarchy (e.g., `site/{siteId}/device/{deviceId}/...`), the WebSocket event translator (socket-client.ts) would normalize both to the internal event format before dispatch.
6. **Fault simulation**: Real fault conditions involve actual hardware failures (disconnected sensor, power loss). The simulator models these statistically but the event payloads match.

### Integration path

```
Real hardware → MQTT → Mosquitto broker → MQTT bridge → Socket.IO server → Browser
                                                               ↓
Simulator    → MQTT → Mosquitto broker →          Socket.IO server → Browser
```

The simulator plugs into the left side of the same Mosquitto broker. When real hardware replaces simulated devices, the broker, Socket.IO bridge, and web app see no change — only the MQTT topic source changes.

## Running with Multiple Instances

You can run multiple simulator instances simultaneously to simulate devices from different sites:

```bash
# Terminal 1: 5 devices for Site A
pnpm --filter @sentience/mock simulate -- --count 5 --client-id sim-site-a

# Terminal 2: 3 devices for Site B
pnpm --filter @sentience/mock simulate -- --count 3 --client-id sim-site-b
```

## Troubleshooting

**"Connection refused" when starting the simulator:**

```
[simulator] Connecting to mqtt://localhost:1883...
Error: connect ECONNREFUSED ::1:1883
```

→ Start the Mosquitto broker first: `docker compose -f docker/docker-compose.yml up -d`

**"Address already in use" when starting Docker:**

Port 1883 is already taken. Stop the existing process:

```bash
# Check what's using port 1883
netstat -ano | findstr :1883

# Stop Docker (if it's the previous container)
docker compose -f docker/docker-compose.yml down
```

**No messages appearing in mosquitto_sub:**

Verify the simulator is running and the broker is listening:

```bash
# Check broker logs
docker compose -f docker/docker-compose.yml logs mosquitto

# Check simulator output
# (look for "Connected" and "Publishing" lines)
```
