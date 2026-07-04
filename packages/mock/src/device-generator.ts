/**
 * Fake device generator using @faker-js/faker.
 *
 * Produces realistic Device objects matching the types in @sentience/types.
 * Each call to generateDevice() yields a unique device with randomized
 * but sensible values — battery decays, signal fluctuates, statuses
 * occasionally flip to fault/warning.
 *
 * This is the only file that imports from faker; consumers get plain Device
 * objects and don't need a faker dependency.
 */

import { faker } from "@faker-js/faker";
import type { Device, DeviceTelemetry, DeviceIO, DeviceFirmware, DeviceConfig, DeviceStatus, DeviceType } from "@sentience/types";

// ─── Estate / Site Pools ─────────────────────────────────────────────
//
// Realistic location names that the simulator assigns devices to.
// Each device gets one estate and one site (from that estate's sites).

interface EstateDef {
  id: string;
  name: string;
  sites: { id: string; name: string }[];
}

const ESTATES: EstateDef[] = [
  {
    id: "estate-riverside",
    name: "Riverside Complex",
    sites: [
      { id: "site-riverside-a", name: "Building A" },
      { id: "site-riverside-b", name: "Building B" },
    ],
  },
  {
    id: "estate-techvalley",
    name: "Tech Valley Park",
    sites: [
      { id: "site-techvalley-1", name: "Warehouse 1" },
      { id: "site-techvalley-admin", name: "Admin Block" },
    ],
  },
  {
    id: "estate-harbour",
    name: "Harbour Terminal",
    sites: [
      { id: "site-harbour-main", name: "Main Terminal" },
      { id: "site-harbour-north", name: "North Gate" },
    ],
  },
  {
    id: "estate-greenfield",
    name: "Greenfield Data Centre",
    sites: [
      { id: "site-greenfield-a", name: "Server Hall A" },
      { id: "site-greenfield-b", name: "Server Hall B" },
    ],
  },
];

// ─── Deterministic Support ─────────────────────────────────────────
//
// Call generateDevices(seed(42)) to get reproducible output for tests.

let _seedCounter = 0;

/**
 * Returns a deterministic seed function for use with generateDevices.
 * Each call bumps the counter so the same index always gets the same device.
 */
export function seed(n: number): () => number {
  _seedCounter = n;
  return () => _seedCounter++;
}

// ─── Base Generator Functions ──────────────────────────────────────

function pickStatus(): DeviceStatus {
  // Bias toward "online" (70%) to simulate a healthy fleet
  const r = Math.random();
  if (r < 0.70) return "online";
  if (r < 0.85) return "online";  // 85% online total
  if (r < 0.93) return "warning";
  if (r < 0.98) return "offline";
  return "fault";
}

function pickType(): DeviceType {
  const types: DeviceType[] = ["controller", "sensor", "gateway", "relay", "camera"];
  return faker.helpers.arrayElement(types);
}

function isExternallyPowered(deviceType: DeviceType): boolean {
  return deviceType === "controller" || deviceType === "gateway" || deviceType === "relay";
}

function generateTelemetry(deviceType: DeviceType): DeviceTelemetry {
  // Different device types have slightly different battery drain profiles
  const isSensor = deviceType === "sensor";
  const isCamera = deviceType === "camera";

  return {
    battery: isExternallyPowered(deviceType) ? 0 : faker.number.int({ min: isSensor ? 10 : 20, max: 100 }),
    voltage: faker.number.float({ min: 3.0, max: 3.7, fractionDigits: 2 }),
    temperature: faker.number.float({ min: isCamera ? 30 : 15, max: isCamera ? 55 : 40, fractionDigits: 1 }),
    signalStrength: faker.number.int({ min: -120, max: -40 }),
    uptime: faker.number.int({ min: 60, max: 30 * 24 * 3600 }), // 1 min to 30 days
    lastHeartbeat: faker.date.recent({ days: 1 }).toISOString(),
  };
}

function generateIO(): DeviceIO {
  const inputCount = faker.number.int({ min: 1, max: 4 });
  const outputCount = faker.number.int({ min: 1, max: 2 });

  return {
    inputs: Array.from({ length: inputCount }, (_, i) => ({
      id: faker.string.nanoid(8),
      label: faker.helpers.arrayElement([
        "Door Sensor", "Motion Detector", "Temperature Probe",
        "Pressure Switch", "Vibration Sensor", "Flow Meter",
      ]),
      state: faker.datatype.boolean(0.7),
      type: "digital" as const,
      value: undefined,
    })),
    outputs: Array.from({ length: outputCount }, (_, i) => ({
      id: faker.string.nanoid(8),
      label: faker.helpers.arrayElement([
        "Relay 1", "Relay 2", "Siren Output", "Lock Control",
      ]),
      state: faker.datatype.boolean(0.3),
      type: "digital" as const,
      value: undefined,
    })),
  };
}

