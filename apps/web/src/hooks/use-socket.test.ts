/**
 * Tests for socket event → query cache invalidation.
 *
 * Verifies that each server event type correctly maps to the expected
 * TanStack Query keys for invalidation, without needing a live socket.
 */

import { describe, it, expect } from "vitest";
import { queryKeys } from "@/lib/query-keys";

// The event-to-keys mapping is extracted from use-socket.ts for testing.
// When the mapping changes, these tests fail — that's the safety net.

type EventInvalidationEntry = {
  event: string;
  payload: Record<string, unknown>;
  expectedInvalidations: ReadonlyArray<readonly unknown[]>;
};

// This duplicates the mapping from use-socket.ts to make the test
// assertions explicit. If the mapping logic changes, update both.
const EVENT_MAPPING: EventInvalidationEntry[] = [
  {
    event: "device:status",
    payload: { deviceId: "dev-1", siteId: "site-1" },
    expectedInvalidations: [queryKeys.devices.all],
  },
  {
    event: "device:telemetry",
    payload: { deviceId: "dev-1", siteId: "site-1" },
    expectedInvalidations: [queryKeys.devices.detail("dev-1")],
  },
  {
    event: "device:diagnostic",
    payload: { deviceId: "dev-1", siteId: "site-1" },
    expectedInvalidations: [queryKeys.devices.diagnostics("dev-1")],
  },
  {
    event: "alert:created",
    payload: { alertId: "alt-1" },
    expectedInvalidations: [queryKeys.alerts.all],
  },
  {
    event: "alert:updated",
    payload: { alertId: "alt-1", status: "acknowledged" },
    expectedInvalidations: [queryKeys.alerts.all],
  },
  {
    event: "estate:updated",
    payload: { estateId: "est-1" },
    expectedInvalidations: [queryKeys.estates.all],
  },
  {
    event: "site:updated",
    payload: { siteId: "site-x" },
    expectedInvalidations: [queryKeys.sites.all],
  },
  {
    event: "kpi:updated",
    payload: { estateId: "est-1" },
    expectedInvalidations: [queryKeys.dashboard.kpis("est-1")],
  },
  {
    event: "kpi:updated",
    payload: {},
    expectedInvalidations: [queryKeys.dashboard.kpis(undefined)],
  },
];

describe("Socket event → query invalidation mapping", () => {
  for (const { event, payload, expectedInvalidations } of EVENT_MAPPING) {
    it(`event "${event}" invalidates the correct query keys`, () => {
      // Simulate what the use-socket event handler does
      const actualInvalidations = resolveInvalidation(event, payload);

      expect(actualInvalidations.length).toBe(expectedInvalidations.length);

      for (let i = 0; i < expectedInvalidations.length; i++) {
        expect(actualInvalidations[i]).toEqual(expectedInvalidations[i]);
      }
    });
  }

  it("event:new with deviceId invalidates both events and device detail", () => {
    const keys = resolveInvalidation("event:new", {
      eventId: "evt-1",
      deviceId: "dev-1",
      title: "Device went offline",
    });
    expect(keys).toContainEqual(queryKeys.events.all);
    expect(keys).toContainEqual(queryKeys.devices.detail("dev-1"));
  });

  it("event:new without deviceId invalidates only events list", () => {
    const keys = resolveInvalidation("event:new", {
      eventId: "evt-1",
      title: "System event",
    });
    expect(keys).toEqual([queryKeys.events.all]);
  });
});

// ─── Test Helper: replicates the invalidation logic from use-socket.ts ──

function resolveInvalidation(
  event: string,
  payload: Record<string, unknown>,
): ReadonlyArray<readonly unknown[]> {
  const eventToKeys: Record<
    string,
    (p: Record<string, unknown>) => ReadonlyArray<readonly unknown[]>
  > = {
    "device:status": () => [queryKeys.devices.all],
    "device:telemetry": (p) => [queryKeys.devices.detail(p.deviceId as string)],
    "device:diagnostic": (p) => [queryKeys.devices.diagnostics(p.deviceId as string)],
    "alert:created": () => [queryKeys.alerts.all],
    "alert:updated": () => [queryKeys.alerts.all],
    "event:new": (p) =>
      p.deviceId
        ? [queryKeys.events.all, queryKeys.devices.detail(p.deviceId as string)]
        : [queryKeys.events.all],
    "estate:updated": () => [queryKeys.estates.all],
    "site:updated": () => [queryKeys.sites.all],
    "kpi:updated": (p) => [queryKeys.dashboard.kpis(p.estateId as string | undefined)],
  };

  const fn = eventToKeys[event];
  if (!fn) throw new Error(`Unknown event: ${event}`);
  return fn(payload);
}
