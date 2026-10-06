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
