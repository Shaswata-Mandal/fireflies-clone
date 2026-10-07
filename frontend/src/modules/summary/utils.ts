/**
 * Summary helpers.
 *
 * WHAT: Finds the chapter under the playhead.
 * LAYER: Module util (pure; unit-tested).
 * CALLED BY: `use-active-chapter-index.ts`.
 * CALLS: the transcript module's binary search (`findActiveSegmentIndex`), reused because
 *   chapters and segments follow the same "runs until the next start" rule.
 */

import type { Chapter } from "@/modules/meetings/types";
import { findActiveSegmentIndex } from "@/modules/transcript/utils";

/**
 * Index of the chapter playing at `timeMs`: the last chapter whose `start_ms ≤ timeMs`, or -1 before
 * the first one. A chapter runs until the next one starts, which is exactly the rule the transcript
 * uses for segments, so the same binary search is reused (it only reads `start_ms`).
 */
// @param chapters sorted by start time; @param timeMs the playhead; @returns an index, or -1
export function findActiveChapterIndex(
  chapters: ReadonlyArray<Pick<Chapter, "start_ms">>,
  timeMs: number,
): number {
  return findActiveSegmentIndex(chapters, timeMs);
}
