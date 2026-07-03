import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@sentience/types";
import { hasPermission, type Resource, type Action } from "@/lib/permissions";
import { useAuditStore } from "./audit-store";
import { post } from "@/lib/api-client";

const DEMO_LOGIN_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  /** Available demo accounts for role switching (DEV MODE only) */
  demoAccounts: User[];

  login: (email: string, password: string) => Promise<void>;
  /**
   * DEV/ DEMO ONLY: Bypasses backend auth and logs in with a hardcoded
   * demo user. This is NOT secure and MUST be removed or gated behind
   * a feature flag before production.
   */
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
  setUser: (user: User) => void;
  hasPermission: (resource: Resource, action: Action) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  getDisplayRole: () => string;
  clearError: () => void;
}

/** Demo accounts available for quick dev role switching. DEV MODE ONLY. */
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

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await post<{
            token: string;
            user: {
              id: string;
              email: string;
              name: string;
              role: string;
              isActive: boolean;
              mfaEnabled: boolean;
              avatar?: string;
            };
          }>("/auth/login", { email, password });

          const user: User = {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: response.user.role as UserRole,
            isActive: response.user.isActive,
            mfaEnabled: response.user.mfaEnabled,
            avatar: response.user.avatar,
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set({
            user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });

          useAuditStore.getState().addEntry({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: "login",
            resource: "Session",
            description: `User ${user.name} logged in as ${ROLE_LABELS[user.role]}`,
            ipAddress: "192.168.1.100",
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Login failed. Please check your credentials.";
          set({ error: message, isLoading: false });
        }
      },

      /**
       * ⚠️ DEV / DEMO ONLY
       * This method bypasses the backend auth entirely. It exists so developers
       * and stakeholders can quickly switch between roles during development and
       * product review sessions.
       *
       * It stores a synthetic token and MUST be removed or gated behind
       * NEXT_PUBLIC_ENABLE_DEMO_LOGIN before production.
       */
      loginAsRole: (role: UserRole) => {
        if (!DEMO_LOGIN_ENABLED) {
          console.warn("Demo login is disabled in this environment.");
          return;
        }
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
          description: `[DEMO] User ${account.name} logged in as ${ROLE_LABELS[account.role]}`,
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
