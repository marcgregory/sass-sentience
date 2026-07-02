export interface Site {
  id: string;
  name: string;
  estateId: string;
  address: string;
  buildingCount: number;
  floorCount: number;
  roomCount: number;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
  faultCount: number;
  warningCount: number;
  healthScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Building {
  id: string;
  name: string;
  siteId: string;
  floorCount: number;
}

export interface Floor {
  id: string;
  name: string;
  buildingId: string;
  roomCount: number;
}

export interface Room {
  id: string;
  name: string;
  floorId: string;
  deviceIds: string[];
}
