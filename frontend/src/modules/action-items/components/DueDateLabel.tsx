/**
 * Due-date label.
 *
 * WHAT: Shows the date with a calendar icon; red with "Overdue" when past due.
 * LAYER: Module component (server-safe).
 * CALLED BY: `ActionItemMeta`.
 * CALLS: `formatDueDate`.
 * The <time dateTime> element gives machines the exact date while humans see "Oct 10".
 */

import { CalendarDays } from "lucide-react";
import { ACTION_ITEMS_COPY } from "@/modules/action-items/constants";
import { formatDueDate } from "@/modules/action-items/utils";
import { cn } from "@/shared/utils/cn";

interface DueDateLabelProps {
  dueDate: string;
  isOverdue: boolean;
}

/** "Oct 10", turning red with an "Overdue" suffix when an open item is past due. */
export function DueDateLabel({ dueDate, isOverdue }: DueDateLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        isOverdue ? "text-danger-fg" : "text-secondary",
      )}
    >
      <CalendarDays className="size-3.5" aria-hidden="true" />
      <span className="sr-only">Due </span>
      <time dateTime={dueDate}>{formatDueDate(dueDate)}</time>
      {isOverdue && <span className="font-medium">· {ACTION_ITEMS_COPY.OVERDUE}</span>}
    </span>
  );
}
