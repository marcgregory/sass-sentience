export type AlertSeverity = "critical" | "warning" | "info";

export type AlertStatus = "open" | "acknowledged" | "resolved";

export type AlertCategory =
  | "device_offline"
  | "device_fault"
  | "battery_low"
  | "signal_weak"
  | "temperature_high"
  | "voltage_drop"
  | "connection_lost"
  | "firmware_outdated"
  | "config_change"
  | "threshold_breach"
  | "system"
  | "other";

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  deviceId?: string;
  siteId?: string;
  estateId?: string;
  customerId?: string;
  assignedTo?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  source: "system" | "rule" | "manual";
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  severity: AlertSeverity;
  category: AlertCategory;
  conditions: AlertCondition[];
  actions: AlertAction[];
  createdAt: string;
  updatedAt: string;
}

export interface AlertCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
  value: unknown;
}

export interface AlertAction {
  type: "notification" | "email" | "webhook";
  config: Record<string, unknown>;
}
