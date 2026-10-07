/**
 * "Which line is playing now?" hook.
 *
 * WHAT: Subscribes to the player clock and returns the index of the active transcript segment.
 * LAYER: Module hook (client).
 * CALLED BY: `TranscriptList`.
 * CALLS: `usePlayerTimeStore`, `findActiveSegmentIndex` (binary search).
 * INTERVIEW: the snapshot is an INTEGER. `useSyncExternalStore` asks for the snapshot on every
 * store notification (every animation frame) but only re-renders when the number differs from
 * the last one, which happens when the active line changes (every few seconds).
 */

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePlayerTimeStore } from "@/modules/player/hooks";
import type { TranscriptSegment } from "@/modules/transcript/types";
import { findActiveSegmentIndex } from "@/modules/transcript/utils";

const NO_ACTIVE_SEGMENT = -1;

/**
 * Index of the segment under the playhead. The binary search runs on every clock tick, but React
 * compares the returned number with the previous one and only re-renders the caller when the
 * active line actually changes (every few seconds), never 60×/s.
 */
export function useActiveSegmentIndex(segments: ReadonlyArray<TranscriptSegment>): number {
  const store = usePlayerTimeStore();
  // useCallback: React needs the same `getSnapshot` function between renders unless its inputs
  // (segments, store) change; a new function each render would cause needless resubscribing.
  const getSnapshot = useCallback(
    () => findActiveSegmentIndex(segments, store.getTimeMs()),
    [segments, store],
  );
  // Third argument = the value used when rendering on the server (no player there).
  return useSyncExternalStore(store.subscribe, getSnapshot, () => NO_ACTIVE_SEGMENT);
}
