"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { FleetHealthGauge } from "@/components/shared/fleet-health-gauge";
import { DistributionBar } from "@/components/shared/distribution-bar";
import { RecentActivity } from "@/components/shared/recent-activity";
import { EstateSummaryCards } from "@/components/shared/estate-summary-cards";
import { QuickActions } from "@/components/shared/quick-actions";
import {
  ArrowUpRight,
  ArrowDownRight,
  Monitor,
  Wifi,
  WifiOff,
  Battery,
  Activity,
  Clock,
  Thermometer,
  Zap,
  Radio,
  RefreshCw,
} from "lucide-react";
import { formatRelativeTime } from "@sentience/utils";
import { useDashboardData } from "./use-dashboard-data";
import Link from "next/link";

export default function DashboardPage() {
  const {
    kpis,
    systemHealth,
    fleetHealthScore,
    liveAlerts,
    batteryDistribution,
    signalDistribution,
    temperatureDistribution,
    estateSummary,
    recentActivity,
    devicesOffline,
    eventsToday,
    hasLiveData,
    isSocketConnected,
    lastUpdatedAt,
  } = useDashboardData();

  // Compute offline/fault counts from KPIs for quick actions
  const offlineCount = hasLiveData
    ? parseInt(kpis[2].value.replace(/,/g, ""), 10)
    : undefined;
  const faultCount = hasLiveData
    ? parseInt(kpis[3].value.replace(/,/g, ""), 10)
    : undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Real-time operations center for your IoT estate"
        actions={
          !hasLiveData ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
          ) : undefined
        }
      />

      {/* ─── Simulator Banner ──────────────────────────────────────────── */}
      {!hasLiveData && (
        <Card className="border-dashed border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4 py-4">
            <Radio className="h-6 w-6 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Simulator not running
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Start the MQTT simulator to see live device data update in
                real time. For now, showing mock data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Connection Status Banner ─────────────────────────────────── */}
      {hasLiveData && !isSocketConnected && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Showing cached data — real-time connection is offline.
        </div>
      )}

      {/* ─── KPI Row ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <div className={`rounded-lg p-2 ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {kpi.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={
                    kpi.trend === "up"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {kpi.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Second Row: Fleet Health + Charts + Estate Summary ────────── */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Fleet Health Score + System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fleet Health</CardTitle>
            <CardDescription>Composite health score</CardDescription>
          </CardHeader>
          <CardContent>
            <FleetHealthGauge
              score={fleetHealthScore}
              totalDevices={
                hasLiveData
                  ? parseInt(kpis[0].value.replace(/,/g, ""), 10)
                  : undefined
              }
              className="mb-4"
            />
            <div className="grid grid-cols-2 gap-2 border-t pt-4">
              {systemHealth.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Battery Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Battery className="h-4 w-4" />
              Battery Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBar
              data={batteryDistribution}
              title=""
              description="Good / Fair / Low"
            />
          </CardContent>
        </Card>

        {/* Signal Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4" />
              Signal Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBar
              data={signalDistribution}
              title=""
              description="Excellent / Good / Fair / Poor"
            />
          </CardContent>
        </Card>
      </div>

      {/* ─── Third Row: Temperature + Estates + Recent Activity ────────── */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Temperature Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Thermometer className="h-4 w-4" />
              Temperature Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBar
              data={temperatureDistribution}
              title=""
              description="Normal / High / Critical"
            />
          </CardContent>
        </Card>

        {/* Estate Health Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4" />
              Devices by Estate
            </CardTitle>
            <CardDescription>Health per estate</CardDescription>
          </CardHeader>
          <CardContent>
            <EstateSummaryCards estates={estateSummary} />
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              {hasLiveData
                ? "Latest events from the realtime feed"
                : "Latest events requiring attention"}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-y-auto">
            {!hasLiveData ? (
              <RecentActivity
                events={
                  liveAlerts.length > 0
                    ? liveAlerts.map((a) => ({
                        eventId: a.id,
                        title: a.title,
                        severity: a.severity,
                        timestamp: a.time,
                        siteId: a.site,
                        siteName: undefined,
                        estateId: undefined,
                        estateName: undefined,
                        category: "alert",
                      }))
                    : []
                }
              />
            ) : (
              <RecentActivity events={recentActivity} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Fourth Row: Offline Devices + Quick Actions + Today's Stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Devices Recently Offline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <WifiOff className="h-4 w-4 text-slate-500" />
              Recently Offline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devicesOffline.length > 0 ? (
              <div className="space-y-2">
                {devicesOffline.map((d) => (
                  <Link
                    key={d.id}
                    href={`/devices/${d.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.site}</p>
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(d.lastSeen)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : !hasLiveData ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground">
                  <span>Simulator data required</span>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground">
                  <span>Start simulator to populate</span>
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                All devices are online
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuickActions
              offlineCount={devicesOffline.length > 0 ? devicesOffline.length : undefined}
              faultCount={faultCount}
            />
          </CardContent>
        </Card>

        {/* Today's Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Today&apos;s Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Events Today
                  </span>
                </div>
                <span className="text-sm font-medium">{eventsToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Last Updated
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {lastUpdatedAt
                    ? formatRelativeTime(lastUpdatedAt)
                    : "—"}
                </span>
              </div>
              {hasLiveData && isSocketConnected && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-sm text-muted-foreground">
                      Connection
                    </span>
                  </div>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Live
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Health Score
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {fleetHealthScore}/100
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
