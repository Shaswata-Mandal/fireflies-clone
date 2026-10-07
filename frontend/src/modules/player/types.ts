/**
 * Player types.
 *
 * WHAT: `PlayerEngine` (what a clock implements), `ClockOptions`, and `PlayerApi` (what
 *   `usePlayer()` returns).
 * LAYER: Module types (type-only).
 * CALLED BY: the clocks, `PlayerProvider`, `hooks.ts`, `context.ts`.
 * CALLS: `time-store.ts` (type only).
 * INTERVIEW: `PlayerEngine` is an interface with two implementations (simulated and real media),
 * the strategy pattern. The provider picks one; nothing above it can tell which.
 */

import type { TimeStore } from "@/modules/player/time-store";

/**
 * What both clocks (simulated and real media element) implement, so the provider and every
 * component above it can't tell them apart. Time is reported through the shared TimeStore.
 */
export interface PlayerEngine {
  play: () => void;
  pause: () => void;
  /** Already clamped to [0, duration] by the provider. */
  seek: (ms: number) => void;
  setPlaybackRate: (rate: number) => void;
}

/** Options both clock hooks take. Callbacks may change identity; the hooks read the latest. */
export interface ClockOptions {
  store: TimeStore;
  onPlayingChange: (isPlaying: boolean) => void;
}

/** Public player API from `usePlayer()`. Functions are stable across renders. */
export interface PlayerApi {
  isPlaying: boolean;
  durationMs: number;
  playbackRate: number;
  /** Null = simulated clock (no recording). */
  mediaUrl: string | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  skip: (deltaMs: number) => void;
  setPlaybackRate: (rate: number) => void;
  /** Callback ref for the <audio>/<video> element rendered by MediaSurface. */
  registerMediaElement: (element: HTMLMediaElement | null) => void;
}
