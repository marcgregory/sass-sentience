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

export function getAdminStats(): Promise<AdminStatsResponse> {
  return get<AdminStatsResponse>("/admin/stats");
}
