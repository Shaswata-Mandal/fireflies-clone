"use client";

import { useContext, useSyncExternalStore } from "react";
import { TIME_RESOLUTION_MS } from "@/modules/player/constants";
import { PlayerContext, PlayerTimeContext } from "@/modules/player/context";
import type { TimeStore } from "@/modules/player/time-store";
import type { PlayerApi } from "@/modules/player/types";

const SERVER_TIME_MS = 0;

/** Controls and low-frequency state. Does NOT re-render on time changes. */
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
export function usePlayerTimeMs(resolutionMs: number = TIME_RESOLUTION_MS): number {
  const store = usePlayerTimeStore();
  return useSyncExternalStore(
    store.subscribe,
    () => Math.floor(store.getTimeMs() / resolutionMs) * resolutionMs,
    () => SERVER_TIME_MS,
  );
}
