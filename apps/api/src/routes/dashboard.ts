import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { devices, sites, estates, alerts } from "../db/schema";
import { eq, and, count, SQL, inArray } from "drizzle-orm";
import { requireAuth, customerScope, type JwtPayload } from "../middleware/auth";

interface DeviceRow {
  id: string;
  status: string | null;
  battery: number | null;
  signalStrength: number | null;
  temperature: number | null;
  siteId: string | null;
}

interface EstateRow {
  id: string;
  name: string | null;
  deviceCount: number | null;
  onlineCount: number | null;
  offlineCount: number | null;
  faultCount: number | null;
  warningCount: number | null;
}

/**
 * Compute battery distribution from an array of device rows.
 * Good: >60%, Fair: 20-60%, Low: <20%
 */
function computeBatteryDistribution(
  rows: DeviceRow[],
): { label: string; value: number; count: number; color: string }[] {
  const withBattery = rows.filter(
    (d) => d.battery != null && d.status !== "offline",
  );
  if (withBattery.length === 0) {
    return [
      { label: "Good (>60%)", value: 0, count: 0, color: "bg-emerald-500" },
      { label: "Fair (20–60%)", value: 0, count: 0, color: "bg-amber-500" },
      { label: "Low (<20%)", value: 0, count: 0, color: "bg-red-500" },
    ];
  }

  const good = withBattery.filter((d) => d.battery! > 60).length;
  const fair = withBattery.filter(
    (d) => d.battery! >= 20 && d.battery! <= 60,
  ).length;
  const low = withBattery.filter((d) => d.battery! < 20).length;
  const total = withBattery.length;
  const pct = (n: number) => Math.round((n / total) * 100);

  return [
    { label: "Good (>60%)", value: pct(good), count: good, color: "bg-emerald-500" },
    { label: "Fair (20–60%)", value: pct(fair), count: fair, color: "bg-amber-500" },
    { label: "Low (<20%)", value: pct(low), count: low, color: "bg-red-500" },
  ];
}

/**
 * Compute signal distribution from an array of device rows.
 * Excellent: <-50 dBm, Good: -50 to -70, Fair: -70 to -90, Poor: >=-90
 */
function computeSignalDistribution(
  rows: DeviceRow[],
): { label: string; value: number; count: number; color: string }[] {
  const withSignal = rows.filter(
    (d) => d.signalStrength != null && d.status !== "offline",
  );
  if (withSignal.length === 0) {
    return [
      { label: "Excellent", value: 0, count: 0, color: "bg-emerald-500" },
      { label: "Good", value: 0, count: 0, color: "bg-blue-500" },
      { label: "Fair", value: 0, count: 0, color: "bg-amber-500" },
      { label: "Poor", value: 0, count: 0, color: "bg-red-500" },
    ];
  }

  const excellent = withSignal.filter((d) => d.signalStrength! < -50).length;
  const good = withSignal.filter(
    (d) => d.signalStrength! >= -50 && d.signalStrength! < -70,
  ).length;
  const fair = withSignal.filter(
    (d) => d.signalStrength! >= -70 && d.signalStrength! < -90,
  ).length;
  const poor = withSignal.filter((d) => d.signalStrength! >= -90).length;
  const total = withSignal.length;
  const pct = (n: number) => Math.round((n / total) * 100);

  return [
    { label: "Excellent", value: pct(excellent), count: excellent, color: "bg-emerald-500" },
    { label: "Good", value: pct(good), count: good, color: "bg-blue-500" },
    { label: "Fair", value: pct(fair), count: fair, color: "bg-amber-500" },
    { label: "Poor", value: pct(poor), count: poor, color: "bg-red-500" },
  ];
}

/**
 * Compute temperature distribution from an array of device rows.
 * Normal: 0-35°C, High: 35-50°C, Critical: >50°C or <0°C
 */
