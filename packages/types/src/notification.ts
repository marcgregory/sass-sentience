export type NotificationPriority = "low" | "normal" | "high" | "critical";

export type NotificationCategory =
  | "alert"
  | "device"
  | "system"
  | "report"
  | "user"
  | "maintenance";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  isRead: boolean;
  link?: string;
  createdAt: string;
}
