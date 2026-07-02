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
import type { DeviceStatus } from "@sentience/types";

const devices = [
  { id: "DEV-001", name: "Gate Controller A3", serial: "SN-2024-001", type: "Controller", status: "online" as DeviceStatus, battery: 87, signal: -52, temp: 24.5, site: "Building A - Riverside" },
  { id: "DEV-002", name: "Sensor B7", serial: "SN-2024-002", type: "Sensor", status: "online" as DeviceStatus, battery: 12, signal: -61, temp: 22.1, site: "Building B - Riverside" },
  { id: "DEV-003", name: "Gateway 4", serial: "SN-2024-003", type: "Gateway", status: "warning" as DeviceStatus, battery: 45, signal: -78, temp: 31.2, site: "Warehouse 1 - Tech Valley" },
  { id: "DEV-004", name: "Relay Panel 2", serial: "SN-2024-004", type: "Relay", status: "fault" as DeviceStatus, battery: 0, signal: -95, temp: 28.7, site: "Main Terminal - Harbour" },
  { id: "DEV-005", name: "Camera NW-12", serial: "SN-2024-005", type: "Camera", status: "online" as DeviceStatus, battery: 92, signal: -44, temp: 26.3, site: "Admin Block - Tech Valley" },
  { id: "DEV-006", name: "Temperature Sensor T3", serial: "SN-2024-006", type: "Sensor", status: "online" as DeviceStatus, battery: 76, signal: -55, temp: 21.8, site: "Building A - Riverside" },
  { id: "DEV-007", name: "Access Controller A1", serial: "SN-2024-007", type: "Controller", status: "offline" as DeviceStatus, battery: 0, signal: 0, temp: 0, site: "Building B - Riverside" },
  { id: "DEV-008", name: "Smoke Detector SD-2", serial: "SN-2024-008", type: "Sensor", status: "online" as DeviceStatus, battery: 68, signal: -58, temp: 23.4, site: "Warehouse 1 - Tech Valley" },
];

export default function DevicesPage() {
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
        <span>Showing 1-8 of 2,847 devices</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}
