/**
 * Player constants.
 *
 * WHAT: Playback speeds, skip distances, how often time-driven UI refreshes, media file types.
 * LAYER: Module constants.
 * CALLED BY: the clocks, the provider, the player bar components and `utils.ts`.
 * CALLS: nothing.
 */

/** Speed menu options, slowest first. */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export const DEFAULT_PLAYBACK_RATE = 1;

/** The ↺ / ↻ buttons (Fireflies uses 15 s). */
export const SKIP_MS = 15_000;
/** ← / → while the seek bar has focus. */
export const KEYBOARD_SEEK_MS = 5_000;

/**
 * The time label and seek bar re-render when the time crosses a multiple of this, i.e. at most
 * 10×/s. The clock itself still runs every animation frame.
 */
export const TIME_RESOLUTION_MS = 100;

/** Extensions rendered in a <video>; anything else plays in an <audio>. */
export const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv"] as const;

/** Query param for deep links: /meetings/3?t=655000 (milliseconds). */
export const TIME_QUERY_PARAM = "t";
