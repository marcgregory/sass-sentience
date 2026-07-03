import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { reports, devices, events, alerts, sites, estates } from "../db/schema";
import { eq, and, count, desc, asc, gte, inArray, SQL } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const createReportSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["daily", "weekly", "monthly", "custom", "adhoc"]),
  format: z.enum(["csv", "pdf"]).default("csv"),
  dateRangeStart: z.string(),
  dateRangeEnd: z.string(),
  filters: z.object({
    estateId: z.string().uuid().optional(),
    siteId: z.string().uuid().optional(),
    deviceId: z.string().uuid().optional(),
    severity: z.array(z.string()).optional(),
  }).optional(),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Build conditions array from optional estate/site/device filters.
 * For estate-level filtering, we fetch site IDs first, then use inArray.
 */
async function resolveDeviceFilter(
  estateId?: string,
  siteId?: string,
  deviceId?: string,
): Promise<SQL[] | undefined> {
  if (deviceId) {
    return [eq(devices.id, deviceId)];
  }

  if (siteId) {
    return [eq(devices.siteId, siteId)];
  }

  if (estateId) {
    const estateSites = await db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.estateId, estateId));
    const siteIds = estateSites.map((s) => s.id);
    if (siteIds.length > 0) {
      return [inArray(devices.siteId, siteIds)];
    }
    // No sites for this estate — return a condition that never matches
    return [eq(devices.id, "00000000-0000-0000-0000-000000000000")];
  }

  return undefined;
}

