"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Monitor,
  Wifi,
  Radio,
  Battery,
  Cpu,
  Cable,
  Activity,
  Search,
  FileText,
  Loader2,
} from "lucide-react";
import { useDiagnosticTests, useRunDiagnostic, useDiagnosticResults } from "@/hooks/use-diagnostics";
import { useDevices } from "@/hooks/use-devices";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import type { SimulatedNotification } from "@/stores/notification-store";
import type { DiagnosticTest, DiagnosticTestType, DeviceType } from "@sentience/types";

// ─── Icon Map ─────────────────────────────────────────────────────────────

const testIcons: Record<DiagnosticTestType, typeof Monitor> = {
  ping: Monitor,
  connection: Cable,
  mqtt: Radio,
  signal: Wifi,
  battery: Battery,
  firmware: Cpu,
  cellular: Radio,
  gps: Monitor,
  stream: Activity,
  lens: Monitor,
  sd_card: FileText,
  relay_coil: Cable,
};

const defaultIcon = Monitor;

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────

function DeviceSelector({
  devices,
  selected,
  onChange,
}: {
  devices: { id: string; name: string; type: string }[];
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <select
        className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select device"
      >
        <option value="">All devices</option>
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.type})
          </option>
        ))}
      </select>
    </div>
  );
}

