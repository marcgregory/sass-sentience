export interface DeviceGroup {
  id: string;
  name: string;
  description: string | null;
  deviceIds: string[];
  deviceCount: number;
  createdAt: string;
  updatedAt: string;
}
