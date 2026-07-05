# Testing Strategy

> Authoritative reference for the project's testing layers. Each layer serves a distinct purpose and validates a different level of the stack.
> Last updated: 2026-07-06

---

## Why Three Layers?

Each testing layer answers a different question. A single approach cannot validate the full stack efficiently:

| Layer                                       | Question Answered                                                   |
| ------------------------------------------- | ------------------------------------------------------------------- |
| Unit Tests                                  | "Does this function/component work correctly in isolation?"         |
| Playwright UI Regression Suite (API Mocked) | "Does the frontend render and behave correctly given known input?"  |
| Full-Stack End-to-End Validation            | "Does the entire system work together against real infrastructure?" |

---

## Layer 1 — Unit Tests

**Purpose:** Validate individual functions, hooks, and components in isolation.

**What it covers:**

- Pure functions in `@sentience/utils` (formatters, selectors, color maps, `cn()`)
- Zustand store logic (reducers, actions, derived state)
- API client functions and query key construction
- Shared React hooks (edge cases, loading states, error handling)

**What it does NOT cover:**

- Component rendering (use Playwright for that)
- Cross-package integration
- Real API behavior
- Browser behavior

**Runs on:** Every PR (via `pnpm lint` / `pnpm test` once configured)
**Expected duration:** <30 seconds

**Tooling:** Vitest (recommended — matches Next.js/Vite ecosystem)

---

## Layer 2 — Playwright UI Regression Suite (API Mocked)

**Purpose:** Validate frontend rendering, routing, and user interaction against mocked API responses.

**Coverage:**

- Authentication flows (login, logout, redirect, role switching)
- RBAC enforcement (nav filtering, route guards, access denied states)
- Page rendering (loading, empty, error, and populated states)
- User interactions (mark as read, create dialog, channel toggle)
- Responsive layout at 375px, 768px, and 1280px+ breakpoints

**Limitations:**

- Uses `page.route()` to intercept all API calls — no real backend is involved
- Does NOT validate:
  - Backend correctness
  - Database persistence
  - Real-time event flow (MQTT → Bridge → Socket.IO)
  - Authentication middleware (JWT verification, token expiry)
  - Customer data isolation
  - API key authentication
- Does NOT detect backend regressions or API contract violations

**Runs on:** Every PR
**Expected duration:** ~3 minutes

**Tooling:** Playwright (Chromium headless)

See `apps/web/e2e/` for spec files and fixtures.

---

## Layer 3 — Full-Stack End-to-End Validation

**Purpose:** Validate the complete production stack using real infrastructure.

**Coverage:**

- Real backend (Fastify 5 API server)
- PostgreSQL database (data persistence, query correctness)
- MQTT broker (Mosquitto — telemetry ingestion)
- Realtime WebSocket (Socket.IO — event routing, room isolation)
- Authentication middleware (login → JWT → protected resource round-trip)
- Customer isolation (customer A cannot read customer B data across all endpoints)
- Notification pipeline (Simulator → MQTT → Bridge → alert:created → DB → notification:new)
- API Keys lifecycle (create → authenticate → revoke)
- Reports generation from real persisted data
- Notification Rules persistence and enforcement
- Device lifecycle (register → telemetry → decommission)

**Real infrastructure required:**

- Docker Compose (or equivalent) for: PostgreSQL, Mosquitto
- Running `apps/api` server
- Running `apps/web` Next.js server
- Running realtime bridge
- Running MQTT simulator (or equivalent telemetry generator)

**Runs on:** Before releases and nightly (not on every PR)
**Expected duration:** 15–30 minutes

**Success Criteria:**

- MQTT publish persists telemetry in PostgreSQL
- Alerts generate correctly from real event thresholds
- Notifications persist to DB and broadcast via Socket.IO
- Customer isolation verified across all data endpoints
- Reports generated from real (not mocked) data
- No mocked API routes used in any test

---

## Test Selection Guide

| Scenario                     | Layer 1         | Layer 2          | Layer 3       |
| ---------------------------- | --------------- | ---------------- | ------------- |
| New utility function         | ✅ Unit         | —                | —             |
| New page component           | ✅ Unit (hooks) | ✅ UI Regression | —             |
| New API endpoint             | —               | —                | ✅ Full-Stack |
| RBAC change                  | —               | ✅ UI Regression | ✅ Full-Stack |
| Notification pipeline change | —               | ✅ UI Regression | ✅ Full-Stack |
| Database schema change       | —               | —                | ✅ Full-Stack |
| Authentication flow change   | —               | ✅ UI Regression | ✅ Full-Stack |
| Responsive layout fix        | —               | ✅ UI Regression | —             |
| Performance optimization     | ✅ Unit         | —                | —             |

---

## Future Layers (Planned)

As the project matures, these layers may be added:

- **Performance / Load Tests** — k6 or Artillery for API throughput under load
- **Security Tests** — OWASP ZAP or similar for automated vulnerability scanning
- **Contract Tests** — Pact or similar to validate API contracts between frontend and backend
- **Visual Regression Tests** — Percy or Playwright screenshot diffs for UI drift detection