function TestCard({
  test,
  onRun,
  isRunning,
}: {
  test: DiagnosticTest;
  onRun: () => void;
  isRunning: boolean;
}) {
  const Icon = testIcons[test.type] ?? defaultIcon;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm truncate">{test.name}</CardTitle>
            <CardDescription className="truncate">{test.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardFooter className="pt-0">
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={onRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Diagnostic
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ResultRow({ result }: { result: any }) {
  const StatusIcon = result.status === "passed"
    ? CheckCircle2
    : result.status === "failed"
      ? XCircle
      : AlertCircle;
  const iconClass = result.status === "passed"
    ? "text-emerald-500"
    : result.status === "failed"
      ? "text-red-500"
      : "text-amber-500";

  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <StatusIcon className={`h-5 w-5 shrink-0 ${iconClass}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{result.deviceName}</p>
          <p className="text-xs text-muted-foreground">
            {result.testName} · {result.message}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <Badge
          variant={result.status === "passed" ? "online" : result.status === "failed" ? "fault" : "warning"}
          className="capitalize"
        >
          {result.status}
        </Badge>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {timeAgo(result.completedAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Loading / Error / Empty States ───────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-9 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-3 w-40" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SkeletonBlock className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-5 w-5 rounded-full" />
                <div className="space-y-1">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-48" />
                </div>
              </div>
              <SkeletonBlock className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Device Diagnostics" description="Run and review device diagnostics across your estate" />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <XCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium mb-2">Failed to load diagnostics</p>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">{message}</p>
          <Button onClick={onRetry} variant="outline">Try Again</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function DiagnosticsPage() {
  const RESULTS_PER_PAGE = 5;
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [resultsPage, setResultsPage] = useState(1);

  const runDiagnosticMutation = useRunDiagnostic();
  const { hasPermission } = useAuthStore();
  const canRun = hasPermission("devices", "update");

  // ── Fetch devices ────────────────────────────────────────────────────
  const {
    devices,
    isLoading: devicesLoading,
    isError: devicesError,
  } = useDevices();

  // Determine selected device type (for filtering available tests)
  const selectedDevice = selectedDeviceId
    ? devices.find((d: any) => d.id === selectedDeviceId)
    : null;
  const selectedDeviceType = (selectedDevice?.type?.toLowerCase() ?? "") as DeviceType | undefined;

  // ── Fetch tests (optionally filtered by device type) ─────────────────
  const {
    data: testsData,
    isLoading: testsLoading,
    isError: testsError,
    refetch: refetchTests,
  } = useDiagnosticTests(selectedDeviceType);

  // ── Fetch results (cached per-device by TanStack Query automatically) ─
  const {
    data: resultsData,
    isLoading: resultsLoading,
    isError: resultsError,
  } = useDiagnosticResults(
    selectedDeviceId
      ? { deviceId: selectedDeviceId, limit: RESULTS_PER_PAGE, page: resultsPage }
      : { limit: RESULTS_PER_PAGE, page: resultsPage },
  );

  const availableDevices = devices;
  const tests = testsData?.tests ?? [];
  const results = resultsData?.data ?? [];
  const totalResults = resultsData?.pagination?.total ?? 0;
  const totalPages = resultsData?.pagination?.totalPages ?? 1;
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setResultsPage(page);
  };

  // ── Run handler ──────────────────────────────────────────────────────
  async function handleRunTest(testId: string) {
    if (!selectedDeviceId) {
      useNotificationStore.getState().addSimulatedNotification({
        id: "no-device-selected",
        userId: "",
        title: "Select a device",
        message: "Please select a device before running a diagnostic.",
        priority: "normal",
        category: "system",
        isRead: false,
        createdAt: new Date().toISOString(),
        isSimulated: true,
      });
      return;
    }

    setRunningTestId(testId);
    try {
      const result = await runDiagnosticMutation.mutateAsync({
        testId,
        deviceId: selectedDeviceId,
      });
      useNotificationStore.getState().addSimulatedNotification({
        id: `diag-${result.id}`,
        userId: "",
        title: `${result.testName} ${result.status}`,
        message: result.message,
        priority: result.status === "failed" ? "high" : "normal",
        category: "system",
        isRead: false,
        createdAt: new Date().toISOString(),
        isSimulated: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Diagnostic failed";
      useNotificationStore.getState().addSimulatedNotification({
        id: `diag-error-${Date.now()}`,
        userId: "",
        title: "Diagnostic Error",
        message,
        priority: "high",
        category: "alert",
        isRead: false,
        createdAt: new Date().toISOString(),
        isSimulated: true,
      });
    } finally {
      setRunningTestId(null);
    }
  }

  // ── Loading state ────────────────────────────────────────────────────
  if (testsLoading && devicesLoading) {
    return <LoadingSkeleton />;
  }

  // ── Error state (tests) ──────────────────────────────────────────────
  if (testsError) {
    return <ErrorCard message="Could not load diagnostic tests from the server. Please ensure the API is running." onRetry={() => refetchTests()} />;
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Device Diagnostics"
        description="Run and review device diagnostics across your estate"
      />

      {/* ── Device selector ─────────────────────────────────────────── */}
      {devicesError ? (
        <p className="text-sm text-red-500">Failed to load device list.</p>
      ) : (
        <DeviceSelector
          devices={availableDevices}
          selected={selectedDeviceId}
          onChange={(id) => { setSelectedDeviceId(id); setResultsPage(1); }}
        />
      )}

      {/* ── Available tests grid ────────────────────────────────────── */}
      {tests.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Available Tests
            {selectedDeviceType && (
              <span className="ml-1">for {selectedDeviceType} devices</span>
            )}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tests.map((test: DiagnosticTest) => (
              <TestCard
                key={test.id}
                test={test}
                onRun={() => handleRunTest(test.id)}
                isRunning={runningTestId === test.id}
              />
            ))}
          </div>

          {/* Prompts for unselected device */}
          {!selectedDeviceId && canRun && (
            <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/25 p-4 text-center text-sm text-muted-foreground">
              <Play className="h-4 w-4 inline-block mr-1" />
              Select a device above, then click Run on any test to start a diagnostic.
            </div>
          )}
        </section>
      )}

      {/* ── Empty state: no tests at all ─────────────────────────────── */}
      {!testsLoading && tests.length === 0 && (
        <EmptyState
          icon={Stethoscope}
          title="No diagnostic tests available"
          description="No diagnostic tests are configured for the selected device type. Tests are defined in the backend and the UI renders them automatically."
        />
      )}

      {/* ── Recent results (for the selected device or all devices) ──── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Recent Diagnostics
              </CardTitle>
              <CardDescription>
                {selectedDeviceId
                  ? `Last 5 results for ${selectedDevice?.name ?? "this device"}`
                  : "Last 5 results across all devices"}
                {totalResults > 0 && ` (${totalResults} total)`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {resultsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No diagnostics run yet"
              description={
                selectedDeviceId
                  ? `No diagnostics have been run for ${selectedDevice!.name}. Select a test above and click Run.`
                  : "Select a device and run a diagnostic test to see results here."
              }
            />
          ) : resultsError ? (
            <p className="text-sm text-red-500 text-center py-4">
              Failed to load diagnostic results.
            </p>
          ) : (
            <>
              <div className="divide-y">
                {results.map((result: any) => (
                  <ResultRow key={result.id} result={result} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {resultsPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(resultsPage - 1)}
                      disabled={resultsPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(resultsPage + 1)}
                      disabled={resultsPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
