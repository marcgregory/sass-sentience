export interface Customer {
  id: string;
  name: string;
  logo?: string;
  domain?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  country: string;
  isActive: boolean;
  licenseType: "basic" | "professional" | "enterprise";
  maxDevices: number;
  maxUsers: number;
  deviceCount: number;
  userCount: number;
  estateCount: number;
  createdAt: string;
  updatedAt: string;
}
