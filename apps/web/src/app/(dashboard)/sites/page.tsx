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
import { Plus, MapPin, Monitor, Users } from "lucide-react";

const sites = [
  { id: "SITE-001", name: "Building A - Riverside", estate: "Riverside Industrial Park", deviceCount: 142, onlineCount: 138, personnel: 12 },
  { id: "SITE-002", name: "Building B - Riverside", estate: "Riverside Industrial Park", deviceCount: 98, onlineCount: 92, personnel: 8 },
  { id: "SITE-003", name: "Warehouse 1 - Tech Valley", estate: "Tech Valley Campus", deviceCount: 204, onlineCount: 201, personnel: 15 },
  { id: "SITE-004", name: "Admin Block - Tech Valley", estate: "Tech Valley Campus", deviceCount: 76, onlineCount: 74, personnel: 6 },
  { id: "SITE-005", name: "Main Terminal - Harbour", estate: "Harbour Logistics Hub", deviceCount: 187, onlineCount: 178, personnel: 22 },
];

export default function SitesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Sites"
        description="View and manage all monitored sites"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Add Site
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sites.map((site) => {
          const faultCount = site.deviceCount - site.onlineCount;
          const healthPct = Math.round((site.onlineCount / site.deviceCount) * 100);
          return (
            <Card key={site.id} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{site.name}</CardTitle>
                    <CardDescription>{site.estate}</CardDescription>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Health</span>
                    <span>{healthPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        healthPct >= 98 ? "bg-emerald-500" : healthPct >= 90 ? "bg-blue-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${healthPct}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="text-sm font-medium">{site.deviceCount}</p>
                    <p className="text-xs text-muted-foreground">Devices</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="text-sm font-medium text-emerald-600">{site.onlineCount}</p>
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <p className="text-sm font-medium text-red-600">{faultCount}</p>
                    <p className="text-xs text-muted-foreground">Issues</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
