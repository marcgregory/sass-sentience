/**
 * Zustand store for simulated diagnostic results when Simulator Mode is active.
 *
 * When simulator mode is ON, diagnostic runs are handled entirely client-side
 * because simulated device UUIDs don't exist in the database. Results are
 * stored here, mirroring the pattern used by live-alert-store.ts.
 *
 * This store is ephemeral — it resets on page refresh (no localStorage persist)
 * and is cleared when simulator mode is toggled off.
 */

import { create } from "zustand";
import type { DiagnosticResult, DiagnosticRunStatus, DiagnosticTestType, DeviceType } from "@sentience/types";

// ─── State ────────────────────────────────────────────────────────────

interface LiveDiagnosticState {
  /** Ordered array of simulated results (newest first). */
  results: DiagnosticResult[];

  /** Track which tests are currently "running" (testId → true). */
  runningTests: Record<string, boolean>;

  // ─── Actions ──────────────────────────────────────────────────────

  /** Add a simulated diagnostic result (prepended to the list). */
  addResult: (result: DiagnosticResult) => void;

  /** Mark a test as running or not. */
  setRunning: (testId: string, running: boolean) => void;

  /** Clear all simulated results. */
  clearResults: () => void;
}

export const useLiveDiagnosticStore = create<LiveDiagnosticState>()((set) => ({
  results: [],
  runningTests: {},

  addResult: (result) => {
    set((state) => ({
      results: [result, ...state.results],
    }));
  },

  setRunning: (testId, running) => {
    set((state) => ({
      runningTests: { ...state.runningTests, [testId]: running },
    }));
  },

  clearResults: () => {
    set({ results: [], runningTests: {} });
  },
}));
