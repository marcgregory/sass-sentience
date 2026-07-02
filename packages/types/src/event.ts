export type EventSeverity = "info" | "warning" | "error" | "critical";

export type EventCategory =
  | "device_online"
  | "device_offline"
  | "device_fault"
  | "heartbeat"
  | "telemetry"
  | "config_change"
  | "firmware_update"
  | "alert_triggered"
  | "alert_resolved"
  | "user_action"
  | "system"
  | "diagnostic";

export interface Event {
  id: string;
  title: string;
  description: string;
  severity: EventSeverity;
  category: EventCategory;
  deviceId?: string;
  siteId?: string;
  estateId?: string;
  customerId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}
