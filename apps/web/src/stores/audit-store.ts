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
  entries: [
    {
      id: nextId(),
      userId: "user-1",
      userName: "Alice Johnson",
      userRole: "admin",
      action: "login",
      resource: "Session",
      description: "User logged in",
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: nextId(),
      userId: "user-2",
      userName: "Bob Smith",
      userRole: "support",
      action: "update",
      resource: "Device",
      description: "Updated device config: Gateway 4",
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: nextId(),
      userId: "user-3",
      userName: "Carol Davis",
      userRole: "installer",
      action: "create",
      resource: "Site",
      description: "Created new site: Warehouse 3",
      resourceId: "SITE-003",
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: nextId(),
      userId: "system",
      userName: "System",
      userRole: "system",
      action: "delete",
      resource: "Alert",
      description: "Auto-resolved 3 stale alerts",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: nextId(),
      userId: "user-1",
      userName: "Alice Johnson",
      userRole: "admin",
      action: "export",
      resource: "Report",
      description: "Exported monthly fleet report",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ],

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
