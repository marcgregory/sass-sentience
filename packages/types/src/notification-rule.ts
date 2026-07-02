import type { UserRole } from "./user";

export type RuleChannel = "email" | "web" | "push" | "sms";

export type RuleAlertType =
  | "device_offline"
  | "device_fault"
  | "battery_low"
  | "signal_weak"
  | "temperature_high"
  | "firmware_update"
  | "diagnostic_failure";

export interface NotificationRule {
  id: string;
  alertType: RuleAlertType;
  label: string;
  description: string;
  /** Severity threshold — only alerts at this level or above trigger */
  severityThreshold: "critical" | "warning" | "info";
  /** Which channels are active for this rule */
  channels: RuleChannel[];
  /** Whether this rule is enabled globally */
  enabled: boolean;
  /** Cooldown between repeated notifications (minutes) */
  cooldownMinutes: number;
  /** Role-based notification preferences — which roles receive this alert type */
  rolePreferences: Partial<Record<UserRole, boolean>>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRuleUpdate {
  id?: string;
  severityThreshold?: NotificationRule["severityThreshold"];
  channels?: RuleChannel[];
  enabled?: boolean;
  cooldownMinutes?: number;
  rolePreferences?: Partial<Record<UserRole, boolean>>;
}
