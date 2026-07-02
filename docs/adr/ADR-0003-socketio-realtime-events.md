# ADR-0003: Use Socket.IO for Real-Time Events

## Status

Accepted

## Context

The Sentience IoT platform requires real-time updates: device telemetry (battery, voltage, temperature, signal strength), device status changes (online/offline/fault), alert creation and resolution, and dashboard KPI counter updates. These events originate from field devices, pass through an MQTT broker, and must reach browser clients with sub-second latency.

The constraints on this decision were:

- Must support bi-directional communication (server can push events without a client request).
- Must handle intermittent connectivity gracefully — the platform operates over cellular and industrial networks where connections drop frequently.
- Must support room-based subscriptions so clients only receive events for their authorized estates, sites, or devices.
- Must integrate with existing Zustand stores (see ADR-0001) and invalidate TanStack Query caches (see ADR-0002).
- Must not require the client to poll the server for updates.

## Decision

Use Socket.IO as the real-time event transport layer.

- Socket.IO runs on top of WebSocket with automatic fallback to HTTP long-polling when WebSocket is unavailable (corporate firewalls, proxy servers).
- Auto-reconnect is built in — the client library reconnects with exponential backoff, which is essential for cellular-connected IoT deployments.
- Room-based subscriptions allow the server to scope events by estate, site, or device, so clients only receive relevant traffic.
- The `notification-store` (Zustand) already has `addNotification()` ready to receive events from the Socket.IO feed.
- Invalidation of TanStack Query caches on socket events prevents stale data (e.g., a device status change arriving via socket invalidates the device list query).

## Consequences

### Positive

- Auto-reconnect out of the box — no custom heartbeat, ping/pong, or reconnection logic to write. Socket.IO's built-in reconnection handles exponential backoff, which maps directly to the IoT use case of flaky cellular connections.
- WebSocket with transparent fallback — in environments where WebSocket is blocked (corporate proxies, some VPNs), Socket.IO degrades to HTTP long-polling without any application-level changes.
- Room-based scoping — the server can emit to `room:estate:abc123` and only connected clients subscribed to estate ABC receive the event. This maps cleanly to the multi-tenant estate/site hierarchy.
- Acknowledgement callbacks — Socket.IO supports message-level acknowledgements, which can be used for delivery guarantees on critical events (alerts, status changes).
- Type-safe event contracts — both client and server can share typed event interfaces, reducing runtime mismatches.

### Negative / Tradeoffs

- Adds ~12 kB gzipped to the client bundle — acceptable within the <150 kB target but not negligible.
- Requires a Socket.IO server (Node.js) — the existing Next.js app will need a companion server or a custom server configuration. This is a deployment and scaling consideration not present with pure HTTP APIs.
- Not a standard WebSocket — Socket.IO uses its own protocol on top of WebSocket, which means non-Socket.IO clients cannot connect directly. This is not an issue for browser clients but matters if native mobile apps or embedded devices need direct WebSocket access (they should use the MQTT layer directly instead).
- MQTT bridge required — field devices speak MQTT, not Socket.IO. A server-side bridge must translate MQTT messages into Socket.IO events, mapping topics to rooms and serializing payloads.

## Alternatives Rejected

**Raw WebSocket (ws).** Rejected because there is no built-in reconnection — every reconnect, backoff, and heartbeat must be hand-rolled. No room/subscription pattern means a server-side subscription manager must be built from scratch. No fallback transport means if WebSocket fails (proxy, firewall), the connection drops with no recourse. No acknowledgement protocol means delivery confirmation must be layered on manually.

**Server-Sent Events (SSE).** Rejected because SSE is uni-directional — the server can push to the client but the client cannot send messages over the same connection. No built-in reconnection. HTTP/1.1 connections per origin limit (typically 6) restricts how many SSE connections a browser can hold open — problematic if the app opens one per estate. No room-based subscription pattern.

**Polling (setInterval + fetch).** Rejected because latency is bounded by the poll interval — sub-second updates are impossible without unacceptable request volume. Wasteful — most polls return no new data. Scales poorly — N clients × 1-second poll interval × M devices generates N × M × 86400 requests per day.

**MQTT.js in the browser.** Rejected because it exposes MQTT broker details to the browser, which is a security concern (device credentials, topic structures). MQTT.js in the browser does not handle reconnection as robustly as Socket.IO. The app needs a server-side translation layer anyway for auth, authorization, and event transformation — Socket.IO serves this role while MQTT remains the backbone for device-side communication. Socket.IO room subscriptions map naturally to the estate/site/device hierarchy, while MQTT topic filters are flat strings.
