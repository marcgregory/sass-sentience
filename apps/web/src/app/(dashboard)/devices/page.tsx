"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-dot";
import { useDevices } from "@/hooks/use-devices";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";
import type { StatusReason } from "@sentience/types";
import {
  Plus,
  Search,
  Monitor,
  Battery,
  Wifi,
  Thermometer,
  HardDrive,
  AlertTriangle,
  RefreshCw,
  Cpu,
  X,
  BatteryWarning,
  ThermometerSun,
  WifiOff,
  HeartOff,
  ClipboardX,
} from "lucide-react";
import { useState, useMemo } from "react";

// ─── Status Reason Filter Configuration ──────────────────────────────

const REASON_FILTERS: {
  reason: StatusReason;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { reason: "HEARTBEAT_TIMEOUT", label: "Heartbeat Timeout", icon: HeartOff, color: "text-slate-500" },
  { reason: "BATTERY_CRITICAL", label: "Battery Critical", icon: BatteryWarning, color: "text-red-500" },
  { reason: "LOW_BATTERY", label: "Low Battery", icon: BatteryWarning, color: "text-amber-500" },
  { reason: "BATTERY_MISSING", label: "Battery Missing", icon: BatteryWarning, color: "text-amber-500" },
  { reason: "WEAK_SIGNAL", label: "Weak Signal", icon: WifiOff, color: "text-amber-500" },
  { reason: "OVERHEAT", label: "Overheating", icon: ThermometerSun, color: "text-amber-500" },
  { reason: "HARDWARE_DIAGNOSTIC_FAILED", label: "Hardware Fault", icon: ClipboardX, color: "text-red-500" },
];

export default function DevicesPage() {
  const router = useRouter();
  const { devices, total, isLoading, isError, error } = useDevices();
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);
  const hasLiveData =
    Object.keys(useLiveDeviceStore.getState().devices).length > 0;
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);

  // ── Search & filter state ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReasonFilters, setActiveReasonFilters] = useState<StatusReason[]>([]);

  const toggleReasonFilter = (reason: StatusReason) => {
    setActiveReasonFilters((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    );
  };

  // ── Filtered devices ────────────────────────────────────────────────
  const filteredDevices = useMemo(() => {
    let result = devices;

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.serial.toLowerCase().includes(q) ||
          d.site.toLowerCase().includes(q),
      );
    }

    // Reason filters
    if (activeReasonFilters.length > 0) {
      result = result.filter((d) =>
        activeReasonFilters.some((r) => d.reasons.includes(r)),
      );
    }

    return result;
  }, [devices, searchQuery, activeReasonFilters]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Devices"
        description="Monitor and manage all connected devices"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Add Device
          </Button>
        }
      />

      {/* Simulator Mode banner */}
      {simulatorMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Simulator Mode — showing {devices.length} simulated device
            {devices.length !== 1 ? "s" : ""}. Toggle Sim OFF in the header to
            return to database view.
          </span>
        </div>
      )}

      {/* Connection banner */}
      {!isSocketConnected && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
          {hasLiveData
            ? "Showing cached data — real-time connection is offline."
            : "Real-time connection is offline. Static data shown."}
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3">
        {/* Top row — search bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search devices"
              placeholder="Search by name, serial, or site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setSearchQuery("");
              setActiveReasonFilters([]);
            }}
            disabled={!searchQuery && activeReasonFilters.length === 0}
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>

        {/* Bottom row — reason filter chips */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status reason">
          {REASON_FILTERS.map(({ reason, label, icon: Icon, color }) => {
            const isActive = activeReasonFilters.includes(reason);
            return (
              <button
                key={reason}
                type="button"
                aria-pressed={isActive}
                onClick={() => toggleReasonFilter(reason)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors
                  ${
                    isActive
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
              >
                <Icon className={`h-3 w-3 ${isActive ? "" : color}`} />
                {label}
                {isActive && (
                  <X className="h-3 w-3 ml-0.5" />
                )}
              </button>
            );
          })}
          {activeReasonFilters.length > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              {filteredDevices.length} device{filteredDevices.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="flex items-center gap-4 p-6">
            <AlertTriangle className="h-8 w-8 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Failed to load devices</CardTitle>
              <CardDescription className="mt-0.5">
                {error instanceof Error
                  ? error.message
                  : "The API server may be offline. Start the backend to see device data."}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Device
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Serial
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Battery
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Signal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Temp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Site
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-full max-w-[100px] animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredDevices.length === 0 && (
        <EmptyState
          icon={HardDrive}
          title={activeReasonFilters.length > 0 || searchQuery ? "No matching devices" : "No devices found"}
          description={
            activeReasonFilters.length > 0 || searchQuery
              ? "No devices match the current filters. Try adjusting your search or clearing the filters."
              : "No devices are registered yet. Add a device or start the MQTT simulator to get started."
          }
          action={
            activeReasonFilters.length > 0 || searchQuery
              ? { label: "Clear Filters", onClick: () => { setSearchQuery(""); setActiveReasonFilters([]); } }
              : undefined
          }
        />
      )}

      {/* Device Table */}
      {!isLoading && filteredDevices.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Device
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Serial
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Battery
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Signal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Temp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Site
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr
                  key={device.id}
                  className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/devices/${device.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {device.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                    {device.serial}
                  </td>
                  <td className="px-4 py-3 text-sm">{device.type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={device.status} reasons={device.reasons} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Battery
                        className={`h-3.5 w-3.5 ${device.battery > 40 ? "text-emerald-500" : "text-red-500"}`}
                      />
                      <span
                        className={`text-sm font-medium ${device.battery <= 20 ? "text-red-500" : ""}`}
                      >
                        {device.battery > 0 ? `${device.battery}%` : device.battery === 0 ? "0%" : "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Wifi
                        className={`h-3.5 w-3.5 ${device.signal < -70 ? "text-amber-500" : "text-emerald-500"}`}
                      />
                      <span className="text-sm">
                        {device.signal !== 0 ? `${device.signal} dBm` : "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-sm">
                        {device.temp !== 0 ? `${device.temp}°C` : "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {device.site}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {activeReasonFilters.length > 0 || searchQuery
            ? `Showing ${filteredDevices.length} of ${devices.length} devices`
            : `Showing 1-${devices.length} of ${total > 0 ? total.toLocaleString() : devices.length} devices`
          }
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
