/**
 * One open action item on Home.
 *
 * WHAT: Checkbox, text, a link to its meeting and the due date.
 * LAYER: Module component (client: mutation hook).
 * CALLED BY: `OpenActionItemsSection`.
 * CALLS: `useToggleOpenActionItem` (optimistic), `DueDateLabel`.
 */

"use client";

import Link from "next/link";
import { DueDateLabel } from "@/modules/action-items/components/DueDateLabel";
import { useToggleOpenActionItem } from "@/modules/action-items/hooks";
import type { OpenActionItem } from "@/modules/action-items/types";
import { HOME_LIST_LIMIT } from "@/modules/home/constants";
import { meetingDetailRoute } from "@/shared/constants/routes";
import { cn } from "@/shared/utils/cn";

interface OpenActionItemRowProps {
  item: OpenActionItem;
  isOverdue: boolean;
}

/** One item with its meeting title as a link. Toggling is optimistic (see useToggleOpenActionItem). */
export function OpenActionItemRow({ item, isOverdue }: OpenActionItemRowProps) {
  const toggle = useToggleOpenActionItem(HOME_LIST_LIMIT);
  const nextState = item.is_completed ? "not done" : "done";

  return (
    <li className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-hover">
      <input
        type="checkbox"
        checked={item.is_completed}
        disabled={toggle.isPending}
        onChange={() => toggle.mutate({ id: item.id, isCompleted: !item.is_completed })}
        aria-label={`Mark "${item.text}" as ${nextState}`}
        className="mt-1 size-4 shrink-0 accent-primary-600"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className={cn(
            "text-sm leading-6 break-words",
            item.is_completed ? "text-muted line-through" : "text-body",
          )}
        >
          {item.text}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary">
          <Link
            href={meetingDetailRoute(item.meeting_id)}
            className="truncate text-link hover:underline"
          >
            {item.meeting_title}
          </Link>
          {item.due_date && <DueDateLabel dueDate={item.due_date} isOverdue={isOverdue} />}
        </div>
      </div>
    </li>
  );
}
