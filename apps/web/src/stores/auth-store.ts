import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@sentience/types";
import { hasPermission, type Resource, type Action } from "@/lib/permissions";
import { useAuditStore } from "./audit-store";
import type { AuditAction } from "@sentience/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  /** Available demo accounts for role switching */
  demoAccounts: User[];

  login: (email: string, password: string) => Promise<void>;
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
  setUser: (user: User) => void;
  hasPermission: (resource: Resource, action: Action) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  getDisplayRole: () => string;
  clearError: () => void;
}

/** Demo accounts available for switching */
const DEMO_ACCOUNTS: User[] = [
  {
    id: "user-1",
    email: "admin@sentience.io",
    name: "Alice Johnson",
    role: "admin",
    isActive: true,
    mfaEnabled: false,
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-06-01T12:00:00Z",
    lastLogin: new Date().toISOString(),
  },
  {
    id: "user-2",
    email: "support@sentience.io",
    name: "Bob Smith",
    role: "support",
    isActive: true,
    mfaEnabled: false,
    createdAt: "2026-02-20T09:00:00Z",
    updatedAt: "2026-05-15T10:00:00Z",
    lastLogin: new Date().toISOString(),
  },
  {
    id: "user-3",
    email: "installer@sentience.io",
    name: "Carol Davis",
    role: "installer",
    isActive: true,
    mfaEnabled: false,
    createdAt: "2026-03-10T07:30:00Z",
    updatedAt: "2026-04-20T14:00:00Z",
    lastLogin: new Date().toISOString(),
  },
  {
    id: "user-4",
    email: "customer@sentience.io",
    name: "Dan Wilson",
    role: "customer",
    isActive: true,
    mfaEnabled: false,
    customerId: "CUST-001",
    createdAt: "2026-01-05T10:00:00Z",
    updatedAt: "2026-06-10T09:00:00Z",
    lastLogin: new Date().toISOString(),
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  support: "Support Engineer",
  installer: "Field Installer",
  customer: "Customer",
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      demoAccounts: DEMO_ACCOUNTS,

      login: async (email: string, _password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API delay
          await new Promise((r) => setTimeout(r, 600));

          // Find a matching demo account, or create a default admin
          const demoAccount = DEMO_ACCOUNTS.find((a) => a.email === email);
          const mockUser: User = demoAccount ?? {
            id: "user-1",
            email,
            name: email.split("@")[0],
            role: "admin",
            isActive: true,
            mfaEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };

          set({
            user: mockUser,
            token: "mock-jwt-token",
            isAuthenticated: true,
            isLoading: false,
          });

          // Log audit entry
          useAuditStore.getState().addEntry({
            userId: mockUser.id,
            userName: mockUser.name,
            userRole: mockUser.role,
            action: "login",
            resource: "Session",
            description: `User ${mockUser.name} logged in as ${ROLE_LABELS[mockUser.role]}`,
            ipAddress: "192.168.1.100",
          });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      loginAsRole: (role: UserRole) => {
        const account = DEMO_ACCOUNTS.find((a) => a.role === role);
        if (!account) return;

        set({
          user: { ...account, lastLogin: new Date().toISOString() },
          token: "mock-jwt-token",
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        useAuditStore.getState().addEntry({
          userId: account.id,
          userName: account.name,
          userRole: account.role,
          action: "login",
          resource: "Session",
          description: `User ${account.name} logged in as ${ROLE_LABELS[account.role]}`,
          ipAddress: "192.168.1.100",
        });
      },

      logout: () => {
        const { user } = get();
        if (user) {
          useAuditStore.getState().addEntry({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: "logout",
            resource: "Session",
            description: `User ${user.name} logged out`,
            ipAddress: "192.168.1.100",
          });
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user: User) => set({ user }),

      hasPermission: (resource: Resource, action: Action) => {
        const { user } = get();
        return hasPermission(user?.role, resource, action);
      },

      hasRole: (...roles: UserRole[]) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },

      getDisplayRole: () => {
        const { user } = get();
        if (!user) return "";
        return ROLE_LABELS[user.role] ?? user.role;
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "sentience-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
