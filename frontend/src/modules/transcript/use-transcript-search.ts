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
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, TRANSCRIPT_SEARCH_DEBOUNCE_MS);
  // Clearing takes effect at once; only typing waits for the debounce.
  const effectiveQuery = query.trim() === "" ? "" : debouncedQuery;

  const matches = useMemo(() => findMatches(segments, effectiveQuery), [segments, effectiveQuery]);

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
  const [cursor, setCursor] = useState<MatchCursor>({ matches, index: 0 });
  const currentIndex = cursor.matches === matches ? cursor.index : 0;

  const step = useCallback(
    (delta: number) => {
      if (matches.length === 0) return;
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
