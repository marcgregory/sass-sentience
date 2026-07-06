/**
 * Simulated diagnostics for Simulator Mode.
 *
 * Provides the same diagnostic test definitions and result generation as the
 * backend, but runs entirely client-side so simulated devices can be
 * diagnosed without hitting the database (their UUIDs don't exist in the DB).
 *
 * Mirrors the seed data in apps/api/src/db/seed.ts and the simulateResult
 * function in apps/api/src/routes/diagnostics.ts.
 */

import type {
  DiagnosticTest,
  DiagnosticTestType,
  DiagnosticRunStatus,
  DiagnosticResult,
  DeviceType,
} from "@sentience/types";

// ─── Test Definitions ──────────────────────────────────────────────────────
//
// These match the seed data from apps/api/src/db/seed.ts exactly.

interface TestDef {
  id: string;
  name: string;
  type: DiagnosticTestType;
  description: string;
  supportedDeviceTypes: DeviceType[];
  timeout: number;
  sortOrder: number;
}

const TEST_DEFS: TestDef[] = [
  {
    id: "sim-diag-ping",
    name: "Ping Test",
    type: "ping",
    description: "ICMP connectivity check — verifies the device is reachable on the network.",
    supportedDeviceTypes: ["controller", "sensor", "gateway", "relay", "camera"],
    timeout: 10,
    sortOrder: 1,
  },
  {
    id: "sim-diag-connection",
    name: "Connection Test",
    type: "connection",
    description: "End-to-end connection verification — checks full data path from device to platform.",
    supportedDeviceTypes: ["controller", "sensor", "gateway", "relay", "camera"],
    timeout: 15,
    sortOrder: 2,
  },
  {
    id: "sim-diag-mqtt",
    name: "MQTT Status",
    type: "mqtt",
    description: "MQTT broker connection status — verifies device can publish/subscribe to its topics.",
    supportedDeviceTypes: ["controller", "sensor", "gateway", "relay", "camera"],
    timeout: 10,
    sortOrder: 3,
  },
  {
    id: "sim-diag-signal",
    name: "Signal Test",
    type: "signal",
    description: "Wireless signal strength analysis — measures RSSI, SNR, and link quality.",
    supportedDeviceTypes: ["controller", "sensor", "gateway", "camera"],
    timeout: 8,
    sortOrder: 4,
  },
  {
    id: "sim-diag-battery",
    name: "Battery Test",
    type: "battery",
    description: "Battery health and charge cycle analysis — voltage, capacity, cycle count.",
    supportedDeviceTypes: ["controller", "sensor", "gateway", "relay"],
    timeout: 5,
    sortOrder: 5,
  },
  {
    id: "sim-diag-firmware",
    name: "Firmware Check",
    type: "firmware",
    description: "Current vs latest firmware version — checks for available updates.",
    supportedDeviceTypes: ["controller", "sensor", "gateway", "relay", "camera"],
    timeout: 10,
    sortOrder: 6,
  },
];

/**
 * Return the full list of simulated diagnostic tests the frontend offers.
 * Matches the backend seed data identically.
 */
export function getSimulatedTestDefs(): TestDef[] {
  return TEST_DEFS;
}

/**
 * Get simulated tests compatible with a given device type.
 */
export function getSimulatedTestsForDeviceType(deviceType?: string): DiagnosticTest[] {
  const now = new Date().toISOString();
  return TEST_DEFS
    .filter((t) => {
      if (!deviceType) return true;
      return t.supportedDeviceTypes.includes(deviceType as DeviceType);
    })
    .map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      description: t.description,
      supportedDeviceTypes: t.supportedDeviceTypes,
      timeout: t.timeout,
      resultSchema: {},
      enabled: true,
      sortOrder: t.sortOrder,
      createdAt: now,
      updatedAt: now,
    }));
}

// ─── Result Simulation ─────────────────────────────────────────────────────
//
// Mirrors the backend's simulateResult() in apps/api/src/routes/diagnostics.ts.

interface SimulateOptions {
  deviceName: string;
  deviceType: string;
  deviceStatus: string;
  battery: number | null;
  signalStrength: number | null;
}

/**
 * Generate a simulated diagnostic result for a given test type and device.
 *
 * Logic mirrors `simulateResult` in the backend route, but runs client-side
 * so it works for simulated devices without a database round-trip.
 */
