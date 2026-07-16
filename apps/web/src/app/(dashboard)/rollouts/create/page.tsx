"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useFirmwarePackages } from "@/hooks/use-firmware";
import { useCreateRollout } from "@/hooks/use-firmware";
import { useDeviceGroups } from "@/hooks/use-device-groups";
import { getGroupEligibility } from "@/lib/firmware";
import type { EligibilityPreviewResponse, CreateRolloutPayload } from "@/lib/firmware";
import {
  Package,
  FolderKanban,
  Search,
  Rocket,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Loader2,
  HardDrive,
  Users,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Firmware Package" },
  { id: 2, label: "Device Group" },
  { id: 3, label: "Eligibility" },
  { id: 4, label: "Confirm" },
] as const;

const PAGE_SIZE = 50;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateRolloutPage() {
  const router = useRouter();

  // ─── Wizard State ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [rolloutName, setRolloutName] = useState("");
  const [eligibility, setEligibility] = useState<EligibilityPreviewResponse | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: packagesData, isLoading: packagesLoading, isError: packagesError, refetch: refetchPackages } = useFirmwarePackages({
    status: "active",
    limit: PAGE_SIZE,
  });

  const { data: groupsData, isLoading: groupsLoading, isError: groupsError, refetch: refetchGroups } = useDeviceGroups({
    limit: PAGE_SIZE,
  });

  const createMutation = useCreateRollout();

  // ─── Derived Values ────────────────────────────────────────────────────────
  const activePackages = packagesData?.data ?? [];
  const allGroups = groupsData?.data ?? [];

  // Filter to groups with devices (non-archived, non-empty)
  const validGroups = useMemo(
    () => allGroups.filter((g) => g.deviceCount > 0 && !g.archivedAt),
    [allGroups],
  );

  const selectedPackage = activePackages.find((p) => p.id === selectedPackageId);
  const selectedGroup = validGroups.find((g) => g.id === selectedGroupId);

  // Auto-generate name when both selections are made
  const suggestedName = useMemo(() => {
    if (selectedPackage && selectedGroup) {
      return `${selectedPackage.name} v${selectedPackage.version} → ${selectedGroup.name}`;
    }
    return "";
  }, [selectedPackage, selectedGroup]);

  // ─── Eligibility Fetch ────────────────────────────────────────────────────
  const fetchEligibility = async () => {
    if (!selectedPackageId || !selectedGroupId) return;
    setEligibilityLoading(true);
    setEligibilityError(false);
    setEligibility(null);
    try {
      const result = await getGroupEligibility(selectedGroupId, selectedPackageId);
      setEligibility(result);
    } catch {
      setEligibilityError(true);
    } finally {
      setEligibilityLoading(false);
    }
  };

  // ─── Navigation ───────────────────────────────────────────────────────────
  const canGoNext = () => {
    switch (step) {
      case 1: return !!selectedPackageId;
      case 2: return !!selectedGroupId;
      case 3: return eligibility !== null && !eligibilityLoading;
      case 4: return rolloutName.trim().length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step === 2 && selectedGroupId && selectedPackageId) {
      // Fetch eligibility before advancing
      fetchEligibility();
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    if (step === 3 && !eligibility) {
      // Went to step 3 while eligibility was loading — go back
      setStep(2);
      return;
    }
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleCreate = () => {
    if (!selectedPackageId || !selectedGroupId || !rolloutName.trim()) return;

    setCreateError(null);

    const payload: CreateRolloutPayload = {
      name: rolloutName.trim(),
      firmwarePackageId: selectedPackageId,
      targetGroupId: selectedGroupId,
    };

    createMutation.mutate(payload, {
      onSuccess: (data) => {
        router.push(`/rollouts/${data.id}`);
      },
      onError: (err: Error) => {
        setCreateError(err.message ?? "Failed to create rollout. Please try again.");
      },
    });
  };

  // ─── Step Indicators ──────────────────────────────────────────────────────
  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${step === s.id
                ? "bg-primary text-primary-foreground"
                : step > s.id
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }
            `}
          >
            {step > s.id ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <span className="text-xs">{s.id}</span>
            )}
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="h-px w-6 bg-border" />
          )}
        </div>
      ))}
    </div>
  );

  // ─── Step 1: Firmware Package ─────────────────────────────────────────────
  const renderPackageSelection = () => {
    // Loading
    if (packagesLoading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Error
    if (packagesError) {
      return (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={AlertTriangle}
              title="Failed to load firmware packages"
              description="There was an error loading firmware packages. Please try again."
              action={{ label: "Retry", onClick: () => refetchPackages() }}
            />
          </CardContent>
        </Card>
      );
    }

    // Empty
    if (activePackages.length === 0) {
      return (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Package}
              title="No active firmware packages"
              description="You need at least one active firmware package to create a rollout. Create a package in the Firmware section first."
              action={{ label: "Go to Firmware", onClick: () => router.push("/firmware") }}
            />
          </CardContent>
        </Card>
      );
    }

    // Package grid
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activePackages.map((pkg) => {
          const isSelected = selectedPackageId === pkg.id;
          return (
            <Card
              key={pkg.id}
              className={`
                cursor-pointer transition-all hover:border-primary/50
                ${isSelected
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
                }
              `}
              onClick={() => setSelectedPackageId(pkg.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2 min-w-0">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{pkg.name}</span>
                  </CardTitle>
                  {isSelected && (
                    <div className="shrink-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    Version:{" "}
                    <span className="font-medium text-foreground">{pkg.version}</span>
                  </p>
                  <p>
                    Devices:{" "}
                    <span className="font-medium text-foreground">
                      {pkg.deviceType.join(", ")}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // ─── Step 2: Device Group ────────────────────────────────────────────────
  const renderGroupSelection = () => {
    // Loading
    if (groupsLoading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Error
    if (groupsError) {
      return (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={AlertTriangle}
              title="Failed to load device groups"
              description="There was an error loading device groups. Please try again."
              action={{ label: "Retry", onClick: () => refetchGroups() }}
            />
          </CardContent>
        </Card>
      );
    }

    // Empty
    if (validGroups.length === 0) {
      return (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={FolderKanban}
              title="No suitable device groups"
              description={
                allGroups.length === 0
                  ? "Create a device group and assign devices to it first."
                  : "All device groups are empty or archived. Add devices to a group first."
              }
              action={{ label: "Go to Groups", onClick: () => router.push("/groups") }}
            />
          </CardContent>
        </Card>
      );
    }

    // Group grid
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {validGroups.map((group) => {
          const isSelected = selectedGroupId === group.id;
          return (
            <Card
              key={group.id}
              className={`
                cursor-pointer transition-all
                ${isSelected
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
                }
              `}
              onClick={() => setSelectedGroupId(group.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2 min-w-0">
                    <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{group.name}</span>
                  </CardTitle>
                  {isSelected && (
                    <div className="shrink-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HardDrive className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    {group.deviceCount} device{group.deviceCount !== 1 ? "s" : ""}
                  </span>
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {group.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // ─── Step 3: Eligibility Preview ──────────────────────────────────────────
  const renderEligibilityPreview = () => {
    // Loading
    if (eligibilityLoading) {
      return (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Checking device eligibility...</p>
              </div>
            </CardContent>
          </Card>
          {/* Skeleton table rows */}
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      );
    }

    // Error
    if (eligibilityError) {
      return (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={AlertTriangle}
              title="Failed to check eligibility"
              description="There was an error checking device eligibility. Please try again."
              action={{ label: "Retry", onClick: fetchEligibility }}
            />
          </CardContent>
        </Card>
      );
    }

    if (!eligibility) {
      return (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Search}
              title="No eligibility data"
              description="Select a firmware package and device group to preview eligibility."
            />
          </CardContent>
        </Card>
      );
    }

    const { eligibleCount, ineligibleCount, eligibleDevices, ineligibleDevices } = eligibility;

    return (
      <div className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{eligibleCount}</p>
                <p className="text-xs text-muted-foreground">Eligible</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ineligibleCount}</p>
                <p className="text-xs text-muted-foreground">Ineligible</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{eligibleCount + ineligibleCount}</p>
                <p className="text-xs text-muted-foreground">Total Devices</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Eligible devices */}
        {eligibleDevices.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Eligible Devices ({eligibleCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-3 font-medium">Device</th>
                      <th className="text-left py-2 px-3 font-medium">Type</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleDevices.map((device) => (
                      <tr key={device.id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{device.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{device.type}</td>
                        <td className="py-2 px-3">
                          <Badge variant="secondary">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
                            {device.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ineligible devices */}
        {ineligibleDevices.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Ineligible Devices ({ineligibleCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-3 font-medium">Device</th>
                      <th className="text-left py-2 px-3 font-medium">Type</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ineligibleDevices.map((device) => (
                      <tr key={device.id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{device.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{device.type}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mr-1.5 inline-block" />
                            {device.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs max-w-[200px] truncate">
                          {device.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All eligible notice */}
        {ineligibleCount === 0 && eligibleCount > 0 && (
          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50">
            <CardContent className="py-4 flex items-center gap-3">
              <Check className="h-5 w-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                All devices are eligible for this rollout.
              </p>
            </CardContent>
          </Card>
        )}

        {/* All ineligible warning */}
        {eligibleCount === 0 && ineligibleCount > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  No devices are eligible
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                  All devices in this group are ineligible. Consider selecting a different
                  firmware package or device group.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ─── Step 4: Confirm & Create ─────────────────────────────────────────────
  const renderConfirm = () => {
    const totalDevices = (eligibility?.eligibleCount ?? 0) + (eligibility?.ineligibleCount ?? 0);

    return (
      <div className="space-y-6 max-w-2xl">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rollout Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Firmware Package</dt>
                <dd className="font-medium mt-0.5">
                  {selectedPackage ? `${selectedPackage.name} v${selectedPackage.version}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Target Group</dt>
                <dd className="font-medium mt-0.5">{selectedGroup?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total Devices</dt>
                <dd className="font-medium mt-0.5">{totalDevices}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Eligible Devices</dt>
                <dd className="font-medium mt-0.5 text-emerald-600">{eligibility?.eligibleCount ?? 0}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Name input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rollout Name</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <input
                id="rolloutName"
                value={rolloutName}
                onChange={(e) => setRolloutName(e.target.value)}
                placeholder={suggestedName || "Enter a name for this rollout"}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {suggestedName && !rolloutName && (
                <p className="text-xs text-muted-foreground">
                  Suggested:{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setRolloutName(suggestedName)}
                  >
                    {suggestedName}
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create error */}
        {createError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Failed to create rollout</p>
                <p className="text-sm text-destructive/80 mt-1">{createError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create button */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleCreate}
            disabled={!rolloutName.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Rollout...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Create Rollout
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // ─── Step Renderer ────────────────────────────────────────────────────────
  const renderStepContent = () => {
    switch (step) {
      case 1: return renderPackageSelection();
      case 2: return renderGroupSelection();
      case 3: return renderEligibilityPreview();
      case 4: return renderConfirm();
      default: return null;
    }
  };

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Rollout"
        description="Set up a new firmware deployment for a device group"
        actions={
          <Button variant="ghost" onClick={() => router.push("/rollouts")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rollouts
          </Button>
        }
      />

      {/* Step indicator */}
      {renderStepIndicator()}

      {/* Step content */}
      {renderStepContent()}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={step === 1 ? () => router.push("/rollouts") : handleBack}
        >
          {step === 1 ? (
            <>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </>
          )}
        </Button>

        {step < 4 && (
          <Button onClick={handleNext} disabled={!canGoNext()}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
