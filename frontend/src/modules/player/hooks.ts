/**
 * Hooks for reading the player.
 *
 * WHAT: `usePlayer()` (controls and slow state), `usePlayerTimeStore()` (the raw store) and
 *   `usePlayerTimeMs()` (the current time, throttled to a resolution).
 * LAYER: Module hooks.
 * CALLED BY: every component that shows or controls playback (player bar, transcript, outline,
 *   action-item chips, ask panel).
 * CALLS: the two contexts and React's `useSyncExternalStore`.
 * MERN EQUIVALENT: `useContext(PlayerContext)` wrapped in custom hooks, like `useAuth()`.
 */

"use client";

import { useContext, useSyncExternalStore } from "react";
import { TIME_RESOLUTION_MS } from "@/modules/player/constants";
import { PlayerContext, PlayerTimeContext } from "@/modules/player/context";
import type { TimeStore } from "@/modules/player/time-store";
import type { PlayerApi } from "@/modules/player/types";

// The time shown during server rendering (there is no player on the server, so always 0).
const SERVER_TIME_MS = 0;

/** Controls and low-frequency state. Does NOT re-render on time changes. */
// Throwing when the provider is missing turns a confusing `null` crash into a clear message.
export function usePlayer(): PlayerApi {
  const player = useContext(PlayerContext);
  if (!player) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return player;
}

/** The raw store, for hooks that derive their own snapshot (e.g. the active segment index). */
export function usePlayerTimeStore(): TimeStore {
  const store = useContext(PlayerTimeContext);
  if (!store) throw new Error("usePlayerTimeStore must be used inside <PlayerProvider>");
  return store;
}

/**
 * Current time rounded down to `resolutionMs`. The snapshot only changes when the time crosses a
 * multiple of it, so with the default 100 ms the caller re-renders at most ~10×/s even though the
 * clock ticks every frame.
 */
// INTERVIEW: `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` lets React read data
// that lives OUTSIDE React. React calls `getSnapshot` after every store notification and
// re-renders only if the returned value changed (compared with Object.is). Rounding the time
// down to 100 ms makes the snapshot change at most 10 times a second.
export function usePlayerTimeMs(resolutionMs: number = TIME_RESOLUTION_MS): number {
  const store = usePlayerTimeStore();
  return useSyncExternalStore(
    store.subscribe,
    () => Math.floor(store.getTimeMs() / resolutionMs) * resolutionMs,
    () => SERVER_TIME_MS,
  );
}
