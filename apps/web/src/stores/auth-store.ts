import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@sentience/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, _password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Mock login — will connect to real API later
          await new Promise((r) => setTimeout(r, 800));
          const mockUser: User = {
            id: "user-1",
            email,
            name: email.split("@")[0],
            role: "admin",
            isActive: true,
            mfaEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set({
            user: mockUser,
            token: "mock-jwt-token",
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user: User) => set({ user }),

      hasPermission: (_resource: string, _action: string) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === "admin") return true;
        // TODO: Implement proper RBAC
        return true;
      },

      hasRole: (roles: UserRole[]) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
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
