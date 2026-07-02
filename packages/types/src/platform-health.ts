export type ServiceStatus = "healthy" | "degraded" | "down" | "connecting" | "disconnected";
export type ServiceName = "bridge" | "mqtt" | "simulator" | "database" | "api";

export interface PlatformService {
  id: ServiceName;
  name: string;
  status: ServiceStatus;
  description: string;
  uptime: number; // seconds
  lastCheck: string;
  metrics: {
    label: string;
    value: string;
  }[];
}
