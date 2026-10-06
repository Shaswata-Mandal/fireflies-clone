"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { IconButton } from "@/shared/components/IconButton";
import { NotificationList } from "@/shared/components/layout/NotificationList";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { useNotifications } from "@/shared/hooks/use-notifications";
import { cn } from "@/shared/utils/cn";

/** Badge shows "9+" beyond this so it stays a small pill. */
const MAX_BADGE_COUNT = 9;

const FILTERS = [
  { label: "All", unreadOnly: false },
  { label: "Unread", unreadOnly: true },
] as const;

export function NotificationsPopover() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const visible = unreadOnly ? notifications.filter((n) => !n.is_read) : notifications;
  const badge = unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unreadCount);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-on-primary"
            >
              {badge}
            </span>
          )}
        </IconButton>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(26rem,calc(100vw-2rem))] gap-0 bg-surface p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div
            className="flex rounded-md bg-card p-0.5"
            role="group"
            aria-label="Filter notifications"
          >
            {FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                aria-pressed={unreadOnly === filter.unreadOnly}
                onClick={() => setUnreadOnly(filter.unreadOnly)}
                className={cn(
                  "rounded px-3 py-1 text-sm text-secondary",
                  unreadOnly === filter.unreadOnly && "bg-segment-active text-primary",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 rounded px-1 text-sm text-link hover:underline disabled:text-disabled disabled:no-underline"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Mark all as read
          </button>
        </div>
        <NotificationList notifications={visible} onSelect={markRead} />
      </PopoverContent>
    </Popover>
  );
}
