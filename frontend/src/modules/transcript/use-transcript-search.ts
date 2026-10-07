/**
 * Transcript search state.
 *
 * WHAT: Debounced, case-insensitive search over the loaded segments, with a wrap-around cursor
 *   ("n of m", next / previous) and a per-line map of highlight ranges.
 * LAYER: Module hook (client; all work is in memory, no API call).
 * CALLED BY: `TranscriptList`.
 * CALLS: `useDebounce`, `findMatches` (utils.ts).
 * MERN EQUIVALENT: a `useSearch` hook that filters an array in the browser.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { TRANSCRIPT_SEARCH_DEBOUNCE_MS } from "@/modules/transcript/constants";
import type { TextRange, TranscriptMatch, TranscriptSegment } from "@/modules/transcript/types";
import { findMatches } from "@/modules/transcript/utils";
import { useDebounce } from "@/shared/hooks/use-debounce";

interface MatchCursor {
  /** The match list this index belongs to; a new list means the index starts over at 0. */
  matches: TranscriptMatch[];
  index: number;
}

// The object the hook returns; `TranscriptSearch` (the component) takes it as one prop.
export interface TranscriptSearch {
  query: string;
  setQuery: (value: string) => void;
  clear: () => void;
  isSearching: boolean;
  matches: TranscriptMatch[];
  currentIndex: number;
  currentMatch: TranscriptMatch | null;
  /** segment index → its match ranges. Same array instance per segment until the query changes,
   * so memoized lines without matches skip re-rendering. */
  rangesBySegment: ReadonlyMap<number, TextRange[]>;
  next: () => void;
  previous: () => void;
}

/** Client-side transcript search: debounced, case-insensitive, with a wrap-around cursor. */
export function useTranscriptSearch(segments: ReadonlyArray<TranscriptSegment>): TranscriptSearch {
  // `query` follows every keystroke (the input stays responsive); `debouncedQuery` trails it by
  // 200 ms, and only that one triggers the (comparatively expensive) search below.
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, TRANSCRIPT_SEARCH_DEBOUNCE_MS);
  // Clearing takes effect at once; only typing waits for the debounce.
  const effectiveQuery = query.trim() === "" ? "" : debouncedQuery;

  // useMemo: recompute the search only when the segments or the effective query change.
  const matches = useMemo(() => findMatches(segments, effectiveQuery), [segments, effectiveQuery]);

  // Group the flat match list by line, so each line can look up its own highlight ranges.
  const rangesBySegment = useMemo(() => {
    const map = new Map<number, TextRange[]>();
    for (const { segmentIndex, start, end } of matches) {
      const ranges = map.get(segmentIndex) ?? [];
      ranges.push({ start, end });
      map.set(segmentIndex, ranges);
    }
    return map;
  }, [matches]);

  // Deriving "reset to 0 on new results" from the stored list avoids a setState-in-effect.
  // INTERVIEW: the cursor remembers WHICH list its index belongs to. When the search produces a
  // new list, `cursor.matches !== matches`, so the index is treated as 0 without any effect.
  const [cursor, setCursor] = useState<MatchCursor>({ matches, index: 0 });
  const currentIndex = cursor.matches === matches ? cursor.index : 0;

  const step = useCallback(
    (delta: number) => {
      if (matches.length === 0) return;
      // Modulo arithmetic wraps around: after the last match comes the first, and before the
      // first comes the last (the `+ matches.length` keeps the result non-negative).
      const index = (currentIndex + delta + matches.length) % matches.length;
      setCursor({ matches, index });
    },
    [matches, currentIndex],
  );
  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);
  const clear = useCallback(() => setQuery(""), []);

  return {
    query,
    setQuery,
    clear,
    isSearching: effectiveQuery.trim() !== "",
    matches,
    currentIndex,
    currentMatch: matches[currentIndex] ?? null,
    rangesBySegment,
    next,
    previous,
  };
}
