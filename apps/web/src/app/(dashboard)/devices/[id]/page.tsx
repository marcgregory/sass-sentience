"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Battery,
  Wifi,
  Thermometer,
  Zap,
  Cpu,
  HardDrive,
  Settings,
  Clock,
  MapPin,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Gauge,
  Radio,
  Play,
  Box,
  List,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusDot, StatusBadge } from "@/components/shared/status-dot";
import { EmptyState } from "@/components/shared/empty-state";
import { useDevice } from "@/hooks/use-devices";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";
import {
  cn,
  formatRelativeTime,
  formatDateTime,
  formatVoltage,
  formatSignalStrength,
  formatBattery,
  formatTemperature,
} from "@sentience/utils";
import type { DeviceStatus } from "@sentience/types";
import { getEvents } from "@/lib/events";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// ─── Types ───────────────────────────────────────────────────────────────

type TabId =
  | "overview"
  | "telemetry"
  | "io"
  | "diagnostics"
  | "events"
  | "config";

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "telemetry", label: "Telemetry", icon: Gauge },
  { id: "io", label: "I/O", icon: Box },
  { id: "diagnostics", label: "Diagnostics", icon: Radio },
  { id: "events", label: "Events", icon: List },
  { id: "config", label: "Config", icon: Settings },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

function batteryColor(value: number | null): string {
  if (value == null) return "text-slate-400";
  if (value <= 20) return "text-red-500";
  if (value <= 50) return "text-amber-500";
  return "text-emerald-500";
}

function batteryBg(value: number | null): string {
  if (value == null) return "bg-slate-400";
  if (value <= 20) return "bg-red-500";
  if (value <= 50) return "bg-amber-500";
  return "bg-emerald-500";
}

function signalColor(dbm: number): string {
  if (dbm <= -90) return "text-red-500";
  if (dbm <= -70) return "text-amber-500";
  return "text-emerald-500";
}

function severityIcon(severity: string): LucideIcon {
  switch (severity) {
    case "critical":
      return AlertTriangle;
    case "warning":
      return AlertCircle;
    default:
      return CheckCircle2;
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-500";
    case "warning":
      return "text-amber-500";
    default:
      return "text-emerald-500";
  }
}

function diagnosticStatusIcon(status: string): LucideIcon {
  switch (status) {
    case "pass":
    case "passed":
      return CheckCircle2;
    case "fail":
    case "failed":
      return XCircle;
    default:
      return AlertCircle;
  }
}

function diagnosticStatusColor(status: string): string {
  switch (status) {
    case "pass":
    case "passed":
      return "text-emerald-500";
    case "fail":
    case "failed":
      return "text-red-500";
    default:
      return "text-amber-500";
  }
}

function formatIoValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

