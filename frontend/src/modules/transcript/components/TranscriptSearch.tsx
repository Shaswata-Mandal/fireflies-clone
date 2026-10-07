/**
 * Transcript search box.
 *
 * WHAT: Input with "n of m", previous/next buttons, Enter / Shift+Enter navigation and Esc to
 *   clear.
 * LAYER: Module component (client; purely presentational: the state comes from the hook).
 * CALLED BY: `TranscriptList`.
 * CALLS: nothing (receives the `useTranscriptSearch` result as a prop).
 */

"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { TRANSCRIPT_COPY } from "@/modules/transcript/constants";
import type { TranscriptSearch as TranscriptSearchState } from "@/modules/transcript/use-transcript-search";

interface TranscriptSearchProps {
  search: TranscriptSearchState;
}

const NAV_BUTTON_CLASS =
  "flex size-7 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary disabled:text-disabled disabled:hover:bg-transparent";

/** Search field in the transcript header: "n of m", Enter / Shift+Enter, ↑ ↓ buttons, Esc clears. */
export function TranscriptSearch({ search }: TranscriptSearchProps) {
  // This component holds no state of its own: everything comes from `useTranscriptSearch`.
  const { query, setQuery, clear, isSearching, matches, currentIndex, next, previous } = search;
  const hasMatches = matches.length > 0;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) previous();
      else next();
    } else if (event.key === "Escape" && query !== "") {
      event.preventDefault();
      clear();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-strong bg-card px-2.5 focus-within:border-focus">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <label htmlFor="transcript-search" className="sr-only">
          {TRANSCRIPT_COPY.SEARCH_LABEL}
        </label>
        <input
          id="transcript-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={TRANSCRIPT_COPY.SEARCH_LABEL}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {query !== "" && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={clear}
            className="text-muted hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {isSearching && (
        <>
          <p
            aria-live="polite"
            className="shrink-0 text-xs whitespace-nowrap text-muted tabular-nums"
          >
            {hasMatches ? `${currentIndex + 1} of ${matches.length}` : TRANSCRIPT_COPY.NO_MATCHES}
          </p>
          <button
            type="button"
            aria-label="Previous match"
            disabled={!hasMatches}
            onClick={previous}
            className={NAV_BUTTON_CLASS}
          >
            <ChevronUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next match"
            disabled={!hasMatches}
            onClick={next}
            className={NAV_BUTTON_CLASS}
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
