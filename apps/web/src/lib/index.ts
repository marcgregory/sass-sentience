export { get, post, put, patch, del, ApiError } from "./api-client";
export { getDevices, getDevice } from "./devices";
export type {
  DeviceApiItem,
  DeviceListResponse,
  DeviceDetailResponse,
  DevicesParams,
} from "./devices";
export { getEvents, getEvent } from "./events";
export type {
  EventApiItem,
  EventListResponse,
  EventsParams,
  EventDisplayRow,
} from "./events";
export { getAlerts, getAlert, updateAlert } from "./alerts";
export type {
  AlertApiItem,
  AlertListResponse,
  AlertsParams,
  UpdateAlertPayload,
} from "./alerts";
export {
  getReportSummary,
  getReportTrends,
  getReports,
  getReport,
  generateReport,
} from "./reports";
export type {
  ReportSummaryResponse,
  ReportTrendsResponse,
  TimeSeriesPoint,
  AvailabilityPoint,
  SummaryDistributionItem,
  FaultDistributionItem,
  GeneratedReport,
  ReportListResponse,
  CreateReportPayload,
  ReportParams,
} from "./reports";
export { getUsers, getUser, createUser, updateUser, deactivateUser } from "./users";
export type {
  UserApiItem,
  UserListResponse,
  UsersParams,
  CreateUserPayload,
  UpdateUserPayload,
} from "./users";
export { getRoles, getRole, grantPermission, revokePermission } from "./roles";
export type { RoleApiItem, RoleListResponse, RoleDetailResponse, PermissionApiItem } from "./roles";
export { queryKeys } from "./query-keys";
export { paginationParams, cursorParams } from "./pagination";
export type { PaginationParams, CursorPaginationParams, Page, CursorPage } from "./pagination";
export {
  getSocket,
  connectSocket,
  disconnectSocket,
  subscribeRooms,
  unsubscribeRooms,
} from "./socket-client";
export type {
  ServerToClientEvents,
  ClientToServerEvents,
  RoomSubscription,
  DeviceStatusEvent,
  DeviceTelemetryEvent,
  AlertEvent,
  NotificationEvent,
} from "./socket-client";
