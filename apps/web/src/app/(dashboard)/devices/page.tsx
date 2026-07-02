"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-dot";
import { Plus, Search, Filter, Monitor, Battery, Wifi, Thermometer } from "lucide-react";
import { useLiveDevices } from "@/hooks/use-live-devices";
import { useLiveDeviceStore } from "@/stores/live-device-store";

export default function DevicesPage() {
  const devices = useLiveDevices();
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);
  const hasLiveData = Object.keys(useLiveDeviceStore.getState().devices).length > 0;

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

      {/* Connection banner */}
      {!isSocketConnected && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
          {hasLiveData
            ? "Showing cached data — real-time connection is offline."
            : "Real-time connection is offline. Static data shown."}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by name, serial, or site..."
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
        <Button variant="outline" size="sm">All Types</Button>
        <Button variant="outline" size="sm">All Status</Button>
      </div>

      {/* Device Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Device</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Serial</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Battery</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Signal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Temp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Site</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{device.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{device.serial}</td>
                <td className="px-4 py-3 text-sm">{device.type}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={device.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Battery className={`h-3.5 w-3.5 ${device.battery > 40 ? "text-emerald-500" : "text-red-500"}`} />
                    <span className={`text-sm font-medium ${device.battery <= 20 ? "text-red-500" : ""}`}>
                      {device.battery > 0 ? `${device.battery}%` : "N/A"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Wifi className={`h-3.5 w-3.5 ${device.signal < -70 ? "text-amber-500" : "text-emerald-500"}`} />
                    <span className="text-sm">{device.signal !== 0 ? `${device.signal} dBm` : "N/A"}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-sm">{device.temp !== 0 ? `${device.temp}°C` : "N/A"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{device.site}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing 1-{devices.length} of {hasLiveData ? devices.length : "2,847"} devices</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}
