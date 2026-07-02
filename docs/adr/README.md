# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Sentience IoT platform. Each ADR documents a significant architectural decision, including the context, the decision, and its consequences.

## Index

| ADR | Title | Status | Decision |
|-----|-------|--------|----------|
| [ADR-0001](ADR-0001-zustand-client-ui-state.md) | Use Zustand for Client/UI State | Accepted | Zustand for client/UI state; no Redux, Context, or Jotai |
| [ADR-0002](ADR-0002-tanstack-query-server-state.md) | Use TanStack Query for Server State | Accepted | TanStack Query for server data; no SWR, RTK Query, or manual fetch |
| [ADR-0003](ADR-0003-socketio-realtime-events.md) | Use Socket.IO for Real-Time Events | Accepted | Socket.IO for real-time; no raw WebSocket, SSE, or polling |

## Status Meanings

| Status | Meaning |
|--------|---------|
| Accepted | Decision made and implemented |
| Proposed | Under consideration |
| Deprecated | Superseded by a newer ADR |
| Superseded | Replaced by a newer decision |

## Process

New ADRs are created when a significant architectural decision is made. Each ADR follows the established template: **Status → Context → Decision → Consequences → Alternatives Rejected**. When considering a change to the established architecture, read the relevant ADR first to understand the original rationale.
