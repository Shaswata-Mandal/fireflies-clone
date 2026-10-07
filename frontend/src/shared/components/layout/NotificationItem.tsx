/**
 * One notification row.
 *
 * WHAT: Icon tile, title, body, time and an unread dot.
 * LAYER: Shared layout component.
 * CALLED BY: `NotificationList`.
 * CALLS: `formatShortTimestamp`, `cn`.
 * MERN EQUIVALENT: a list-item component.
 */

"use client";

import { FileText, ListChecks, MessageSquareText, Upload, type LucideIcon } from "lucide-react";
import type { AppNotification, NotificationKind } from "@/shared/constants/notifications";
import { formatShortTimestamp } from "@/shared/utils/format-date";
import { cn } from "@/shared/utils/cn";

// `Record<NotificationKind, LucideIcon>` = an object that must have an icon for every kind.
const KIND_ICONS: Record<NotificationKind, LucideIcon> = {
  summary: FileText,
  action_items: ListChecks,
  transcript: MessageSquareText,
  upload: Upload,
};

interface NotificationItemProps {
  notification: AppNotification;
  onSelect: (id: number) => void;
}

/** One row of docs/reference/05: purple icon tile, title, body, time; unread rows get a dot. */
export function NotificationItem({ notification, onSelect }: NotificationItemProps) {
  const { id, kind, title, body, created_at, is_read } = notification;
  // Look up the component first; JSX needs a capitalised variable to render it as `<Icon />`.
  const Icon = KIND_ICONS[kind];

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="flex w-full gap-3 px-4 py-3 text-left hover:bg-hover focus-visible:bg-hover focus-visible:outline-none"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-on-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-sm", is_read ? "text-default" : "font-medium text-primary")}>
          {!is_read && <span className="sr-only">Unread: </span>}
          {title}
        </span>
        <span className="text-sm text-tertiary">{body}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2">
        <time dateTime={created_at} className="text-xs text-muted">
          {formatShortTimestamp(created_at)}
        </time>
        {!is_read && <span className="size-2 rounded-full bg-primary-fg" aria-hidden="true" />}
      </span>
    </button>
  );
}
