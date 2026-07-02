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
import { Plus, Building2, MapPin, Monitor, AlertTriangle } from "lucide-react";

const estates = [
  {
    id: "EST-001",
    name: "Riverside Industrial Park",
    address: "123 Riverside Drive, Manchester",
    region: "North West",
    siteCount: 6,
    deviceCount: 847,
    healthScore: 94,
  },
  {
    id: "EST-002",
    name: "Tech Valley Campus",
    address: "456 Innovation Way, Cambridge",
    region: "East",
    siteCount: 4,
    deviceCount: 612,
    healthScore: 97,
  },
  {
    id: "EST-003",
    name: "Harbour Logistics Hub",
    address: "789 Port Road, Southampton",
    region: "South East",
    siteCount: 5,
    deviceCount: 534,
    healthScore: 88,
  },
  {
    id: "EST-004",
    name: "Greenfield Business Park",
    address: "321 Commerce Street, Birmingham",
    region: "Midlands",
    siteCount: 3,
    deviceCount: 398,
    healthScore: 91,
  },
  {
    id: "EST-005",
    name: "Lakeside Technology Centre",
    address: "654 Lakeview Boulevard, Reading",
    region: "South East",
    siteCount: 2,
    deviceCount: 456,
    healthScore: 95,
  },
];

export default function EstatesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Estates"
        description="Manage your property estates and their security infrastructure"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Add Estate
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {estates.map((estate) => (
          <Card key={estate.id} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{estate.name}</CardTitle>
                  <CardDescription>{estate.address}</CardDescription>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Health Score</span>
                    <span>{estate.healthScore}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        estate.healthScore >= 95
                          ? "bg-emerald-500"
                          : estate.healthScore >= 90
                            ? "bg-blue-500"
                            : "bg-amber-500"
                      }`}
                      style={{ width: `${estate.healthScore}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted p-2">
                  <div className="flex items-center justify-center gap-1 text-sm font-medium">
                    <MapPin className="h-3 w-3" />
                    {estate.siteCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Sites</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <div className="flex items-center justify-center gap-1 text-sm font-medium">
                    <Monitor className="h-3 w-3" />
                    {estate.deviceCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Devices</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <div className="flex items-center justify-center gap-1 text-sm font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    {Math.floor(estate.deviceCount * 0.03)}
                  </div>
                  <p className="text-xs text-muted-foreground">Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