function computeTemperatureDistribution(
  rows: DeviceRow[],
): { label: string; value: number; count: number; color: string }[] {
  const withTemp = rows.filter(
    (d) => d.temperature != null && d.status !== "offline",
  );
  if (withTemp.length === 0) {
    return [
      { label: "Normal", value: 0, count: 0, color: "bg-emerald-500" },
      { label: "High", value: 0, count: 0, color: "bg-amber-500" },
      { label: "Critical", value: 0, count: 0, color: "bg-red-500" },
    ];
  }

  const normal = withTemp.filter(
    (d) => d.temperature! >= 0 && d.temperature! <= 35,
  ).length;
  const high = withTemp.filter(
    (d) => d.temperature! > 35 && d.temperature! <= 50,
  ).length;
  const critical = withTemp.filter(
    (d) => d.temperature! > 50 || d.temperature! < 0,
  ).length;
  const total = withTemp.length;
  const pct = (n: number) => Math.round((n / total) * 100);

  return [
    { label: "Normal", value: pct(normal), count: normal, color: "bg-emerald-500" },
    { label: "High", value: pct(high), count: high, color: "bg-amber-500" },
    { label: "Critical", value: pct(critical), count: critical, color: "bg-red-500" },
  ];
}

/**
 * Compute fleet health score from device rows.
 * Composite: online% × 40 + battery-health% × 30 + signal-health% × 30
 */
