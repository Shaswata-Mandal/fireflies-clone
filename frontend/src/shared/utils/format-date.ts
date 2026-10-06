// Datetimes arrive as UTC ISO strings; these render them in the viewer's local time zone.

/** "08:59 PM" for today, "Oct 6" for anything earlier (the notification timestamp column). */
export function formatShortTimestamp(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "Oct 6" — meeting list meta line. */
export function formatMeetingDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "8:27 PM" (or "20:27" in 24h locales). */
export function formatMeetingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "Tue, Oct 6 · 8:27 PM" — details popup meta line. */
export function formatMeetingDateTime(iso: string): string {
  const day = new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${day} · ${formatMeetingTime(iso)}`;
}

/** "Oct 06 2026, 8:27 PM" — meeting detail header (17). */
export function formatMeetingHeaderDate(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  return `${day} ${date.getFullYear()}, ${formatMeetingTime(iso)}`;
}

/** Local calendar-day key ("2026-10-06") used to group meetings by the viewer's day, not UTC's. */
export function localDayKey(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "Today", "Yesterday", or "Mon, Oct 5" (with the year when it isn't the current one). */
export function formatDayHeading(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

/** "2026-10-01" (a date-only API value) → "Oct 1", without shifting the day by the time zone. */
export function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
