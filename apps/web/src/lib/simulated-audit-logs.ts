/**
 * Simulated audit log generators for Simulator Mode.
 *
 * When Simulator Mode is active, every simulated action produces a
 * simulated audit entry — exactly like the real system would, but stored
 * only in memory (never written to the database). This gives users a
 * realistic audit trail during demos and evaluations without polluting
 * the production audit_logs table.
 *
 * Each generator mirrors the shape of a real AuditEntry so the UI renders
 * them identically. Simulated entries carry `isSimulated: true` and
 * `userName: "System"` / `userRole: "system"` to distinguish them from
 * real user-driven audit events.
 *
 * @see audit-store.ts — the Zustand store that holds these entries
 */

// ─── Counter for stable, sequential IDs ─────────────────────────────────────

import type { AuditAction } from "@sentience/types";

let simCounter = 0;
function nextId(): string {
  simCounter++;
  return `SIM-AUD-${String(simCounter).padStart(4, "0")}`;
}

// ─── Simulated Audit Entry Type ─────────────────────────────────────────────

export interface SimulatedAuditEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  /** Flag to distinguish simulated entries from real database audit logs. */
  isSimulated: true;
}

// ─── Generator ──────────────────────────────────────────────────────────────

function makeEntry(overrides: {
  action: AuditAction;
  resource: string;
  description: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}): SimulatedAuditEntry {
  return {
    id: nextId(),
    userId: "simulator",
    userName: "System",
    userRole: "system",
    ipAddress: undefined,
    createdAt: new Date().toISOString(),
    isSimulated: true,
    ...overrides,
  };
}

// ─── Public Generators ──────────────────────────────────────────────────────

/**
 * Generate an audit entry when the simulator starts.
 */
export function simulatorStarted(): SimulatedAuditEntry {
  return makeEntry({
    action: "create",
    resource: "simulator",
    description: "Simulator Started — simulating IoT devices and telemetry",
  });
}

/**
 * Generate an audit entry when the simulator stops.
 */
export function simulatorStopped(): SimulatedAuditEntry {
  return makeEntry({
    action: "update",
    resource: "simulator",
    description: "Simulator Stopped — all simulated data cleared",
  });
}

/**
 * Generate an audit entry when a simulated device connects.
 */
export function deviceConnected(deviceName: string, deviceId: string): SimulatedAuditEntry {
  return makeEntry({
    action: "create",
    resource: "device",
    resourceId: deviceId,
    description: `Device Connected — ${deviceName}`,
  });
}

/**
 * Generate an audit entry when a simulated device disconnects.
 */
export function deviceDisconnected(deviceName: string, deviceId: string): SimulatedAuditEntry {
  return makeEntry({
    action: "update",
    resource: "device",
    resourceId: deviceId,
    description: `Device Disconnected — ${deviceName}`,
  });
}

/**
 * Generate an audit entry when simulated telemetry is updated.
 */
export function telemetryUpdated(deviceName: string, deviceId: string): SimulatedAuditEntry {
  return makeEntry({
    action: "update",
    resource: "telemetry",
    resourceId: deviceId,
    description: `Device Telemetry Updated — ${deviceName}`,
  });
}

/**
 * Generate an audit entry when a simulated alert is created.
 */
export function alertCreated(alertTitle: string, alertId: string): SimulatedAuditEntry {
  return makeEntry({
    action: "create",
    resource: "alert",
    resourceId: alertId,
    description: `Alert Created — ${alertTitle}`,
  });
}

/**
 * Generate an audit entry when a simulated notification is generated.
 */
export function notificationGenerated(notificationTitle: string): SimulatedAuditEntry {
  return makeEntry({
    action: "create",
    resource: "notification",
    description: `Notification Generated — ${notificationTitle}`,
  });
}

/**
 * Generate an audit entry when a simulated diagnostic is executed.
 */
export function diagnosticExecuted(
  testName: string,
  result: string,
  deviceName?: string,
): SimulatedAuditEntry {
  return makeEntry({
    action: "create",
    resource: "diagnostic",
    description: `Diagnostic Executed — ${testName}${deviceName ? ` on ${deviceName}` : ""}`,
    details: { testName, result, deviceName },
  });
}

/**
 * Generate an audit entry for an MQTT message event.
 */
export function mqttMessageReceived(topic: string, deviceName?: string): SimulatedAuditEntry {
  return makeEntry({
    action: "update",
    resource: "mqtt",
    description: `MQTT Message Received${deviceName ? ` — ${deviceName}` : ""}`,
    details: { topic, deviceName },
  });
}

/**
 * Generate an audit entry for a firmware check.
 */
export function firmwareCheckPerformed(
  deviceName: string,
  currentVersion: string,
  updateAvailable: boolean,
): SimulatedAuditEntry {
  return makeEntry({
    action: "create",
    resource: "firmware",
    description: updateAvailable
      ? `Firmware Update Available — ${deviceName} (${currentVersion} → latest)`
      : `Firmware Check Passed — ${deviceName} (${currentVersion} up to date)`,
    details: { deviceName, currentVersion, updateAvailable },
  });
}

/**
 * Generate an audit entry for an event stream event.
 */
export function eventCreated(
  eventTitle: string,
  deviceName?: string,
): SimulatedAuditEntry {
  return makeEntry({
    action: "create",
    resource: "event",
    description: `Event Created — ${eventTitle}${deviceName ? ` for ${deviceName}` : ""}`,
  });
}
