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
import { FileText, Plus, Download, BarChart3 } from "lucide-react";

const reports = [
  { id: "RPT-001", name: "Daily Operations Report", period: "Daily", lastGenerated: "Today 06:00", status: "Ready", format: "PDF" },
  { id: "RPT-002", name: "Weekly Performance Summary", period: "Weekly", lastGenerated: "Mon 06:00", status: "Ready", format: "PDF" },
  { id: "RPT-003", name: "Monthly Fleet Health Report", period: "Monthly", lastGenerated: "1 Jul 2026", status: "Ready", format: "CSV" },
  { id: "RPT-004", name: "Custom: Alert Analysis Q2", period: "Custom", lastGenerated: "15 Jun 2026", status: "Ready", format: "PDF" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Reports"
        description="Generate and manage operational reports"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        }
      />

      {/* Quick report cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Online %", value: "92.4%", change: "+0.8%" },
          { label: "Total Downtime", value: "47 min", change: "-12 min" },
          { label: "Fault Count", value: "37", change: "+5" },
          { label: "Avg Response Time", value: "2.3s", change: "-0.4s" },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-xs text-emerald-600">{metric.change} vs last period</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reports list */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>Recently generated reports available for download</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{report.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.period} · {report.format} · {report.lastGenerated}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={report.status === "Ready" ? "online" : "outline"}>
                    {report.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Badge({ variant, children }: { variant: string; children: React.ReactNode }) {
  const classes = variant === "online"
    ? "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400"
    : "text-foreground";
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${classes}`}>{children}</span>;
}
