import type { Chapter } from "@/modules/meetings/types";
import { findActiveSegmentIndex } from "@/modules/transcript/utils";

/**
 * Index of the chapter playing at `timeMs`: the last chapter whose `start_ms ≤ timeMs`, or -1 before
 * the first one. A chapter runs until the next one starts, which is exactly the rule the transcript
 * uses for segments, so the same binary search is reused (it only reads `start_ms`).
 */
export function findActiveChapterIndex(
  chapters: ReadonlyArray<Pick<Chapter, "start_ms">>,
  timeMs: number,
): number {
  return findActiveSegmentIndex(chapters, timeMs);
}
