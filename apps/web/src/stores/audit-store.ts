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
}

interface AuditState {
  entries: AuditEntry[];
  addEntry: (entry: Omit<AuditEntry, "id" | "createdAt">) => void;
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

  clear: () => set({ entries: [] }),
}));
