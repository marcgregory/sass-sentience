import { create } from "zustand";
import type { Notification } from "@sentience/types";

// Extended notification type that includes the isSimulated flag
// used for in-memory-only simulated notifications.
export interface SimulatedNotification extends Notification {
  isSimulated?: boolean;
}

interface NotificationState {
  notifications: (Notification | SimulatedNotification)[];
  unreadCount: number;
  isOpen: boolean;
  addNotification: (notification: Notification) => void;
  addSimulatedNotification: (notification: SimulatedNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setIsOpen: (open: boolean) => void;
  clearSimulatedNotifications: () => void;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.isRead
        ? state.unreadCount
        : state.unreadCount + 1,
    }));
  },

  addSimulatedNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  setIsOpen: (open) => set({ isOpen: open }),

  clearSimulatedNotifications: () => {
    set((state) => {
      const remaining = state.notifications.filter(
        (n) => !("isSimulated" in n) || !(n as SimulatedNotification).isSimulated,
      );
      const removedSimulated = state.notifications.length - remaining.length;
      const removedUnread = state.notifications.filter(
        (n) =>
          "isSimulated" in n &&
          (n as SimulatedNotification).isSimulated === true &&
          !n.isRead,
      ).length;
      return {
        notifications: remaining,
        unreadCount: Math.max(0, state.unreadCount - removedUnread),
      };
    });
  },

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }),

  setUnreadCount: (count) => set({ unreadCount: count }),
}));
