import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: Theme;
  mobileMenuOpen: boolean;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: "system",
      mobileMenuOpen: false,

      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      toggleSidebarCollapsed: () =>
        set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      setTheme: (theme: Theme) => set({ theme }),
      setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
    }),
    { name: "sentience-ui" },
  ),
);
