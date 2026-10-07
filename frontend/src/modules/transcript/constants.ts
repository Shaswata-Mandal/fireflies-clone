/**
 * Transcript constants.
 *
 * WHAT: Timing values (auto-scroll pause, search debounce), scroll keys and fixed UI text.
 * LAYER: Module constants.
 * CALLED BY: `use-auto-scroll.ts`, `use-transcript-search.ts`, transcript components.
 * CALLS: nothing.
 */

/** After the user scrolls the transcript by hand, auto-follow stays off for this long. */
export const AUTO_SCROLL_PAUSE_MS = 3_000;

/** Transcript search waits this long after the last keystroke (CLAUDE.md §5). */
export const TRANSCRIPT_SEARCH_DEBOUNCE_MS = 200;

/**
 * Keys that scroll a focused scroll container; pressing one counts as a manual scroll.
 * Space is left out: on a focused line it activates the line instead of scrolling.
 */
export const SCROLL_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

export const TRANSCRIPT_COPY = {
  EMPTY_TITLE: "No spoken words were detected",
  EMPTY_BODY:
    "This meeting has no transcript yet. Upload a .txt, .vtt or .json transcript to see it here, synced with the player.",
  ERROR_TITLE: "Couldn't load the transcript",
  NO_MATCHES: "No matches",
  SEARCH_LABEL: "Search transcript",
} as const;
