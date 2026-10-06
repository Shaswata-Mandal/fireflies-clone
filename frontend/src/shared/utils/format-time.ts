// In-meeting times are integer milliseconds (CLAUDE.md §4); these turn them into display strings.

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * Meeting length as Fireflies shows it in the list: "45 sec", "2 min", "1h 5m", "2h".
 * Invalid or negative input → "0 min".
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0 min";

  const totalSeconds = Math.round(ms / MS_PER_SECOND);
  if (totalSeconds < SECONDS_PER_MINUTE) return `${totalSeconds} sec`;

  const totalMinutes = Math.round(totalSeconds / SECONDS_PER_MINUTE);
  if (totalMinutes < MINUTES_PER_HOUR) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Clock-style position for the player and transcript: "00:08", "15:34", "1:05:09" (from one hour).
 * Seconds are floored like a media player's clock, so 999 ms is still "00:00".
 * Invalid or negative input → "00:00".
 */
export function formatTimestamp(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00";

  const totalSeconds = Math.floor(ms / MS_PER_SECOND);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  if (totalMinutes < MINUTES_PER_HOUR) return `${pad2(totalMinutes)}:${pad2(seconds)}`;

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  return `${hours}:${pad2(totalMinutes % MINUTES_PER_HOUR)}:${pad2(seconds)}`;
}
