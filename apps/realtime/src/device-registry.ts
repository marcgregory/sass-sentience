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

const registry = new Map<string, DeviceRegistration>();

export function updateDevice(
  deviceId: string,
  data: { siteId?: string; siteName?: string; estateId?: string; estateName?: string; status?: string },
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
 * Returns the number of devices removed.
 */
export function pruneStaleDevices(ttlMs: number): number {
  const cutoff = Date.now() - ttlMs;
  let removed = 0;
  for (const [id, entry] of registry) {
    if (entry.lastSeen < cutoff) {
      registry.delete(id);
      removed++;
    }
  }
  return removed;
}

/**
 * Reset the registry. Only used in tests.
 */
export function resetRegistry(): void {
  registry.clear();
}
