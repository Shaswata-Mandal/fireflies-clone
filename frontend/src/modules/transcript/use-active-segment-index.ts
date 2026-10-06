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
  const getSnapshot = useCallback(
    () => findActiveSegmentIndex(segments, store.getTimeMs()),
    [segments, store],
  );
  return useSyncExternalStore(store.subscribe, getSnapshot, () => NO_ACTIVE_SEGMENT);
}
