"use client";

import { useCallback, useMemo, useState } from "react";
import { MOCK_NOTIFICATIONS, type AppNotification } from "@/shared/constants/notifications";

interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: number) => void;
  markAllRead: () => void;
}

/**
 * Client-only notification state over mock data. Same shape a TanStack Query hook would return, so a
 * real `/notifications` endpoint later only changes this file.
 */
export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const markRead = useCallback((id: number) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification,
      ),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true })),
    );
  }, []);

  return { notifications, unreadCount, markRead, markAllRead };
}
