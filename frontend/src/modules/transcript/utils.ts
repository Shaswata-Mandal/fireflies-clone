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
export function findActiveSegmentIndex(
  segments: ReadonlyArray<Pick<TranscriptSegment, "start_ms">>,
  timeMs: number,
): number {
  let low = 0;
  let high = segments.length - 1;
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

const REGEXP_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

/** Makes user input safe to embed in a RegExp: "(a.*)" matches those five literal characters. */
export function escapeRegExp(value: string): string {
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

  const pattern = new RegExp(escapeRegExp(needle), "gi");
  const matches: TranscriptMatch[] = [];

  segments.forEach((segment, segmentIndex) => {
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
