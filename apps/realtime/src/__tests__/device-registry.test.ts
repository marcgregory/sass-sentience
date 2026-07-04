import { describe, it, expect, beforeEach } from "vitest";
import {
  updateDevice,
  getDevice,
  getAllDevices,
  getDevicesBySite,
  getDevicesByEstate,
  deviceCount,
  pruneStaleDevices,
  resetRegistry,
} from "../device-registry";

describe("device-registry", () => {
  beforeEach(() => {
    resetRegistry();
  });

  it("registers a device and retrieves it", () => {
    updateDevice("dev-1", { siteId: "site-a", status: "online" });
    const d = getDevice("dev-1");
    expect(d?.deviceId).toBe("dev-1");
    expect(d?.siteId).toBe("site-a");
    expect(d?.status).toBe("online");
  });

  it("updates an existing device", () => {
    updateDevice("dev-1", { siteId: "site-a", status: "online" });
    updateDevice("dev-1", { status: "fault" });

    const d = getDevice("dev-1");
    expect(d?.status).toBe("fault");
    expect(d?.siteId).toBe("site-a"); // preserved from first registration
  });

  it("tracks firstSeen and lastSeen", () => {
    updateDevice("dev-1", { status: "online" });
    const first = getDevice("dev-1")!;

    // Wait a tick and update again
    updateDevice("dev-1", { status: "offline" });
    const second = getDevice("dev-1")!;

    expect(second.firstSeen).toBe(first.firstSeen); // unchanged
    expect(second.lastSeen).toBeGreaterThanOrEqual(first.lastSeen);
  });

  it("returns devices by site", () => {
    updateDevice("dev-1", { siteId: "site-a" });
    updateDevice("dev-2", { siteId: "site-a" });
    updateDevice("dev-3", { siteId: "site-b" });

    expect(getDevicesBySite("site-a")).toHaveLength(2);
    expect(getDevicesBySite("site-b")).toHaveLength(1);
    expect(getDevicesBySite("site-c")).toHaveLength(0);
  });

  it("returns devices by estate", () => {
    updateDevice("dev-1", { estateId: "estate-1" });
    updateDevice("dev-2", { estateId: "estate-1" });
    updateDevice("dev-3", { estateId: "estate-2" });

    expect(getDevicesByEstate("estate-1")).toHaveLength(2);
    expect(getDevicesByEstate("estate-2")).toHaveLength(1);
  });

  it("reports correct device count", () => {
    updateDevice("dev-1", {});
    updateDevice("dev-2", {});
    updateDevice("dev-3", {});
    expect(deviceCount()).toBe(3);
  });

  it("allows unknown values that get defaults", () => {
    updateDevice("dev-new", {});
    const d = getDevice("dev-new");
    expect(d?.siteId).toBe("unknown");
    expect(d?.estateId).toBe("unknown");
    expect(d?.status).toBe("unknown");
  });

  describe("pruneStaleDevices", () => {
    it("removes all devices when TTL is negative (all lastSeen are in the past)", () => {
      updateDevice("dev-1", {});
      updateDevice("dev-2", {});
      expect(deviceCount()).toBe(2);

      const removed = pruneStaleDevices(-1);
      expect(removed).toBe(2);
      expect(deviceCount()).toBe(0);
    });

    it("keeps fresh devices within TTL", () => {
      updateDevice("fresh-dev", {});
      // TTL of 60s — entry was just created, should survive
      expect(pruneStaleDevices(60_000)).toBe(0);
      expect(deviceCount()).toBe(1);
    });

    it("returns 0 when registry is empty", () => {
      expect(pruneStaleDevices(1000)).toBe(0);
    });
  });
});
