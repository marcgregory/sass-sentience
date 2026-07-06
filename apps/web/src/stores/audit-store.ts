import { create } from "zustand";
import type { AuditAction } from "@sentience/types";

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  /** Simulated entries are generated client-side during Simulator Mode and never persisted. */
  isSimulated?: boolean;
}

interface AuditState {
  entries: AuditEntry[];
  addEntry: (entry: Omit<AuditEntry, "id" | "createdAt">) => void;
  /** Add a simulated audit entry (client-side, never persisted to the database). */
  addSimulatedEntry: (entry: AuditEntry) => void;
  /** Clear all simulated audit entries from the store. */
  clearSimulatedEntries: () => void;
  clear: () => void;
}

let counter = 0;
function nextId() {
  counter++;
  return `AUD-${String(counter).padStart(3, "0")}`;
}

export const useAuditStore = create<AuditState>()((set) => ({
  entries: [],

  addEntry: (entry) =>
    set((state) => ({
      entries: [
        {
          ...entry,
          id: nextId(),
          createdAt: new Date().toISOString(),
        },
        ...state.entries,
      ],
    })),

  addSimulatedEntry: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries],
    })),

  clearSimulatedEntries: () =>
    set((state) => ({
      entries: state.entries.filter((e) => !e.isSimulated),
    })),

  clear: () => set({ entries: [] }),
}));
