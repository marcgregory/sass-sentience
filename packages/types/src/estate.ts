export interface Estate {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  managerId: string;
  customerId: string;
  siteCount: number;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
  faultCount: number;
  warningCount: number;
  healthScore: number;
  createdAt: string;
  updatedAt: string;
}
