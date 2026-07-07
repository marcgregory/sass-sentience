/**
 * Tests for simulated audit log generators.
 *
 * Verifies that each generator produces the correct entry shape
 * with `isSimulated: true` and the expected action/resource values.
 */

import { describe, it, expect } from "vitest";
import {
  simulatorStarted,
  simulatorStopped,
  deviceConnected,
  deviceDisconnected,
  telemetryUpdated,
  alertCreated,
  notificationGenerated,
  diagnosticExecuted,
} from "./simulated-audit-logs";

describe("simulated-audit-logs", () => {
  it("simulatorStarted produces a simulated entry", () => {
    const entry = simulatorStarted();
    expect(entry).toMatchObject({
      action: "create",
      resource: "simulator",
      isSimulated: true,
      userId: "simulator",
      userRole: "system",
    });
    expect(entry.description).toMatch(/Simulator Started/i);
  });

  it("simulatorStopped produces a simulated entry", () => {
    const entry = simulatorStopped();
    expect(entry).toMatchObject({
      action: "update",
      resource: "simulator",
      isSimulated: true,
    });
    expect(entry.description).toMatch(/Simulator Stopped/i);
  });

  it("alertCreated produces a simulated entry with resource 'alert'", () => {
    const entry = alertCreated("Test Alert", "alert-123");
    expect(entry).toMatchObject({
      action: "create",
      resource: "alert",
      resourceId: "alert-123",
      isSimulated: true,
    });
    expect(entry.description).toMatch(/Alert Created.*Test Alert/i);
  });

  it("diagnosticExecuted produces a simulated entry with resource 'diagnostic'", () => {
    const entry = diagnosticExecuted("Signal Test", "Passed", "Device-01");
    expect(entry).toMatchObject({
      action: "create",
      resource: "diagnostic",
      isSimulated: true,
    });
    expect(entry.description).toMatch(/Diagnostic Executed.*Signal Test.*Device-01/i);
    expect(entry.details).toEqual({
      testName: "Signal Test",
      result: "Passed",
      deviceName: "Device-01",
    });
  });

  it("notificationGenerated produces a simulated entry", () => {
    const entry = notificationGenerated("Test Notification");
    expect(entry).toMatchObject({
      action: "create",
      resource: "notification",
      isSimulated: true,
    });
    expect(entry.description).toMatch(/Notification Generated.*Test Notification/i);
  });

  it("deviceConnected produces a simulated entry", () => {
    const entry = deviceConnected("Sensor-1", "dev-001");
    expect(entry).toMatchObject({
      action: "create",
      resource: "device",
      resourceId: "dev-001",
      isSimulated: true,
    });
    expect(entry.description).toMatch(/Device Connected.*Sensor-1/i);
  });

  it("deviceDisconnected produces a simulated entry", () => {
    const entry = deviceDisconnected("Sensor-1", "dev-001");
    expect(entry).toMatchObject({
      action: "update",
      resource: "device",
      resourceId: "dev-001",
      isSimulated: true,
    });
    expect(entry.description).toMatch(/Device Disconnected.*Sensor-1/i);
  });

  it("telemetryUpdated produces a simulated entry", () => {
    const entry = telemetryUpdated("Sensor-1", "dev-001");
    expect(entry).toMatchObject({
      action: "update",
      resource: "telemetry",
      resourceId: "dev-001",
      isSimulated: true,
    });
    expect(entry.description).toMatch(/Device Telemetry Updated.*Sensor-1/i);
  });

  it("each call produces a unique id", () => {
    const a = simulatorStarted();
    const b = simulatorStarted();
    expect(a.id).not.toBe(b.id);
  });

  it("all generators respect isSimulated flag", () => {
    const generators = [
      simulatorStarted(),
      alertCreated("A", "1"),
      diagnosticExecuted("T", "P", "D"),
      notificationGenerated("N"),
      deviceConnected("A", "1"),
      deviceDisconnected("B", "2"),
      telemetryUpdated("C", "3"),
    ];
    for (const entry of generators) {
      expect(entry.isSimulated).toBe(true);
    }
  });
});
