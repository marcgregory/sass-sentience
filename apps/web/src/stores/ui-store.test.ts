import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "./ui-store";

describe("UI store (client/UI state only)", () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: "system",
      mobileMenuOpen: false,
    });
  });

  it("starts with default values", () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.theme).toBe("system");
    expect(state.mobileMenuOpen).toBe(false);
  });

  it("toggles sidebar open/closed", () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it("toggles sidebar collapsed state", () => {
    useUIStore.getState().toggleSidebarCollapsed();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);

    useUIStore.getState().toggleSidebarCollapsed();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("sets sidebar open explicitly", () => {
    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().setSidebarOpen(true);
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it("sets theme", () => {
    useUIStore.getState().setTheme("dark");
    expect(useUIStore.getState().theme).toBe("dark");

    useUIStore.getState().setTheme("light");
    expect(useUIStore.getState().theme).toBe("light");

    useUIStore.getState().setTheme("system");
    expect(useUIStore.getState().theme).toBe("system");
  });

  it("sets mobile menu open/closed", () => {
    useUIStore.getState().setMobileMenuOpen(true);
    expect(useUIStore.getState().mobileMenuOpen).toBe(true);

    useUIStore.getState().setMobileMenuOpen(false);
    expect(useUIStore.getState().mobileMenuOpen).toBe(false);
  });
});
