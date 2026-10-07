// The native <input type="datetime-local"> works in the browser's local time and has no zone, while
// the API wants UTC ISO strings. These helpers are the only place that converts between the two.

const MS_PER_MINUTE = 60_000;
const LOCAL_INPUT_LENGTH = "YYYY-MM-DDTHH:mm".length;

/** A Date as the `YYYY-MM-DDTHH:mm` string the input expects, in local time. */
function toLocalInput(date: Date): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * MS_PER_MINUTE);
  return shifted.toISOString().slice(0, LOCAL_INPUT_LENGTH);
}

export function nowAsLocalInput(now: Date = new Date()): string {
  return toLocalInput(now);
}

/** UTC ISO from the API → local input value. */
export function isoToLocalInput(iso: string): string {
  return toLocalInput(new Date(iso));
}

/** Local input value → UTC ISO (`…Z`). Returns null for empty / unparseable input. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
