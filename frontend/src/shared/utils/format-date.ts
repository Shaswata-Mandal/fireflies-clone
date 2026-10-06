// Datetimes arrive as UTC ISO strings; these render them in the viewer's local time zone.

/** "08:59 PM" for today, "Oct 6" for anything earlier (the notification timestamp column). */
export function formatShortTimestamp(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
