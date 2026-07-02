import { describe, it, expect } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys", () => {
  it("produces stable base keys", () => {
    expect(queryKeys.devices.all).toEqual(["devices"]);
    expect(queryKeys.alerts.all).toEqual(["alerts"]);
    expect(queryKeys.estates.all).toEqual(["estates"]);
    expect(queryKeys.sites.all).toEqual(["sites"]);
    expect(queryKeys.events.all).toEqual(["events"]);
    expect(queryKeys.notifications.all).toEqual(["notifications"]);
    expect(queryKeys.reports.all).toEqual(["reports"]);
    expect(queryKeys.users.all).toEqual(["users"]);
  });

  it("detail keys include the resource id", () => {
    expect(queryKeys.devices.detail("dev-1")).toEqual(["devices", "detail", "dev-1"]);
    expect(queryKeys.alerts.detail("alt-42")).toEqual(["alerts", "detail", "alt-42"]);
    expect(queryKeys.sites.detail("site-x")).toEqual(["sites", "detail", "site-x"]);
    expect(queryKeys.estates.detail("est-99")).toEqual(["estates", "detail", "est-99"]);
  });

  it("list keys include filters as part of the key", () => {
    const key = queryKeys.devices.list("site-1", { status: "online" });
    expect(key).toEqual(["devices", "list", "site-1", { status: "online" }]);
  });

  it("list keys differ when filters differ", () => {
    const keyA = queryKeys.devices.list("site-1", { status: "online" });
    const keyB = queryKeys.devices.list("site-1", { status: "offline" });
    expect(keyA).not.toEqual(keyB);
  });

  it("dashboard KPI keys optionally include estateId", () => {
    expect(queryKeys.dashboard.kpis()).toEqual(["dashboard", "kpis", undefined]);
    expect(queryKeys.dashboard.kpis("est-1")).toEqual(["dashboard", "kpis", "est-1"]);
  });

  it("creates device sub-resource keys", () => {
    expect(queryKeys.devices.diagnostics("dev-1")).toEqual(["devices", "diagnostics", "dev-1"]);
    expect(queryKeys.devices.maintenance("dev-1")).toEqual(["devices", "maintenance", "dev-1"]);
  });
});
