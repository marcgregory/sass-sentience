import { get } from "./api-client";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  faultCount: number;
  openAlerts: number;
  platformVersion: string;
  systemUptime: number;
}

export interface AdminStatsResponse {
  stats: AdminStats;
}

/** Matches the PlatformService type from @sentience/types */
export interface HealthServiceMetrics {
  label: string;
  value: string;
}

export interface HealthService {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down";
  description: string;
  uptime: number;
  lastCheck: string;
  metrics: HealthServiceMetrics[];
}

export interface PlatformHealthResponse {
  overallStatus: "healthy" | "degraded" | "down";
  lastChecked: string;
  services: HealthService[];
}

export function getAdminStats(): Promise<AdminStatsResponse> {
  return get<AdminStatsResponse>("/admin/stats");
}

export function getPlatformHealth(): Promise<PlatformHealthResponse> {
  return get<PlatformHealthResponse>("/admin/health");
}
