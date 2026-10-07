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
  const getSnapshot = useCallback(
    () => findActiveChapterIndex(chapters, store.getTimeMs()),
    [chapters, store],
  );
  return useSyncExternalStore(store.subscribe, getSnapshot, () => NO_ACTIVE_CHAPTER);
}
