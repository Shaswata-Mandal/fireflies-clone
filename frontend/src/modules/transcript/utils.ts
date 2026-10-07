/**
 * Pure transcript logic.
 *
 * WHAT: Binary search for the active segment, grouping lines by speaker, and the search and
 *   highlight maths.
 * LAYER: Module util (no React, no DOM; thoroughly unit-tested in utils.test.ts).
 * CALLED BY: the transcript hooks and components, and `summary/utils.ts` (chapters reuse the
 *   binary search).
 * CALLS: types only.
 * MERN EQUIVALENT: plain helper functions you would unit-test with Jest.
 */

// Pure transcript logic (no React, no DOM), unit-tested in utils.test.ts.

import type {
  HighlightPart,
  SpeakerBlockData,
  TextRange,
  TranscriptMatch,
  TranscriptSegment,
} from "@/modules/transcript/types";

// ---------------------------------------------------------------------------
// Active segment
// ---------------------------------------------------------------------------

/**
 * Index of the segment playing at `timeMs`: the last one whose `start_ms <= timeMs`.
 * Binary search, O(log n), because it runs on every animation frame.
 *
 * Returns -1 before the first segment (or for an empty list). In a silent gap between segments,
 * and after the last one, the previous segment stays active, so the highlight doesn't flicker
 * off and on between lines. `segments` must be sorted by `start_ms` (the API guarantees it).
 */
// INTERVIEW: the binary search, step by step. The list is sorted by `start_ms`. We keep a window
// [low, high] that could still contain the answer and look at the middle element:
//   - mid starts at or before the playhead -> it is a candidate; remember it, then look RIGHT for
//     a later candidate (low = mid + 1)
//   - mid starts after the playhead -> too far; look LEFT (high = mid - 1)
// Each step halves the window, so 1,000 lines need about 10 checks instead of 1,000. That is why
// it can run on every animation frame. `(low + high) >>> 1` is an integer "half" (unsigned shift).
export function findActiveSegmentIndex(
  segments: ReadonlyArray<Pick<TranscriptSegment, "start_ms">>,
  timeMs: number,
): number {
  let low = 0;
  let high = segments.length - 1;
  // -1 means "no segment has started yet".
  let found = -1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (segments[mid].start_ms <= timeMs) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Speaker blocks
// ---------------------------------------------------------------------------

/** Groups consecutive segments by the same speaker (same label and participant) into blocks. */
export function groupSegmentsBySpeaker(
  segments: ReadonlyArray<TranscriptSegment>,
): SpeakerBlockData[] {
  const blocks: SpeakerBlockData[] = [];

  segments.forEach((segment, index) => {
    // The previous block, if any. Same speaker as this segment -> extend it, else start a new one.
    const last = blocks.at(-1);
    const sameSpeaker =
      last !== undefined &&
      last.speaker_label === segment.speaker_label &&
      last.participant_id === segment.participant_id;

    if (sameSpeaker) {
      last.segmentIndexes.push(index);
      return;
    }
    blocks.push({
      key: segment.id,
      speaker_label: segment.speaker_label,
      participant_id: segment.participant_id,
      start_ms: segment.start_ms,
      segmentIndexes: [index],
    });
  });
  return blocks;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

// Every character that has a special meaning inside a regular expression.
const REGEXP_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

/** Makes user input safe to embed in a RegExp: "(a.*)" matches those five literal characters. */
export function escapeRegExp(value: string): string {
  // `$&` in the replacement means "the matched character", so each one gets a backslash before it.
  return value.replace(REGEXP_SPECIAL_CHARS, "\\$&");
}

/**
 * Every case-insensitive occurrence of `query`, in document order. Matches don't overlap: after a
 * hit the scan continues at its end ("aa" in "aaaa" → 2 matches), which is how a reader counts
 * them and keeps the <mark>s from nesting. A blank query matches nothing.
 */
export function findMatches(
  segments: ReadonlyArray<Pick<TranscriptSegment, "text">>,
  query: string,
): TranscriptMatch[] {
  const needle = query.trim();
  if (needle === "") return [];

  // Flags: g = find all matches, i = ignore case. The text is escaped first so the user's input
  // is searched literally (typing "(" must not break the regex).
  const pattern = new RegExp(escapeRegExp(needle), "gi");
  const matches: TranscriptMatch[] = [];

  segments.forEach((segment, segmentIndex) => {
    // `matchAll` yields every match with its position (`hit.index`) in the text.
    for (const hit of segment.text.matchAll(pattern)) {
      matches.push({ segmentIndex, start: hit.index, end: hit.index + hit[0].length });
    }
  });
  return matches;
}

/**
 * Cuts `text` into plain and highlighted parts for rendering with <mark>, without innerHTML.
 * `ranges` must be sorted and non-overlapping (what `findMatches` returns). The range starting at
 * `currentStart` is marked "current" (the match the user navigated to).
 */
export function splitHighlight(
  text: string,
  ranges: ReadonlyArray<TextRange>,
  currentStart: number | null = null,
): HighlightPart[] {
  // Walk left to right: text between matches is "plain", each match becomes a highlighted part.
  // The result is rendered as React elements (never innerHTML), so transcript text cannot inject
  // markup.
  const parts: HighlightPart[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) parts.push({ text: text.slice(cursor, range.start), kind: "plain" });
    parts.push({
      text: text.slice(range.start, range.end),
      kind: range.start === currentStart ? "current" : "match",
    });
    cursor = range.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), kind: "plain" });
  return parts;
}
