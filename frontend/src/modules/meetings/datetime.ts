/**
 * Local date-time <-> UTC conversions for the meeting forms.
 *
 * WHAT: Converts between `<input type="datetime-local">` strings and UTC ISO strings.
 * LAYER: Module util (pure; unit-tested).
 * CALLED BY: `schemas.ts`, the create/edit forms and `use-create-meeting-submit.ts`.
 * CALLS: nothing (built-in Date).
 * MERN EQUIVALENT: a few `dayjs().utc()` conversions.
 */

// The native <input type="datetime-local"> works in the browser's local time and has no zone, while
// the API wants UTC ISO strings. These helpers are the only place that converts between the two.

const MS_PER_MINUTE = 60_000;
const LOCAL_INPUT_LENGTH = "YYYY-MM-DDTHH:mm".length;

/** A Date as the `YYYY-MM-DDTHH:mm` string the input expects, in local time. */
// INTERVIEW: `toISOString()` always prints UTC. Shifting the time by the zone offset first makes
// its text show the viewer's wall-clock time, which is what a datetime-local input needs.
function toLocalInput(date: Date): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * MS_PER_MINUTE);
  return shifted.toISOString().slice(0, LOCAL_INPUT_LENGTH);
}

/** The current moment as a local input value (the form's default date). */
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