function computeFleetHealth(rows: DeviceRow[]): number {
  if (rows.length === 0) return 0;

  const online = rows.filter((d) => d.status === "online").length;
  const onlineRatio = online / rows.length;

  const withBattery = rows.filter(
    (d) => d.battery != null && d.status !== "offline",
  );
  const withGoodBattery =
    withBattery.length > 0
      ? withBattery.filter((d) => d.battery! > 60).length / withBattery.length
      : 0;

  const withSignal = rows.filter(
    (d) => d.signalStrength != null && d.status !== "offline",
  );
  const withGoodSignal =
    withSignal.length > 0
      ? withSignal.filter((d) => d.signalStrength! < -70).length /
        withSignal.length
      : 0;

  return Math.round(
    (onlineRatio * 40 + withGoodBattery * 30 + withGoodSignal * 30) * 10,
  ) / 10;
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    "/summary",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user as JwtPayload;

      // ── Customer data isolation ────────────────────────────────────────
      // Compute the estate-level scope condition based on the user's role.
      // Platform roles (admin, support, installer) see all records.
      // Customer roles see only their own customer's estates.
      const scope = user.customerId
        ? await customerScope(user, sites.estateId)
        : undefined;

      // ── Count devices by status ────────────────────────────────────────
      // For customer roles, scope the device query through site → estate
      let deviceRows: DeviceRow[];
      if (scope) {
        // Find site IDs scoped to this customer's estates
        const scopedSites = await db
          .select({ id: sites.id })
          .from(sites)
          .where(scope as SQL);
        const scopedSiteIds = scopedSites.map((s) => s.id);

        if (scopedSiteIds.length === 0) {
          // Customer has no sites → return empty summary
          return reply.send({
            totalDevices: 0,
            onlineDevices: 0,
            offlineDevices: 0,
            faultCount: 0,
            warningCount: 0,
            batteryDistribution: [
              { label: "Good (>60%)", value: 0, count: 0, color: "bg-emerald-500" },
              { label: "Fair (20–60%)", value: 0, count: 0, color: "bg-amber-500" },
              { label: "Low (<20%)", value: 0, count: 0, color: "bg-red-500" },
            ],
            signalDistribution: [
              { label: "Excellent", value: 0, count: 0, color: "bg-emerald-500" },
              { label: "Good", value: 0, count: 0, color: "bg-blue-500" },
              { label: "Fair", value: 0, count: 0, color: "bg-amber-500" },
              { label: "Poor", value: 0, count: 0, color: "bg-red-500" },
            ],
            temperatureDistribution: [
              { label: "Normal", value: 0, count: 0, color: "bg-emerald-500" },
              { label: "High", value: 0, count: 0, color: "bg-amber-500" },
              { label: "Critical", value: 0, count: 0, color: "bg-red-500" },
            ],
            fleetHealth: 0,
            estates: [],
            sites: 0,
            openAlerts: 0,
          });
        }

        deviceRows = (await db
          .select({
            id: devices.id,
            status: devices.status,
            battery: devices.battery,
            signalStrength: devices.signalStrength,
            temperature: devices.temperature,
            siteId: devices.siteId,
          })
          .from(devices)
          .where(inArray(devices.siteId, scopedSiteIds) as unknown as SQL)) as DeviceRow[];
      } else {
        deviceRows = (await db
          .select({
            id: devices.id,
            status: devices.status,
            battery: devices.battery,
            signalStrength: devices.signalStrength,
            temperature: devices.temperature,
            siteId: devices.siteId,
          })
          .from(devices)) as DeviceRow[];
      }

      const totalDevices = deviceRows.length;

      // Compute status counts
      let onlineDevices = 0;
      let offlineDevices = 0;
      let faultCount = 0;
      let warningCount = 0;

      for (const d of deviceRows) {
        if (d.status === "online") onlineDevices++;
        else if (d.status === "offline") offlineDevices++;
        else if (d.status === "fault") faultCount++;
        else if (d.status === "warning") warningCount++;
      }

      // ── Distributions ──────────────────────────────────────────────────
      const batteryDistribution = computeBatteryDistribution(deviceRows);
      const signalDistribution = computeSignalDistribution(deviceRows);
      const temperatureDistribution = computeTemperatureDistribution(deviceRows);
      const fleetHealth = computeFleetHealth(deviceRows);

      // ── Estates ────────────────────────────────────────────────────────
      let estateRows: EstateRow[];
      if (scope) {
        estateRows = (await db
          .select({
            id: estates.id,
            name: estates.name,
            deviceCount: estates.deviceCount,
            onlineCount: estates.onlineCount,
            offlineCount: estates.offlineCount,
            faultCount: estates.faultCount,
            warningCount: estates.warningCount,
          })
          .from(estates)
          .where(scope as SQL)
          .orderBy(estates.name)) as EstateRow[];
      } else {
        estateRows = (await db
          .select({
            id: estates.id,
            name: estates.name,
            deviceCount: estates.deviceCount,
            onlineCount: estates.onlineCount,
            offlineCount: estates.offlineCount,
            faultCount: estates.faultCount,
            warningCount: estates.warningCount,
          })
          .from(estates)
          .orderBy(estates.name)) as EstateRow[];
      }

      // ── Site count ─────────────────────────────────────────────────────
      let siteCount = 0;
      let siteQuery;
      if (scope) {
        siteQuery = await db
          .select({ count: count() })
          .from(sites)
          .where(scope as SQL);
      } else {
        siteQuery = await db.select({ count: count() }).from(sites);
      }
      siteCount = Number(siteQuery[0]?.count ?? 0);

      // ── Open alerts ────────────────────────────────────────────────────
      let alertCount = 0;
      // For customer-scoped, filter alerts by estate scope
      if (scope && user.customerId) {
        const alertScope = await customerScope(user, alerts.estateId);
        const alertResult = await db
          .select({ count: count() })
          .from(alerts)
          .where(
            and(
              eq(alerts.status, "open"),
              alertScope as SQL,
            ),
          );
        alertCount = Number(alertResult[0]?.count ?? 0);
      } else {
        const alertResult = await db
          .select({ count: count() })
          .from(alerts)
          .where(eq(alerts.status, "open"));
        alertCount = Number(alertResult[0]?.count ?? 0);
      }

      // ── Build estate summaries ─────────────────────────────────────────
      const estateSummaries = estateRows
        .filter((e) => e.id) // filter out any null IDs
        .map((e) => ({
          id: e.id,
          name: e.name ?? "Unnamed Estate",
          total: e.deviceCount ?? 0,
          online: e.onlineCount ?? 0,
          offline: e.offlineCount ?? 0,
          fault: e.faultCount ?? 0,
          warning: e.warningCount ?? 0,
        }));

      return reply.send({
        totalDevices,
        onlineDevices,
        offlineDevices,
        faultCount,
        warningCount,
        batteryDistribution,
        signalDistribution,
        temperatureDistribution,
        fleetHealth,
        estates: estateSummaries,
        sites: siteCount,
        openAlerts: alertCount,
      });
    },
  );
}