function generateFirmware(): DeviceFirmware {
  return {
    version: `${faker.number.int({ min: 1, max: 4 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 99 })}`,
    build: faker.string.alphanumeric(8).toUpperCase(),
    releasedAt: faker.date.past({ years: 1 }).toISOString(),
    installedAt: faker.date.recent({ days: 90 }).toISOString(),
  };
}

function generateConfig(deviceId: string): DeviceConfig {
  return {
    mqttTopic: `sentience/devices/${deviceId}/telemetry`,
    publishInterval: faker.number.int({ min: 5, max: 30 }),
    thresholds: {
      batteryMin: 15,
      voltageMin: 3.1,
      temperatureMin: -10,
      temperatureMax: 60,
      signalMin: -100,
    },
  };
}

function generateDeviceName(type: DeviceType, siteName: string, indexHint: string): string {
  const area = faker.helpers.arrayElement([
    siteName,
    `${siteName} North`,
    `${siteName} South`,
    `${siteName} East`,
    `${siteName} West`,
    `${siteName} Service`,
    `${siteName} Perimeter`,
  ]);
  const suffix = indexHint.slice(0, 4).toUpperCase();

  const names: Record<DeviceType, string[]> = {
    sensor: [
      `${area} Entry Sensor`,
      `${area} Door Sensor`,
      `${area} Motion Sensor`,
      `${area} Environmental Sensor`,
    ],
    camera: [
      `${area} Thermal Camera`,
      `${area} Security Camera`,
      `${area} Loading Bay Camera`,
    ],
    controller: [
      `${area} Access Controller ${suffix}`,
      `${area} Alarm Controller ${suffix}`,
      `${area} Main Controller ${suffix}`,
    ],
    gateway: [
      `${area} Gateway ${suffix}`,
      `${area} Backup Gateway ${suffix}`,
      `${area} MQTT Gateway ${suffix}`,
    ],
    relay: [
      `${area} Relay Panel ${suffix}`,
      `${area} Lighting Relay ${suffix}`,
      `${area} Door Relay ${suffix}`,
    ],
  };

  return faker.helpers.arrayElement(names[type]);
}
// ─── Public API ────────────────────────────────────────────────────

/**
 * Generate a single fake Device.
 */
export function generateDevice(seedFn?: () => number): Device {
  // If a seed function is provided, use it to set faker seed
  if (seedFn) {
    faker.seed(seedFn());
  }

  const id = faker.string.uuid();
  const type = pickType();
  const now = new Date();

  // Pick a realistic estate + site assignment
  const estate = faker.helpers.arrayElement(ESTATES);
  const site = faker.helpers.arrayElement(estate.sites);

  const device: Device = {
    id,
    serialNumber: `SN-${faker.string.alphanumeric(10).toUpperCase()}`,
    macAddress: faker.internet.mac(),
    name: generateDeviceName(type, site.name, id),
    type,
    status: pickStatus(),
    firmware: generateFirmware(),
    telemetry: generateTelemetry(type),
    io: generateIO(),
    config: generateConfig(id),
    siteId: site.id,
    roomId: faker.helpers.maybe(() => faker.string.nanoid(8), { probability: 0.6 }),
    installedAt: faker.date.past({ years: 2 }).toISOString(),
    lastMaintenance: faker.helpers.maybe(() => faker.date.recent({ days: 60 }).toISOString(), { probability: 0.7 }),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
    tags: faker.helpers.multiple(
      () => faker.helpers.arrayElement(["critical", "monitored", "indoor", "outdoor", "battery-powered", "hardwired", "new"]),
      { count: { min: 1, max: 3 } },
    ),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Attach estate/site names as non-standard extensions so the simulator
  // can include them in MQTT payloads without modifying the Device type.
  const ext = device as unknown as Record<string, unknown>;
  ext.estateId = estate.id;
  ext.estateName = estate.name;
  ext.siteName = site.name;

  return device;
}

/**
 * Generate multiple fake devices.
 *
 * @param count Number of devices to produce.
 * @param seedFn Optional deterministic seed function (use `seed(n)`).
 */
export function generateDevices(count: number, seedFn?: () => number): Device[] {
  return Array.from({ length: count }, () => generateDevice(seedFn));
}
