/**
 * The two React contexts of the player.
 *
 * WHAT: `PlayerContext` (controls + slow state) and `PlayerTimeContext` (the time store object).
 * LAYER: Module context definitions (no logic; the provider fills them in).
 * CALLED BY: `PlayerProvider` (provides), `hooks.ts` (reads).
 * CALLS: types only.
 * MERN EQUIVALENT: two `createContext` calls in a `PlayerContext.js`.
 * INTERVIEW: why TWO contexts? A context change re-renders every consumer. Time changes ~60x a
 * second, play/pause only now and then. Splitting them means a component that only needs the
 * play button never re-renders because time moved.
 */

"use client";

import { createContext } from "react";
import type { TimeStore } from "@/modules/player/time-store";
import type { PlayerApi } from "@/modules/player/types";

/**
 * Two channels on purpose:
 * - PlayerContext: controls + low-frequency state (isPlaying, rate, duration). Changes rarely.
 * - PlayerTimeContext: the TimeStore object itself, which never changes identity, so this context
 *   never re-renders anyone. High-frequency time is read from the store via useSyncExternalStore.
 */
export const PlayerContext = createContext<PlayerApi | null>(null);
export const PlayerTimeContext = createContext<TimeStore | null>(null);
