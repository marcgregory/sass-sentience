/**
 * Tests for the audit store — real vs simulated entries.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useAuditStore } from "@/stores/audit-store";

describe("audit-store", () => {
  beforeEach(() => {
    useAuditStore.getState().clear();
  });

  it("addEntry creates a non-simulated entry with id and createdAt", () => {
    const store = useAuditStore.getState();
    store.addEntry({
      userId: "user-1",
      userName: "Alice",
      userRole: "admin",
      action: "create",
      resource: "Estate",
      resourceId: "est-1",
      description: "Estate created",
    });

    const entries = useAuditStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].isSimulated).toBeUndefined();
    expect(entries[0].id).toMatch(/^AUD-/);
    expect(entries[0].createdAt).toBeDefined();
  });

  it("addSimulatedEntry creates an entry with isSimulated: true", () => {
    const store = useAuditStore.getState();
    store.addSimulatedEntry({
      id: "SIM-001",
      userId: "simulator",
      userName: "System",
      userRole: "system",
      action: "create",
      resource: "simulator",
      description: "Simulator started",
      createdAt: new Date().toISOString(),
      isSimulated: true,
    });

    const entries = useAuditStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].isSimulated).toBe(true);
  });

  it("clearSimulatedEntries removes only simulated entries", () => {
    const store = useAuditStore.getState();

    // Add a real entry
    store.addEntry({
      userId: "user-1",
      userName: "Alice",
      userRole: "admin",
      action: "create",
      resource: "Estate",
      description: "Estate created",
    });

    // Add a simulated entry
    store.addSimulatedEntry({
      id: "SIM-001",
      userId: "simulator",
      userName: "System",
      userRole: "system",
      action: "create",
      resource: "simulator",
      description: "Simulator started",
      createdAt: new Date().toISOString(),
      isSimulated: true,
    });

    expect(useAuditStore.getState().entries).toHaveLength(2);

    useAuditStore.getState().clearSimulatedEntries();

    const remaining = useAuditStore.getState().entries;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].isSimulated).toBeUndefined();
  });

  it("simulated and real entries coexist in the store", () => {
    const store = useAuditStore.getState();

    store.addEntry({
      userId: "user-1",
      userName: "Alice",
      userRole: "admin",
      action: "create",
      resource: "Estate",
      description: "Real estate created",
    });

    store.addSimulatedEntry({
      id: "SIM-001",
      userId: "simulator",
      userName: "System",
      userRole: "system",
      action: "create",
      resource: "alert",
      description: "Simulated alert created",
      createdAt: new Date().toISOString(),
      isSimulated: true,
    });

    const entries = useAuditStore.getState().entries;
    const simulatedEntries = entries.filter((e) => e.isSimulated);
    const realEntries = entries.filter((e) => !e.isSimulated);

    expect(simulatedEntries).toHaveLength(1);
    expect(realEntries).toHaveLength(1);
  });
});
