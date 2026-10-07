import type { ActionItem, GroupedActionItems } from "@/modules/action-items/types";

/** Splits into open / completed, keeping the server's `position` order inside each group. */
export function groupActionItems(items: ReadonlyArray<ActionItem>): GroupedActionItems {
  const grouped: GroupedActionItems = { open: [], completed: [] };
  for (const item of items) {
    (item.is_completed ? grouped.completed : grouped.open).push(item);
  }
  return grouped;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** `YYYY-MM-DD` of `date` in the viewer's local time zone (what "today" means to them). */
export function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Open and due before today. `now` is injected so tests (and the caller, at render time) decide what
 * "today" is. Due dates are `YYYY-MM-DD`, so plain string comparison orders them correctly.
 */
export function isOverdue(item: Pick<ActionItem, "is_completed" | "due_date">, now: Date): boolean {
  if (item.is_completed || item.due_date === null) return false;
  return item.due_date < toLocalIsoDate(now);
}

const DUE_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * "Oct 10". A date-only string parses as UTC midnight, so it is also formatted in UTC; formatting in
 * local time would show the previous day for anyone west of Greenwich.
 */
export function formatDueDate(isoDate: string): string {
  return DUE_DATE_FORMAT.format(new Date(isoDate));
}