export function simulateDiagnosticResult(
  testType: string,
  device: SimulateOptions,
): { status: DiagnosticRunStatus; message: string; details: Record<string, unknown>; durationMs: number } {
  // Base success probability weighted by device status
  const successWeight =
    device.deviceStatus === "online" ? 0.92 :
    device.deviceStatus === "warning" ? 0.65 :
    device.deviceStatus === "fault" ? 0.30 : 0.10;

  const roll = Math.random();
  const outcome: DiagnosticRunStatus =
    roll < successWeight ? "passed" :
    roll < successWeight + (1 - successWeight) * 0.6 ? "warning" :
    "failed";

  const rssi = device.signalStrength ?? -70;
  const battery = device.battery ?? 50;

  switch (testType) {
    case "ping": {
      const success = outcome === "passed";
      return {
        status: outcome,
        message: success ? `Ping successful (${Math.round(Math.random() * 50 + 1)}ms, 0% loss)` : "Ping failed — no response after 10s",
        details: { success, latencyMs: success ? Math.round(Math.random() * 50 + 1) : null, packetLoss: success ? 0 : 100, ipAddress: "10.0.0." + Math.floor(Math.random() * 255) },
        durationMs: success ? Math.round(Math.random() * 3000 + 200) : 10000,
      };
    }
    case "connection": {
      const connected = outcome === "passed";
      return {
        status: outcome,
        message: connected ? "Connection verified — full data path operational" : "Connection timed out — device unreachable",
        details: { connected, roundTripMs: connected ? Math.round(Math.random() * 180 + 10) : null, hops: connected ? Math.round(Math.random() * 8 + 3) : null },
        durationMs: connected ? Math.round(Math.random() * 4000 + 500) : 15000,
      };
    }
    case "mqtt": {
      const connected = outcome !== "failed";
      return {
        status: outcome,
        message: connected ? "MQTT broker connected — messages flowing" : "MQTT connection failed — broker unreachable",
        details: { connected, broker: "mqtt://mosquitto:1883", lastMessage: new Date().toISOString(), messagesSent: Math.round(Math.random() * 1000 + 100), qos: 1 },
        durationMs: Math.round(Math.random() * 2000 + 300),
      };
    }
    case "signal": {
      const good = rssi >= -80;
      const fair = rssi >= -95;
      return {
        status: good ? "passed" : fair ? "warning" : "failed",
        message: good ? `Signal strength: ${rssi} dBm (excellent)` : fair ? `Signal strength: ${rssi} dBm (fair)` : `Signal strength: ${rssi} dBm (poor)`,
        details: { rssi, snr: Math.round(Math.random() * 30 + 10), linkQuality: good ? Math.round(Math.random() * 20 + 80) : fair ? Math.round(Math.random() * 20 + 60) : Math.round(Math.random() * 30 + 20), channel: Math.round(Math.random() * 12 + 1), noiseFloor: Math.round(Math.random() * 15 - 105) },
        durationMs: Math.round(Math.random() * 2000 + 500),
      };
    }
    case "battery": {
      return {
        status: battery >= 60 ? "passed" : battery >= 20 ? "warning" : "failed",
        message: battery >= 60 ? `Battery health: Good (${battery}%)` : battery >= 20 ? `Battery health: Fair (${battery}%)` : `Battery critical: ${battery}% — replace immediately`,
        details: { voltage: parseFloat((2.8 + battery / 100 * 1.2).toFixed(2)), capacity: battery, cycleCount: Math.round(Math.random() * 800 + 50), temperature: Math.round(Math.random() * 15 + 25), health: battery >= 60 ? "good" : battery >= 20 ? "fair" : "poor" },
        durationMs: Math.round(Math.random() * 2000 + 500),
      };
    }
    case "firmware": {
      const outdated = Math.random() < 0.15;
      return {
        status: outdated ? "warning" : "passed",
        message: outdated ? "Firmware update available: 4.2.0" : "Firmware is up to date",
        details: { currentVersion: "4.1.3", latestVersion: outdated ? "4.2.0" : "4.1.3", updateAvailable: outdated, releaseDate: outdated ? new Date(Date.now() - 7 * 86400_000).toISOString() : new Date(Date.now() - 30 * 86400_000).toISOString(), changelog: outdated ? "Security patches and performance improvements." : "No updates available." },
        durationMs: Math.round(Math.random() * 3000 + 1000),
      };
    }
    default:
      return { status: "passed", message: "Test completed successfully", details: {}, durationMs: 1000 };
  }
}
