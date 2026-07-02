"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FleetHealthGauge } from "@/components/shared/fleet-health-gauge";
import { DistributionBar } from "@/components/shared/distribution-bar";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";
import {
  Download,
  FileText,
  Calendar,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle,
  WifiOff,
  RefreshCw,
  Printer,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn, formatDateTime, formatRelativeTime, formatBattery, formatSignalStrength, colorClassToHex } from "@sentience/utils";
import { useReportsData, type ReportFilter } from "./use-reports-data";

// ─── Constants ────────────────────────────────────────────────────

const DATE_OPTIONS: { key: ReportFilter["dateRange"]; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" },
];

const CHART_COLORS = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  online: "#10b981",
  offline: "#94a3b8",
  fault: "#ef4444",
};

// ─── Helpers ──────────────────────────────────────────────────────

export default function ReportsPage() {
  const [filter, setFilter] = useState<ReportFilter>({
    dateRange: "30d",
    estateId: null,
    siteId: null,
    deviceId: null,
  });

  const {
    fleetSummary,
    alertTrends,
    availability,
    batteryDistribution,
    signalDistribution,
    faultDistribution,
    hasLiveData,
    isSocketConnected,
    days,
    eventsInScope,
    openAlerts,
    recentExports,
    estateOptions,
    siteOptions,
    deviceOptions,
    downloadCSV,
  } = useReportsData(filter);

  const hasFilters = filter.estateId || filter.siteId || filter.deviceId;

  // ─── Filter helpers ─────────────────────────────────────────────

  const updateFilter = useCallback(<K extends keyof ReportFilter>(
    key: K,
    value: ReportFilter[K],
  ) => {
    setFilter((prev) => {
      const next = { ...prev, [key]: value };
      // Cascade: changing estate clears site and device
      if (key === "estateId") {
        next.siteId = null;
        next.deviceId = null;
      }
      // Changing site clears device
      if (key === "siteId") {
        next.deviceId = null;
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilter({ dateRange: "30d", estateId: null, siteId: null, deviceId: null });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Reports"
        description="Generate and export fleet reports with charts and summary statistics"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" disabled title="Coming soon">
              <Printer className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
          </div>
        }
      />

      {/* ─── Connection Banner ─────────────────────────────────────── */}
      {!hasLiveData && (
        <Card className="border-dashed border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4 py-4">
            <WifiOff className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Simulator not running
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Start the MQTT simulator to see live device data. Showing
                representative mock data for now.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Filter Bar ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Date Range */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Date Range</p>
              <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                {DATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => updateFilter("dateRange", opt.key)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      filter.dateRange === opt.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Estate filter */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Estate</p>
              <select
                value={filter.estateId ?? ""}
                onChange={(e) => updateFilter("estateId", e.target.value || null)}
                className="rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
              >
                <option value="">All Estates</option>
                {estateOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>

            {/* Site filter */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Site</p>
              <select
                value={filter.siteId ?? ""}
                onChange={(e) => updateFilter("siteId", e.target.value || null)}
                className="rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
              >
                <option value="">All Sites</option>
                {siteOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>

            {/* Device filter */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Device</p>
              <select
                value={filter.deviceId ?? ""}
                onChange={(e) => updateFilter("deviceId", e.target.value || null)}
                className="rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
              >
                <option value="">All Devices</option>
                {deviceOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name} ({opt.id.slice(0, 6)})</option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Fleet Summary Cards ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fleetSummary.totalDevices.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {fleetSummary.onlinePct}% online · {fleetSummary.onlineDevices} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Battery</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBattery(fleetSummary.avgBattery)}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all tracked devices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Signal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatSignalStrength(fleetSummary.avgSignal)}</p>
            <p className="text-xs text-muted-foreground mt-1">Signal strength average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{openAlerts}</p>
            <p className="text-xs text-muted-foreground mt-1">{eventsInScope} events in scope</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Fleet Health Gauge Row ────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Health Score */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Fleet Health</CardTitle>
            <CardDescription>Composite health score for the selected scope</CardDescription>
          </CardHeader>
          <CardContent>
            <FleetHealthGauge
              score={fleetSummary.healthScore}
              totalDevices={fleetSummary.totalDevices}
            />
          </CardContent>
        </Card>

        {/* Online % breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Device Status Breakdown
            </CardTitle>
            <CardDescription>Online / Offline / Fault / Warning distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Online", value: fleetSummary.onlinePct, color: "bg-emerald-500" },
                { label: "Offline", value: fleetSummary.totalDevices > 0 ? Math.round((fleetSummary.offlineDevices / fleetSummary.totalDevices) * 100) : 0, color: "bg-slate-400" },
                { label: "Fault", value: fleetSummary.totalDevices > 0 ? Math.round((fleetSummary.faultDevices / fleetSummary.totalDevices) * 100) : 0, color: "bg-red-500" },
                { label: "Warning", value: fleetSummary.totalDevices > 0 ? Math.round((fleetSummary.warningDevices / fleetSummary.totalDevices) * 100) : 0, color: "bg-amber-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={cn("h-2 rounded-full transition-all", item.color)}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Charts Row 1: Alert Trends + Battery ──────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Alert Trends (Line Chart) */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Alert Trends
            </CardTitle>
            <CardDescription>Alert volume over the last {days} day{days !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={alertTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area
                    type="monotone"
                    dataKey="critical"
                    stackId="1"
                    stroke={CHART_COLORS.critical}
                    fill={CHART_COLORS.critical}
                    fillOpacity={0.6}
                    name="Critical"
                  />
                  <Area
                    type="monotone"
                    dataKey="warning"
                    stackId="1"
                    stroke={CHART_COLORS.warning}
                    fill={CHART_COLORS.warning}
                    fillOpacity={0.6}
                    name="Warning"
                  />
                  <Area
                    type="monotone"
                    dataKey="info"
                    stackId="1"
                    stroke={CHART_COLORS.info}
                    fill={CHART_COLORS.info}
                    fillOpacity={0.6}
                    name="Info"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Battery Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Battery Health
            </CardTitle>
            <CardDescription>Good / Fair / Low</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBar data={batteryDistribution} title="" />
          </CardContent>
        </Card>
      </div>

      {/* ─── Charts Row 2: Availability + Signal + Faults ──────────── */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Device Availability (Bar Chart) */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Device Availability
            </CardTitle>
            <CardDescription>Online / Offline / Fault over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={availability}
                  margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    dataKey="online"
                    stackId="a"
                    fill={CHART_COLORS.online}
                    name="Online"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="offline"
                    stackId="a"
                    fill={CHART_COLORS.offline}
                    name="Offline"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="fault"
                    stackId="a"
                    fill={CHART_COLORS.fault}
                    name="Fault"
                    radius={[0, 0, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Signal Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Signal Quality
            </CardTitle>
            <CardDescription>Excellent / Good / Fair / Poor</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBar data={signalDistribution} title="" />
          </CardContent>
        </Card>
      </div>

      {/* ─── Charts Row 3: Fault Distribution ──────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Fault Distribution (Pie Chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <PieChartIcon className="h-4 w-4" />
              Fault Distribution
            </CardTitle>
            <CardDescription>Faults by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={faultDistribution.map((f) => ({
                      name: f.category,
                      value: f.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine
                  >
                    {faultDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Scheduling + Exports */}
        <div className="space-y-4">
          {/* Schedule Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Schedule Report
              </CardTitle>
              <CardDescription>Automate report generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Schedule daily, weekly, or monthly report generation.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-muted-foreground">Daily</span>
                  <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-muted-foreground">Weekly</span>
                  <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-muted-foreground">Monthly</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Exports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Download className="h-4 w-4" />
                Recent Exports
              </CardTitle>
              <CardDescription>Recently generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              {recentExports.length > 0 ? (
                <div className="divide-y">
                  {recentExports.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{exp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {exp.format} · {exp.dateRange} · {formatRelativeTime(exp.exportedAt)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-2" onClick={downloadCSV}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No exports yet. Generate a report to see it here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
