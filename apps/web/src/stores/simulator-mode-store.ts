/**
 * Simulator Mode store.
 *
 * Tracks whether Simulator Mode is active. When enabled, the app shows ONLY
 * simulator devices from the live realtime feed and hides all database
 * devices. When disabled, only database devices are shown.
 *
 * These two modes are mutually exclusive — never merge data sources.
 *
 * Persisted to localStorage so the user's preference survives page reloads.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SimulatorModeState {
  /** Whether Simulator Mode is enabled */
  enabled: boolean;

  /** Toggle Simulator Mode on/off */
  toggle: () => void;
  /** Enable Simulator Mode */
  enable: () => void;
  /** Disable Simulator Mode */
  disable: () => void;
}

export const useSimulatorModeStore = create<SimulatorModeState>()(
  persist(
    (set) => ({
      enabled: false,

      toggle: () => set((s) => ({ enabled: !s.enabled })),
      enable: () => set({ enabled: true }),
      disable: () => set({ enabled: false }),
    }),
    {
      name: "sentience-simulator-mode",
    },
  ),
);
