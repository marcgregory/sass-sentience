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
export { getAuditLogs, getAuditLog } from "./audit-logs";
export type {
  AuditLogApiItem,
  AuditLogListResponse,
  AuditLogParams,
} from "./audit-logs";
export { getSettings, updateSetting } from "./settings";
export type { SettingApiItem, SettingListResponse } from "./settings";
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
export { getEstates, getEstate, createEstate, updateEstate, deleteEstate } from "./estates";
export type {
  EstateApiItem,
  EstateListResponse,
  EstateListParams,
  CreateEstatePayload,
  UpdateEstatePayload,
} from "./estates";
export { getSites, getSite, createSite, updateSite, deleteSite } from "./sites";
export type {
  SiteApiItem,
  SiteListResponse,
  SiteListParams,
  CreateSitePayload,
  UpdateSitePayload,
} from "./sites";
export { getCustomers } from "./customers";
export type { CustomerApiItem, CustomerListResponse } from "./customers";
