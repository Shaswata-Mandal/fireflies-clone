"use client";

import { BellOff } from "lucide-react";
import { NotificationItem } from "@/shared/components/layout/NotificationItem";
import type { AppNotification } from "@/shared/constants/notifications";

interface NotificationListProps {
  notifications: AppNotification[];
  onSelect: (id: number) => void;
}

interface Section {
  label: string;
  items: AppNotification[];
}

/** Unread items under "New" (as in 05), read ones under "Earlier"; empty sections are skipped. */
export function NotificationList({ notifications, onSelect }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <BellOff className="size-6 text-muted" aria-hidden="true" />
        <p className="text-sm font-medium text-primary">You&apos;re all caught up</p>
        <p className="text-xs text-muted">New summaries and action items will show up here.</p>
      </div>
    );
  }

  const sections: Section[] = [
    { label: "New", items: notifications.filter((n) => !n.is_read) },
    { label: "Earlier", items: notifications.filter((n) => n.is_read) },
  ];

  return (
    <div className="max-h-[min(28rem,60vh)] overflow-y-auto py-1">
      {sections
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <section key={section.label} aria-label={section.label}>
            <h3 className="px-4 pt-3 pb-1 text-sm text-secondary">{section.label}</h3>
            <ul>
              {section.items.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem notification={notification} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
