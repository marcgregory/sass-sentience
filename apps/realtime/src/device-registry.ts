/**
 * In-memory device registry.
 *
 * Tracks device → site/estate mappings so the bridge can emit events
 * to the correct Socket.IO rooms. Populated from status and events
 * MQTT messages that include siteId/estateId fields.
 *
 * Real-device payloads are expected to include siteId and estateId.
 * The simulator does not set these, so they default to "unknown"
 * and all events go to the global dashboard room only.
 *
 * Session tracking:
 * When the simulator restarts, it publishes a system message with a new
 * sessionId. The bridge calls setSimulatorSession(sessionId) to record it.
 * Subsequent MQTT messages that contain a different (stale) sessionId
 * are silently dropped to prevent old-simulator in-flight messages from
 * re-registering devices during a rolling restart.
 */

export interface DeviceRegistration {
  deviceId: string;
  siteId: string;
  siteName?: string;
  estateId: string;
  estateName?: string;
  status: string;
  firstSeen: number;
  lastSeen: number;
}

export interface PruneStaleDevicesResult {
  removed: number;
  remaining: number;
  ttlMs: number;
  oldestRemovedAgeMs: number | null;
}

const registry = new Map<string, DeviceRegistration>();

/** Tracks the current simulator session — stale-session messages are dropped */
let currentSimulatorSessionId: string | null = null;

/**
 * Set the active simulator session. Messages from any other sessionId
 * are considered stale and will be dropped by shouldDropStaleMessage().
 */
export function setSimulatorSession(sessionId: string | null): void {
  currentSimulatorSessionId = sessionId;
}

/**
 * Get the current simulator session ID (for logging/debugging).
 */
export function getSimulatorSession(): string | null {
  return currentSimulatorSessionId;
}

/**
 * Returns true if the given sessionId is stale (old-simulator message
 * arriving after a restart). When no session is active, all messages
 * are accepted (real devices don't carry sessionId).
 */
export function shouldDropStaleMessage(sessionId: string | undefined | null): boolean {
  if (!sessionId) return false; // real devices have no sessionId
  if (!currentSimulatorSessionId) return false; // no session active yet
  return sessionId !== currentSimulatorSessionId;
}

export function updateDevice(
  deviceId: string,
  data: {
    siteId?: string;
    siteName?: string;
    estateId?: string;
    estateName?: string;
    status?: string;
  },
): DeviceRegistration {
  const existing = registry.get(deviceId);

  const entry: DeviceRegistration = {
    deviceId,
    siteId: data.siteId ?? existing?.siteId ?? "unknown",
    siteName: data.siteName ?? existing?.siteName ?? undefined,
    estateId: data.estateId ?? existing?.estateId ?? "unknown",
    estateName: data.estateName ?? existing?.estateName ?? undefined,
    status: data.status ?? existing?.status ?? "unknown",
    firstSeen: existing?.firstSeen ?? Date.now(),
    lastSeen: Date.now(),
  };

  registry.set(deviceId, entry);
  return entry;
}

export function getDevice(deviceId: string): DeviceRegistration | undefined {
  return registry.get(deviceId);
}

export function getAllDevices(): DeviceRegistration[] {
  return Array.from(registry.values());
}

export function getDevicesBySite(siteId: string): DeviceRegistration[] {
  return Array.from(registry.values()).filter((d) => d.siteId === siteId);
}

export function getDevicesByEstate(estateId: string): DeviceRegistration[] {
  return Array.from(registry.values()).filter((d) => d.estateId === estateId);
}

export function deviceCount(): number {
  return registry.size;
}

/**
 * Remove devices whose `lastSeen` is older than `ttlMs` from now.
 */
export function pruneStaleDevicesDetailed(
  ttlMs: number,
): PruneStaleDevicesResult {
  const now = Date.now();
  const cutoff = now - ttlMs;
  let removed = 0;
  let oldestRemovedAgeMs: number | null = null;

  for (const [id, entry] of registry) {
    if (entry.lastSeen < cutoff) {
      registry.delete(id);
      removed++;

      const ageMs = now - entry.lastSeen;
      oldestRemovedAgeMs =
        oldestRemovedAgeMs === null
          ? ageMs
          : Math.max(oldestRemovedAgeMs, ageMs);
    }
  }

  return {
    removed,
    remaining: registry.size,
    ttlMs,
    oldestRemovedAgeMs,
  };
}

/**
 * Remove stale devices and return only the count.
 */
export function pruneStaleDevices(ttlMs: number): number {
  return pruneStaleDevicesDetailed(ttlMs).removed;
}

/**
 * Reset the registry. Only used in tests.
 */
export function resetRegistry(): void {
  registry.clear();
}

/**
 * Clear all simulator devices from the registry.
 * Returns the number of devices that were removed.
 */
export function resetSimulatorDevices(): number {
  const count = registry.size;
  registry.clear();
  return count;
}
