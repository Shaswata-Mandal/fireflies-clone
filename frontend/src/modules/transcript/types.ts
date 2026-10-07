/**
 * Transcript types.
 *
 * WHAT: The API shapes (`TranscriptSegment`, `Transcript`) and the derived UI shapes (speaker
 *   blocks, search matches, highlight parts).
 * LAYER: Module types (type-only).
 * CALLED BY: api.ts, utils.ts, hooks and components of this module, plus smart-search.
 * CALLS: nothing.
 */

// Mirrors backend/app/modules/transcripts/schemas.py (snake_case, no mapping layer).

export interface TranscriptSegment {
  id: number;
  position: number;
  speaker_label: string;
  participant_id: number | null;
  start_ms: number;
  end_ms: number;
  text: string;
}

/** `GET /meetings/{id}/transcript`. Segments arrive sorted by `position` (= by `start_ms`). */
export interface Transcript {
  meeting_id: number;
  segments: TranscriptSegment[];
}

/** Consecutive segments by the same speaker, rendered as one avatar + name + timestamp block. */
export interface SpeakerBlockData {
  /** Id of the first segment: stable across re-renders, so it works as a React key. */
  key: number;
  speaker_label: string;
  participant_id: number | null;
  start_ms: number;
  /** Indexes into the full `segments` array (what the player's active index and matches use). */
  segmentIndexes: number[];
}

/** One search hit: characters [start, end) of `segments[segmentIndex].text`. */
export interface TranscriptMatch {
  segmentIndex: number;
  start: number;
  end: number;
}

/** A [start, end) character range inside one line's text. */
export interface TextRange {
  start: number;
  end: number;
}

export type HighlightKind = "plain" | "match" | "current";

export interface HighlightPart {
  text: string;
  kind: HighlightKind;
}
