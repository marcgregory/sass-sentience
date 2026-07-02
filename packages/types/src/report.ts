export type ReportPeriod = "daily" | "weekly" | "monthly" | "custom" | "adhoc";

export type ReportStatus = "generating" | "ready" | "failed";

export type ReportFormat = "csv" | "pdf";

export interface Report {
  id: string;
  name: string;
  type: ReportPeriod;
  status: ReportStatus;
  format: ReportFormat;
  dateRange: {
    start: string;
    end: string;
  };
  filters?: {
    estateId?: string;
    siteId?: string;
    deviceId?: string;
    severity?: string[];
  };
  metrics: ReportMetric[];
  generatedBy: string;
  generatedAt?: string;
  fileUrl?: string;
  createdAt: string;
}

export interface ReportMetric {
  label: string;
  value: number;
  unit?: string;
  previous?: number;
  change?: number;
  trend?: "up" | "down" | "stable";
}

export interface ReportData {
  summary: ReportMetric[];
  onlinePercentage: number;
  downtime: number; // minutes
  faultCount: number;
  avgResponseTime: number; // minutes
  alertsBySeverity: Record<string, number>;
  eventsByCategory: Record<string, number>;
  topDevices: { name: string; value: number }[];
}
