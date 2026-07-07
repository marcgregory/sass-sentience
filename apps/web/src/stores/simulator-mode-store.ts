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
    (set, get) => ({
      enabled: false,

      toggle: () => {
        const next = !get().enabled;
        set({ enabled: next });
        if (next) {
          // Generate a "Simulator Started" audit entry
          import("@/stores/audit-store").then(({ useAuditStore }) => {
            import("@/lib/simulated-audit-logs").then(({ simulatorStarted }) => {
              useAuditStore.getState().addSimulatedEntry(simulatorStarted());
            });
          });
        } else {
          // Generate "Simulator Stopped" audit entry before clearing
          import("@/stores/audit-store").then(({ useAuditStore }) => {
            import("@/lib/simulated-audit-logs").then(({ simulatorStopped }) => {
              useAuditStore.getState().addSimulatedEntry(simulatorStopped());
            }).then(() => {
              useAuditStore.getState().clearSimulatedEntries();
            });
          });
          // When simulator mode is turned off, clear simulated notifications
          // from the in-memory store so the badge count doesn't show stale data.
          import("@/stores/notification-store").then(({ useNotificationStore }) => {
            useNotificationStore.getState().clearSimulatedNotifications();
          });
        }
      },
      enable: () => {
        set({ enabled: true });
        // Generate a "Simulator Started" audit entry
        import("@/stores/audit-store").then(({ useAuditStore }) => {
          import("@/lib/simulated-audit-logs").then(({ simulatorStarted }) => {
            useAuditStore.getState().addSimulatedEntry(simulatorStarted());
          });
        });
      },
      disable: () => {
        set({ enabled: false });
        // Generate "Simulator Stopped" audit entry before clearing
        import("@/stores/audit-store").then(({ useAuditStore }) => {
          import("@/lib/simulated-audit-logs").then(({ simulatorStopped }) => {
            useAuditStore.getState().addSimulatedEntry(simulatorStopped());
          }).then(() => {
            // Clear simulated entries after adding the stop entry
            useAuditStore.getState().clearSimulatedEntries();
          });
        });
        // Clear simulated notifications when simulator mode is disabled
        import("@/stores/notification-store").then(({ useNotificationStore }) => {
          useNotificationStore.getState().clearSimulatedNotifications();
        });
      },
    }),
    {
      name: "sentience-simulator-mode",
    },
  ),
);