export async function reportRoutes(app: FastifyInstance) {
  // ─── Summary ───────────────────────────────────────────────────────────
  //
  // GET /api/reports/summary?estate_id=&site_id=&device_id=
  //
  // Returns fleet summary computed from the devices table:
  //   totalDevices, onlineDevices, offlineDevices, faultDevices, warningDevices,
  //   avgBattery, avgSignal, healthScore, onlinePct
  //   batteryDistribution[], signalDistribution[], faultDistribution[]

  app.get("/summary", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      estate_id?: string;
      site_id?: string;
      device_id?: string;
    };

    const conditions = await resolveDeviceFilter(query.estate_id, query.site_id, query.device_id);
    const where = conditions && conditions.length > 0 ? and(...conditions) : undefined;

    const deviceRows = await db.select().from(devices).where(where);

    const totalDevices = deviceRows.length;
    const onlineDevices = deviceRows.filter((d) => d.status === "online").length;
    const offlineDevices = deviceRows.filter((d) => d.status === "offline").length;
    const faultDevices = deviceRows.filter((d) => d.status === "fault").length;
    const warningDevices = deviceRows.filter((d) => d.status === "warning").length;

    const withBattery = deviceRows.filter((d) => d.battery != null);
    const withSignal = deviceRows.filter((d) => d.signalStrength != null);
    const avgBattery =
      withBattery.length > 0
        ? parseFloat(
            (withBattery.reduce((s, d) => s + (d.battery ?? 0), 0) / withBattery.length).toFixed(1),
          )
        : 0;
    const avgSignal =
      withSignal.length > 0
        ? parseFloat(
            (withSignal.reduce((s, d) => s + (d.signalStrength ?? 0), 0) / withSignal.length).toFixed(1),
          )
        : 0;

    const onlinePct = totalDevices > 0 ? parseFloat(((onlineDevices / totalDevices) * 100).toFixed(1)) : 0;

    // Health score: 40% online ratio + 30% battery + 30% signal
    const batteryScore = Math.min(100, (avgBattery / 100) * 100);
    const signalScore = Math.min(100, Math.max(0, ((avgSignal + 120) / 100) * 100));
    const healthScore = totalDevices > 0
      ? parseFloat(((onlinePct * 0.4) + (batteryScore * 0.3) + (signalScore * 0.3)).toFixed(1))
      : 0;

    // Battery distribution
    const goodBattery = withBattery.filter((d) => (d.battery ?? 0) > 60).length;
    const fairBattery = withBattery.filter((d) => (d.battery ?? 0) >= 20 && (d.battery ?? 0) <= 60).length;
    const lowBattery = withBattery.filter((d) => (d.battery ?? 0) < 20).length;
    const batteryTotal = Math.max(1, goodBattery + fairBattery + lowBattery);

    // Signal distribution
    const excellent = withSignal.filter((d) => (d.signalStrength ?? -999) >= -50).length;
    const goodSig = withSignal.filter((d) => (d.signalStrength ?? -999) >= -70 && (d.signalStrength ?? -999) < -50).length;
    const fairSig = withSignal.filter((d) => (d.signalStrength ?? -999) >= -90 && (d.signalStrength ?? -999) < -70).length;
    const poorSig = withSignal.filter((d) => (d.signalStrength ?? -999) < -90).length;
    const signalTotal = Math.max(1, excellent + goodSig + fairSig + poorSig);

    // Fault distribution from faulted devices
    const faultTypeCount: Record<string, number> = {};
    for (const d of deviceRows) {
      if (d.status === "fault" || d.status === "warning") {
        // Group faults by device type as a proxy for fault category
        const category = d.status === "fault" ? `Device ${d.type}` : `${d.type} warning`;
        faultTypeCount[category] = (faultTypeCount[category] ?? 0) + 1;
      }
    }
    const faultColors: Record<string, string> = {
      "Device controller": "#ef4444",
      "Device sensor": "#f59e0b",
      "Device gateway": "#f97316",
      "Device relay": "#dc2626",
      "Device camera": "#8b5cf6",
      "controller warning": "#6366f1",
      "sensor warning": "#10b981",
      "gateway warning": "#3b82f6",
      "relay warning": "#ec4899",
      "camera warning": "#14b8a6",
    };
    const faultDistribution = Object.entries(faultTypeCount).map(([category, count]) => ({
      category,
      count,
      color: faultColors[category] ?? "#94a3b8",
    }));

    return reply.send({
      totalDevices,
      onlineDevices,
      offlineDevices,
      faultDevices,
      warningDevices,
      avgBattery,
      avgSignal,
      healthScore,
      onlinePct,
      batteryDistribution: [
        { label: "Good (>60%)", value: Math.round((goodBattery / batteryTotal) * 100), count: goodBattery, color: "bg-emerald-500" },
        { label: "Fair (20–60%)", value: Math.round((fairBattery / batteryTotal) * 100), count: fairBattery, color: "bg-amber-500" },
        { label: "Low (<20%)", value: Math.round((lowBattery / batteryTotal) * 100), count: lowBattery, color: "bg-red-500" },
      ],
      signalDistribution: [
        { label: "Excellent", value: Math.round((excellent / signalTotal) * 100), count: excellent, color: "bg-emerald-500" },
        { label: "Good", value: Math.round((goodSig / signalTotal) * 100), count: goodSig, color: "bg-blue-500" },
        { label: "Fair", value: Math.round((fairSig / signalTotal) * 100), count: fairSig, color: "bg-amber-500" },
        { label: "Poor", value: Math.round((poorSig / signalTotal) * 100), count: poorSig, color: "bg-red-500" },
      ],
      faultDistribution,
    });
  });

  // ─── Trends ────────────────────────────────────────────────────────────
  //
  // GET /api/reports/trends?days=30&estate_id=&site_id=&device_id=
  //
  // Returns alert time series and device availability data over the
  // requested period, computed from the events and alerts tables.

  app.get("/trends", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      days?: string;
      estate_id?: string;
      site_id?: string;
      device_id?: string;
    };

    const days = Math.max(1, Math.min(365, parseInt(query.days ?? "30")));
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Build event conditions scoped to the date range and filters
    const eventConditions: SQL[] = [gte(events.occurredAt, startDate)];
    const alertConditions: SQL[] = [gte(alerts.occurredAt, startDate)];

    if (query.device_id) {
      eventConditions.push(eq(events.deviceId, query.device_id));
      alertConditions.push(eq(alerts.deviceId, query.device_id));
    } else if (query.site_id) {
      eventConditions.push(eq(events.siteId, query.site_id));
      alertConditions.push(eq(alerts.siteId, query.site_id));
    } else if (query.estate_id) {
      eventConditions.push(eq(events.estateId, query.estate_id));
      alertConditions.push(eq(alerts.estateId, query.estate_id));
    }

    // Fetch events and alerts in the date range
    const eventRows = await db
      .select({
        date: events.occurredAt,
        severity: events.severity,
        category: events.category,
      })
      .from(events)
      .where(and(...eventConditions))
      .orderBy(asc(events.occurredAt));

    const alertRows = await db
      .select({
        date: alerts.occurredAt,
        severity: alerts.severity,
        status: alerts.status,
      })
      .from(alerts)
      .where(and(...alertConditions))
      .orderBy(asc(alerts.occurredAt));

    // Build daily buckets for alert trends
    const trendBuckets: Record<
      string,
      { critical: number; warning: number; info: number; online: number; offline: number; fault: number }
    > = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      trendBuckets[key] = { critical: 0, warning: 0, info: 0, online: 0, offline: 0, fault: 0 };
      // We store the label in a separate pass below
    }

    // Fill alert trends from events (group by date key)
    for (const e of eventRows) {
      const key = new Date(e.date).toISOString().slice(0, 10);
      if (!trendBuckets[key]) continue;
      if (e.severity === "critical" || e.severity === "error") trendBuckets[key].critical++;
      else if (e.severity === "warning") trendBuckets[key].warning++;
      else trendBuckets[key].info++;
    }

    // Also count alerts by severity per day
    for (const a of alertRows) {
      const key = new Date(a.date).toISOString().slice(0, 10);
      if (!trendBuckets[key]) continue;
      if (a.severity === "critical") trendBuckets[key].critical++;
      else if (a.severity === "warning") trendBuckets[key].warning++;
      else trendBuckets[key].info++;
    }

    // Build availability data from event categories
    for (const e of eventRows) {
      const key = new Date(e.date).toISOString().slice(0, 10);
      if (!trendBuckets[key]) continue;
      if (e.category === "device_online") trendBuckets[key].online++;
      else if (e.category === "device_offline") trendBuckets[key].offline++;
      else if (e.category === "device_fault") trendBuckets[key].fault++;
    }

    // Convert to arrays sorted by date
    const sortedKeys = Object.keys(trendBuckets).sort();
    const alertTrends = sortedKeys.map((date) => ({
      date,
      label: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ...trendBuckets[date],
    }));

    const availability = sortedKeys.map((date) => ({
      name: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      online: trendBuckets[date].online,
      offline: trendBuckets[date].offline,
      fault: trendBuckets[date].fault,
    }));

    return reply.send({
      alertTrends,
      availability,
      days,
    });
  });

  // ─── List Generated Reports ──────────────────────────────────────────

  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      sort?: string;
      order?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20")));
    const offset = (page - 1) * limit;

    const [{ total }] = await db
      .select({ total: count() })
      .from(reports);

    const sortField = query.sort === "name" ? reports.name : reports.createdAt;
    const orderBy = query.order === "asc" ? asc(sortField) : desc(sortField);

    const result = await db
      .select()
      .from(reports)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return reply.send({
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // ─── Single Report ────────────────────────────────────────────────────

  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);

    if (!report) {
      return reply.status(404).send({ message: "Report not found", code: "NOT_FOUND" });
    }

    return reply.send(report);
  });

  // ─── Generate Report ──────────────────────────────────────────────────

  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createReportSchema.parse(request.body);
    const user = request.user as { sub: string; email: string; role: string; name: string };

    const [report] = await db
      .insert(reports)
      .values({
        name: body.name,
        type: body.type,
        format: body.format,
        dateRangeStart: new Date(body.dateRangeStart),
        dateRangeEnd: new Date(body.dateRangeEnd),
        filters: body.filters ?? {},
        metrics: [],
        status: "generating",
        generatedBy: user.sub,
      })
      .returning();

    // In a real app, this would trigger async report generation.
    // For now, mark it as ready immediately.
    const [readyReport] = await db
      .update(reports)
      .set({
        status: "ready",
        generatedAt: new Date(),
        fileUrl: `/api/reports/${report.id}/download`,
      })
      .where(eq(reports.id, report.id))
      .returning();

    return reply.status(201).send(readyReport);
  });
}
