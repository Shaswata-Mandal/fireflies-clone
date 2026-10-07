/**
 * "Which chapter is playing now?" hook.
 *
 * WHAT: Subscribes to the player clock but only re-renders when the playhead enters another
 *   chapter.
 * LAYER: Module hook (client).
 * CALLED BY: `OutlineList`.
 * CALLS: `usePlayerTimeStore` (player module), `findActiveChapterIndex`.
 * INTERVIEW: `useSyncExternalStore` reads a value from OUTSIDE React (the player's time store).
 * Returning the chapter INDEX (a small integer) as the snapshot means React compares numbers and
 * skips re-rendering while the index stays the same, even though the clock ticks many times a
 * second.
 */

"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Chapter } from "@/modules/meetings/types";
import { usePlayerTimeStore } from "@/modules/player/hooks";
import { findActiveChapterIndex } from "@/modules/summary/utils";

const NO_ACTIVE_CHAPTER = -1;

/**
 * Chapter under the playhead. Same approach as `useActiveSegmentIndex`: the snapshot is the index,
 * so React only re-renders the outline when playback crosses into another chapter.
 */
export function useActiveChapterIndex(chapters: ReadonlyArray<Chapter>): number {
  const store = usePlayerTimeStore();
  // `getSnapshot` must be stable between renders (useCallback) or React would resubscribe forever.
  const getSnapshot = useCallback(
    () => findActiveChapterIndex(chapters, store.getTimeMs()),
    [chapters, store],
  );
  // Arguments: how to subscribe, how to read the current value, and the server-render value
  // (no player exists on the server, so "no chapter").
  return useSyncExternalStore(store.subscribe, getSnapshot, () => NO_ACTIVE_CHAPTER);
}
