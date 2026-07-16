/**
 * Firmware package metadata and rollout domain types.
 */

/** Lifecycle of a rollout job (generic job orchestration). */
export type RolloutStatus = "draft" | "running" | "completed" | "failed" | "cancelled";

/** Per-device execution status (generic step tracking). */
export type ExecutionStatus = "pending" | "running" | "succeeded" | "failed" | "skipped" | "cancelled";

/** Discriminator for the generic rollouts table — today firmware, tomorrow diagnostics/automation. */
export type RolloutJobType = "firmware" | "diagnostics" | "automation";

export interface FirmwarePackage {
  id: string;
  name: string;
  version: string;
  deviceType: string[];
  releaseNotes: string | null;
  fileHash: string | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Rollout {
  id: string;
  jobType: RolloutJobType;
  name: string;
  firmwarePackageId: string | null;
  jobConfig: Record<string, unknown> | null;
  targetGroupId: string;
  status: RolloutStatus;
  deviceCount: number;
  completedCount: number;
  failedCount: number;
  createdBy: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RolloutDevice {
  id: string;
  rolloutId: string;
  deviceId: string;
  status: ExecutionStatus;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}
