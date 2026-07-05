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
    id: "d5fccfdd-d81b-4569-8ed6-bd93a6e1ea38",
    name: "Riverside Complex",
    sites: [
      { id: "82f58874-7f8a-4983-8364-a0f46609df23", name: "Building A" },
      { id: "4c9d5adc-9bfc-4054-89d5-fce6bd547419", name: "Building B" },
    ],
  },
  {
    id: "4ed20b8d-0d6c-462e-8b10-9508c3848ddf",
    name: "Tech Valley Park",
    sites: [
      { id: "0a44eb57-69ba-417c-844b-efd9c97caef9", name: "Warehouse 1" },
      { id: "f5998d0e-72fb-4c8c-8c30-730f0f6fb87d", name: "Admin Block" },
    ],
  },
  {
    id: "79d8e7aa-e05e-4abe-8936-650051c580bb",
    name: "Harbour Terminal",
    sites: [
      { id: "8d51899f-aca0-44df-82ff-7222cbdfa1c6", name: "Main Terminal" },
      { id: "0b0d6ea1-8c5c-48c6-8fe2-646df35a74db", name: "North Gate" },
    ],
  },
  {
    id: "5e9a665c-a352-4b20-83d0-24da3f39313b",
    name: "Greenfield Data Centre",
    sites: [
      { id: "aa0aafe8-10bf-45e3-8a78-48853832dcd6", name: "Server Hall A" },
      { id: "c8721e32-1b34-4810-811b-885107a044d5", name: "Server Hall B" },
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
  const r = faker.number.float({ min: 0, max: 1 });
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
