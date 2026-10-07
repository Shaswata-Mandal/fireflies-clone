/**
 * Pure player helpers.
 *
 * WHAT: Clamp a seek time, parse the `?t=` URL value, decide video vs audio from a URL.
 * LAYER: Module util (pure; unit-tested in utils.test.ts).
 * CALLED BY: `PlayerProvider`, `useDeepLinkSeek`, `MediaSurface`.
 * CALLS: constants.
 */

// Pure player helpers, unit-tested in utils.test.ts.

import { VIDEO_EXTENSIONS } from "@/modules/player/constants";

/** Keeps a seek target inside [0, durationMs]; NaN (e.g. a bad slider value) becomes 0. */
export function clampTime(ms: number, durationMs: number): number {
  if (Number.isNaN(ms)) return 0;
  return Math.min(Math.max(ms, 0), Math.max(durationMs, 0));
}

/**
 * `?t=` deep-link value → milliseconds, or null when absent or malformed. Only plain non-negative
 * integers are accepted ("655000"), so "abc", "-5", "1e3" or "12.5" are ignored, not guessed at.
 */
export function parseTimeParam(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const ms = Number(value);
  return Number.isSafeInteger(ms) ? ms : null;
}

/** Whether a media URL should play in a <video> (else <audio>). Ignores query string and case. */
export function isVideoUrl(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((extension) => path.endsWith(extension));
}