// ─── Section Components ───────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn("rounded-lg bg-muted p-2", className)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MetricBar({
  label,
  value,
  min,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value}
          {unit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const deviceId = params.id;
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [runningDiag, setRunningDiag] = useState<string | null>(null);

  // API data source
  const { device, apiDevice, isLoading, isError } = useDevice(deviceId);

  // Live data overlay (only in simulator mode)
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);
  const liveDeviceEntry = useLiveDeviceStore((s) => s.devices[deviceId]);
  const recentEvents = useLiveDeviceStore((s) => s.recentEvents);

  // Events from API
  const { data: eventsData } = useQuery({
    queryKey: queryKeys.events.list({ device_id: deviceId, limit: 20 }),
    queryFn: () => getEvents({ device_id: deviceId, limit: 20 }),
    enabled: !!deviceId && !simulatorMode,
  });

  // Device-specific events (live in simulator mode, API otherwise)
  const deviceEvents = useMemo(() => {
    if (simulatorMode) {
      const live = recentEvents.filter((e) => e.deviceId === deviceId);
      return live.length > 0 ? live : [];
    }
    return (eventsData?.data ?? []).map((e) => ({
      eventId: e.id,
      deviceId: e.deviceId ?? deviceId,
      severity: e.severity,
      title: e.title,
      timestamp: e.occurredAt,
      category: e.category,
    }));
  }, [eventsData, recentEvents, deviceId, simulatorMode]);

  // ═══ Loading State ══════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-56 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ═══ Error State ════════════════════════════════════════════════════════

  if (isError) {
    return (
      <div className="animate-fade-in">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2"
          onClick={() => router.push("/devices")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Devices
        </Button>
        <EmptyState
          icon={AlertTriangle}
          title="Failed to load device"
          description={
            isError
              ? "The API server may be offline. Please try again or return to the device list."
              : `No device matches ID "${deviceId}".`
          }
          action={{
            label: "Retry",
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  // ═══ Not Found ══════════════════════════════════════════════════════════

  if (!device) {
    return (
      <div className="animate-fade-in">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2"
          onClick={() => router.push("/devices")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Devices
        </Button>
        <EmptyState
          icon={HardDrive}
          title="Device not found"
          description={`No device matches ID "${deviceId}". It may have been removed or the ID is incorrect.`}
          action={{
            label: "View All Devices",
            onClick: () => router.push("/devices"),
          }}
        />
      </div>
    );
  }

  // ═══ Device found — render detail ═══════════════════════════════════════

  const live = simulatorMode ? liveDeviceEntry : undefined;

  // Live telemetry (from store) or fallback to API static values
  const telemetry = live?.telemetry
    ? {
        battery: live.telemetry.battery,
        voltage: live.telemetry.voltage,
        temperature: live.telemetry.temperature,
        signalStrength: live.telemetry.signalStrength,
        timestamp: live.telemetry.timestamp,
      }
    : {
        battery: device.battery,
        voltage: device.battery != null && device.battery > 0 ? 3.3 + (device.battery / 100) * 0.7 : 0,
        temperature: device.temp,
        signalStrength: device.signal,
        timestamp: new Date().toISOString(),
      };

  const siteName =
    live?.siteName ?? apiDevice?.siteName ?? device.site;
  const estateName = live?.estateName ?? apiDevice?.estateName;
  const status: DeviceStatus = device.status;
  const reasons = device.reasons;
  const lastSeen = live?.lastSeen ?? new Date().toISOString();
  const isLive = simulatorMode && !!live;

  // ─── Real data from API ─────────────────────────────────────────────────

  // Firmware from API
  const firmware = {
    version: apiDevice?.firmwareVersion ?? "—",
    build: apiDevice?.firmwareBuild ?? "—",
    releasedAt: apiDevice?.firmwareReleasedAt,
    installedAt: apiDevice?.firmwareInstalledAt,
  };

  // Config from API
  const config = apiDevice?.deviceConfig as Record<string, unknown> | null;
  const mqttTopic = (config?.mqttTopic as string) ?? "—";
  const publishInterval = (config?.publishInterval as number) ?? null;
  const samplingRate = (config?.samplingRate as number) ?? null;
  const logLevel = (config?.logLevel as string) ?? null;
  const thresholds = config?.thresholds as Record<string, number> | null;

  // I/O from API
  const ioData = apiDevice?.deviceIo as Record<string, unknown> | null;
  const ioInputs = (ioData?.inputs as Array<Record<string, unknown>>) ?? [];
  const ioOutputs = (ioData?.outputs as Array<Record<string, unknown>>) ?? [];

  // Diagnostics from API
  const diagnosticData = apiDevice?.lastDiagnostics as Record<string, unknown> | null;
  const diagnosticChecks = (diagnosticData?.checks as Array<Record<string, unknown>>) ?? [];
  const diagnosticStatus = (diagnosticData?.status as string) ?? "unknown";
  const diagnosticLastRun = (diagnosticData?.lastRun as string) ?? null;

  const handleRunDiagnostic = (diagId: string) => {
    setRunningDiag(diagId);
    setTimeout(() => setRunningDiag(null), 2000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "telemetry":
        return renderTelemetry();
      case "io":
        return renderIO();
      case "diagnostics":
        return renderDiagnostics();
      case "events":
        return renderEvents();
      case "config":
        return renderConfig();
      default:
        return null;
    }
  };

  // ─── Tab: Overview ─────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Battery}
          label="Battery"
          value={formatBattery(telemetry.battery)}
          className={batteryColor(telemetry.battery)}
        />
        <StatCard
          icon={Wifi}
          label="Signal"
          value={`${telemetry.signalStrength} dBm`}
          className={signalColor(telemetry.signalStrength)}
        />
        <StatCard
          icon={Thermometer}
          label="Temperature"
          value={`${telemetry.temperature.toFixed(1)}°C`}
          className="text-blue-500"
        />
        <StatCard
          icon={Zap}
          label="Voltage"
          value={formatVoltage(telemetry.voltage)}
          className="text-purple-500"
        />
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Device Info */}
        <SectionCard title="Device Information">
          <div className="space-y-3">
            <InfoRow label="Device ID" value={device.id} mono />
            <InfoRow label="Serial Number" value={device.serial} mono />
            <InfoRow label="Type" value={device.type} />
            <InfoRow
              label="Status"
              value={<StatusBadge status={status} reasons={reasons} />}
            />
            <InfoRow
              label="Site"
              value={
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {siteName}
                </span>
              }
            />
            {estateName && (
              <InfoRow
                label="Estate"
                value={
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {estateName}
                  </span>
                }
              />
            )}
            <InfoRow
              label="Last Seen"
              value={
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatRelativeTime(lastSeen)}
                </span>
              }
            />
            <InfoRow
              label="Data Source"
              value={
                <Badge variant={isLive ? "online" : "outline"}>
                  {isLive ? "Live" : "Static"}
                </Badge>
              }
            />
          </div>
        </SectionCard>

        {/* Firmware */}
        <SectionCard title="Firmware">
          <div className="space-y-3">
            <InfoRow label="Version" value={firmware.version} />
            <InfoRow label="Build" value={firmware.build} mono />
            {firmware.releasedAt && (
              <InfoRow label="Released" value={formatDateTime(firmware.releasedAt)} />
            )}
            {firmware.installedAt && (
              <InfoRow label="Installed" value={formatDateTime(firmware.installedAt)} />
            )}
            <div className="pt-2">
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Check for Updates
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Recent Events (on overview) */}
      {deviceEvents.length > 0 && (
        <SectionCard
          title="Recent Activity"
          description="Latest events for this device"
        >
          <div className="space-y-2">
            {deviceEvents.slice(0, 5).map((event) => {
              const SevIcon = severityIcon(event.severity);
              return (
                <div
                  key={event.eventId}
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <SevIcon
                    className={`h-4 w-4 ${severityColor(event.severity)}`}
                  />
                  <span className="flex-1">{event.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );

  // ─── Tab: Telemetry ────────────────────────────────────────────────────

  const renderTelemetry = () => (
    <div className="space-y-6">
      <SectionCard
        title="Telemetry"
        description={
          isLive
            ? "Live telemetry updating in real time"
            : "Static data — start the MQTT simulator for live updates"
        }
      >
        <div className="space-y-6">
          <MetricBar
            label="Battery"
            value={telemetry.battery ?? 0}
            min={0}
            max={100}
            unit="%"
            color={batteryBg(telemetry.battery)}
          />
          <MetricBar
            label="Signal Strength"
            value={Math.abs(telemetry.signalStrength)}
            min={0}
            max={100}
            unit=" dBm"
            color="bg-blue-500"
          />
          <MetricBar
            label="Temperature"
            value={telemetry.temperature}
            min={-10}
            max={60}
            unit="°C"
            color="bg-orange-500"
          />
          <MetricBar
            label="Voltage"
            value={telemetry.voltage}
            min={0}
            max={5}
            unit="V"
            color="bg-purple-500"
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TelemetryCard
          icon={Battery}
          label="Battery"
          value={formatBattery(telemetry.battery)}
          detail={
            live
              ? `Updated ${formatRelativeTime(live.telemetry?.timestamp ?? "")}`
              : "Static data"
          }
          color="text-emerald-500"
        />
        <TelemetryCard
          icon={Thermometer}
          label="Temperature"
          value={formatTemperature(telemetry.temperature)}
          detail={
            live
              ? `Updated ${formatRelativeTime(live.telemetry?.timestamp ?? "")}`
              : "Static data"
          }
          color="text-orange-500"
        />
        <TelemetryCard
          icon={Zap}
          label="Voltage"
          value={formatVoltage(telemetry.voltage)}
          detail={
            live
              ? `Updated ${formatRelativeTime(live.telemetry?.timestamp ?? "")}`
              : "Static data"
          }
          color="text-purple-500"
        />
        <TelemetryCard
          icon={Wifi}
          label="Signal"
          value={formatSignalStrength(telemetry.signalStrength)}
          detail={
            live
              ? `Updated ${formatRelativeTime(live.telemetry?.timestamp ?? "")}`
              : "Static data"
          }
          color={signalColor(telemetry.signalStrength)}
        />
      </div>
    </div>
  );

  // ─── Tab: I/O ───────────────────────────────────────────────────────────

  const renderIO = () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        title="Inputs"
        description={`${ioInputs.length} input point${ioInputs.length !== 1 ? "s" : ""}`}
      >
        {ioInputs.length === 0 ? (
          <EmptyState
            icon={Box}
            title="No inputs"
            description="This device has no input points configured."
          />
        ) : (
          <div className="space-y-2">
            {ioInputs.map((point, idx) => (
              <IOPointRow key={(point.name as string) ?? idx} point={point} />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Outputs"
        description={`${ioOutputs.length} output point${ioOutputs.length !== 1 ? "s" : ""}`}
      >
        {ioOutputs.length === 0 ? (
          <EmptyState
            icon={Box}
            title="No outputs"
            description="This device has no output points configured."
          />
        ) : (
          <div className="space-y-2">
            {ioOutputs.map((point, idx) => (
              <IOPointRow key={(point.name as string) ?? idx} point={point} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );

  // ─── Tab: Diagnostics ──────────────────────────────────────────────────

  const renderDiagnostics = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last Diagnostics</CardTitle>
          <CardDescription>
            {diagnosticLastRun
              ? `Last run: ${formatRelativeTime(diagnosticLastRun)}`
              : "No diagnostic data available"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {diagnosticChecks.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="No diagnostics recorded"
              description="Diagnostic data will appear here after the next check."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {diagnosticChecks.map((check, idx) => {
                const checkStatus = (check.status as string) ?? "unknown";
                const DiagIcon = diagnosticStatusIcon(checkStatus);
                const isRunning = runningDiag === `diag-${idx}`;
                return (
                  <Card key={`diag-${idx}`} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <DiagIcon
                            className={`mt-0.5 h-5 w-5 ${diagnosticStatusColor(checkStatus)}`}
                          />
                          <div>
                            <p className="text-sm font-medium">{check.name as string}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {String(check.message ?? (checkStatus === "pass" ? "OK" : "Warning"))}
                            </p>
                            {check.latency != null && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Latency: {String(check.latency)}
                              </p>
                            )}
                            {check.usage != null && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Usage: {String(check.usage)}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          disabled={isRunning}
                          onClick={() => handleRunDiagnostic(`diag-${idx}`)}
                        >
                          <Play
                            className={`h-3.5 w-3.5 ${isRunning ? "animate-spin" : ""}`}
                          />
                          {isRunning ? "Running..." : "Run"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ─── Tab: Events ───────────────────────────────────────────────────────

  const renderEvents = () => (
    <SectionCard
      title="Event History"
      description={
        deviceEvents.length > 0
          ? `${deviceEvents.length} events recorded`
          : undefined
      }
    >
      {deviceEvents.length === 0 ? (
        <EmptyState
          icon={List}
          title="No events"
          description="No events have been recorded for this device yet."
        />
      ) : (
        <div className="space-y-2">
          {deviceEvents.map((event) => {
            const SevIcon = severityIcon(event.severity);
            return (
              <div
                key={event.eventId}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm"
              >
                <SevIcon
                  className={`h-4 w-4 shrink-0 ${severityColor(event.severity)}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.category.replace(/_/g, " ")}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );

  // ─── Tab: Config ────────────────────────────────────────────────────────

  const renderConfig = () => (
    <SectionCard
      title="Device Configuration"
      description="Current device settings from the backend"
    >
      <div className="space-y-3">
        <InfoRow label="MQTT Topic" value={mqttTopic} mono />
        {publishInterval !== null && (
          <InfoRow label="Publish Interval" value={`${publishInterval}s`} />
        )}
        {samplingRate !== null && (
          <InfoRow label="Sampling Rate" value={`${samplingRate}s`} />
        )}
        {logLevel && (
          <InfoRow label="Log Level" value={logLevel} />
        )}
        {thresholds && Object.keys(thresholds).length > 0 && (
          <div className="pt-2">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Thresholds
            </p>
            <div className="space-y-2 rounded-lg border p-3">
              {Object.entries(thresholds).map(([key, value]) => (
                <InfoRow
                  key={key}
                  label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  value={String(value)}
                />
              ))}
            </div>
          </div>
        )}
        {!thresholds && publishInterval === null && samplingRate === null && !logLevel && (
          <EmptyState
            icon={Settings}
            title="No configuration"
            description="No device configuration has been stored."
          />
        )}
      </div>
    </SectionCard>
  );

  // ═══ Render ══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5"
            onClick={() => router.push("/devices")}
            aria-label="Back to devices"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {device.name}
              </h1>
              <StatusBadge status={status} reasons={reasons} />
              {isLive && (
                <span className="flex items-center gap-1 text-xs text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                  Live
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {device.id} &middot; {device.type} &middot; {siteName}
              {estateName ? ` — ${estateName}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : "font-medium"}>{value}</span>
    </div>
  );
}

function TelemetryCard({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${color}`} />
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function IOPointRow({ point }: { point: Record<string, unknown> }) {
  const name = (point.name as string) ?? "Unknown";
  const type = (point.type as string) ?? "digital";
  const value = point.value;
  const status = (point.status as string) ?? "normal";
  const stateColor = status === "normal" ? "text-emerald-500" : "text-amber-500";

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
      <div className="flex items-center gap-3">
        <div
          className={`h-2 w-2 rounded-full ${status === "normal" ? "bg-emerald-500" : "bg-amber-500"}`}
        />
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">
            {type} &middot; {status}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm">{formatIoValue(value)}</p>
      </div>
    </div>
  );
}
