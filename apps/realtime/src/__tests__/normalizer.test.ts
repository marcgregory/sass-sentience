import { describe, it, expect } from "vitest";
import {
  toTelemetryEvent,
  toStatusEvent,
  toEventStreamEvent,
  toDiagnosticEvent,
  toAlertEvent,
} from "../normalizer";

describe("normalizer", () => {
  const deviceId = "test-device-123";
  const basePayload = {
    deviceId,
    battery: 78,
    signal: -65,
    temperature: 24.5,
    fault: false,
    warning: false,
    inputState: true,
    outputState: false,
    timestamp: "2026-07-02T19:30:00.000Z",
  };

  describe("toTelemetryEvent", () => {
    it("maps flat MQTT telemetry to typed Socket.IO event", () => {
      const result = toTelemetryEvent(deviceId, basePayload);

      expect(result).toEqual({
        deviceId,
        siteId: "unknown",
        battery: 78,
        voltage: 3.3,
        temperature: 24.5,
        signalStrength: -65,
        timestamp: "2026-07-02T19:30:00.000Z",
      });
    });

    it("preserves deviceName when present", () => {
      const result = toTelemetryEvent(deviceId, {
        ...basePayload,
        deviceName: "Main Controller",
      });
      expect(result.deviceName).toBe("Main Controller");
    });

    it("preserves siteId when present", () => {
      const result = toTelemetryEvent(deviceId, {
        ...basePayload,
        siteId: "site-1",
      });
      expect(result.siteId).toBe("site-1");
    });

    it("rounds battery and signalStrength to integers", () => {
      const result = toTelemetryEvent(deviceId, {
        ...basePayload,
        battery: 78.7,
        signal: -64.9,
      });
      expect(result.battery).toBe(79);
      expect(result.signalStrength).toBe(-65);
    });

    it("provides defaults for missing fields", () => {
      const result = toTelemetryEvent(deviceId, { deviceId });
      expect(result.battery).toBe(100);
      expect(result.voltage).toBe(3.3);
      expect(result.temperature).toBe(25);
      expect(result.signalStrength).toBe(-70);
      expect(result.timestamp).toBeTruthy();
    });
  });

  describe("toStatusEvent", () => {
    it("maps status payload with previous status", () => {
      const result = toStatusEvent(
        deviceId,
        { ...basePayload, status: "fault", previousStatus: "online" },
        "online",
      );

      expect(result.deviceId).toBe(deviceId);
      expect(result.status).toBe("fault");
      expect(result.previousStatus).toBe("online");
    });

    it("falls back to previousStatus from payload when not provided", () => {
      const result = toStatusEvent(
        deviceId,
        { ...basePayload, status: "warning", previousStatus: "online" },
      );
      expect(result.status).toBe("warning");
      expect(result.previousStatus).toBe("online");
    });

    it("uses status from 2nd arg when payload has no previousStatus", () => {
      const result = toStatusEvent(
        deviceId,
        { ...basePayload, status: "offline" },
        "online",
      );
      expect(result.status).toBe("offline");
      expect(result.previousStatus).toBe("online");
    });

    it("validates status values, defaulting to online for invalid", () => {
      const result = toStatusEvent(
        deviceId,
        { ...basePayload, status: "bogus" as string },
      );
      expect(result.status).toBe("online");
    });
  });

  describe("toEventStreamEvent", () => {
    it("maps battery_low event with title, category and severity", () => {
      const result = toEventStreamEvent(deviceId, {
        ...basePayload,
        eventType: "battery_low",
        battery: 12,
        status: "warning",
      });

      expect(result.deviceId).toBe(deviceId);
      expect(result.category).toBe("threshold_breach");
      // Severity derived from event type, not device status
      expect(result.severity).toBe("warning");
      expect(result.title).toContain("battery low");
      expect(result.title).toContain("12%");
    });

    it("uses deviceName in title when available", () => {
      const result = toEventStreamEvent(deviceId, {
        ...basePayload,
        deviceName: "Main Controller",
        eventType: "signal_weak",
        signal: -105,
      });
      expect(result.title).toContain("Main Controller");
      expect(result.title).not.toContain("Device ");
      expect(result.title).toContain("-105");
    });

    it("sets critical severity for device_fault", () => {
      const result = toEventStreamEvent(deviceId, {
        ...basePayload,
        eventType: "device_fault",
        fault: true,
        status: "fault",
      });
      expect(result.severity).toBe("critical");
    });

    it("sets critical severity for device_offline", () => {
      const result = toEventStreamEvent(deviceId, {
        ...basePayload,
        eventType: "device_offline",
      });
      expect(result.severity).toBe("critical");
    });

    it("sets info severity for non-alert event types", () => {
      const result = toEventStreamEvent(deviceId, {
        ...basePayload,
        eventType: "config_change",
      });
      expect(result.severity).toBe("info");
    });

    it("includes serial when present", () => {
      const result = toEventStreamEvent(deviceId, {
        ...basePayload,
        eventType: "signal_weak",
        serial: "SN-ABCD1234",
      });
      expect(result.serial).toBe("SN-ABCD1234");
    });

    it("generates a unique eventId", () => {
      const result = toEventStreamEvent(deviceId, {
        ...basePayload,
        eventType: "test",
      });
      expect(result.eventId).toContain(deviceId);
    });
  });

  describe("toDiagnosticEvent", () => {
    it("maps fault payload to failed diagnostic", () => {
      const result = toDiagnosticEvent(deviceId, {
        ...basePayload,
        eventType: "battery_low",
        fault: true,
      });

      expect(result.deviceId).toBe(deviceId);
      expect(result.diagnostic.status).toBe("failed");
      expect(result.diagnostic.type).toBe("battery_low");
    });

    it("maps warning payload to warning diagnostic", () => {
      const result = toDiagnosticEvent(deviceId, {
        ...basePayload,
        eventType: "signal_weak",
        warning: true,
      });
      expect(result.diagnostic.status).toBe("warning");
    });
  });

  describe("toAlertEvent", () => {
    it("returns alert for battery_low event", () => {
      const result = toAlertEvent(deviceId, {
        ...basePayload,
        eventType: "battery_low",
        battery: 12,
        deviceName: "Zone Sensor A",
      });

      expect(result).not.toBeNull();
      expect(result!.severity).toBe("warning");
      expect(result!.title).toContain("Zone Sensor A");
      expect(result!.title).toContain("12%");
      expect(result!.deviceName).toBe("Zone Sensor A");
    });

    it("returns null for non-alert event types", () => {
      const result = toAlertEvent(deviceId, {
        ...basePayload,
        eventType: "config_change",
      });
      expect(result).toBeNull();
    });

    it("uses deviceName in description", () => {
      const result = toAlertEvent(deviceId, {
        ...basePayload,
        eventType: "signal_weak",
        signal: -105,
        deviceName: "Perimeter Gateway",
      });

      expect(result).not.toBeNull();
      expect(result!.description).toContain("Perimeter Gateway");
    });

    it("falls back to truncated ID when deviceName absent", () => {
      const result = toAlertEvent(deviceId, {
        ...basePayload,
        eventType: "battery_low",
        battery: 5,
      });

      expect(result).not.toBeNull();
      expect(result!.title).toContain(deviceId.slice(0, 8));
    });
  });
});
