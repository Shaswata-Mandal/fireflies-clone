/**
 * Text with search hits highlighted.
 *
 * WHAT: Renders plain text and wraps each match in a <mark>; the current match is darker.
 * LAYER: Module component (server-safe).
 * CALLED BY: `TranscriptLine`.
 * CALLS: `splitHighlight`.
 */

import { Fragment } from "react";
import type { TextRange } from "@/modules/transcript/types";
import { splitHighlight } from "@/modules/transcript/utils";

interface HighlightedTextProps {
  text: string;
  ranges: ReadonlyArray<TextRange>;
  /** Start offset of the match the user navigated to, if it's in this text. */
  currentStart: number | null;
}

/** Text with search hits wrapped in <mark>. Built from text parts, never innerHTML, so a
 * transcript containing "<script>" is just text. */
export function HighlightedText({ text, ranges, currentStart }: HighlightedTextProps) {
  // Fast path: most lines have no matches, so return the text untouched.
  if (ranges.length === 0) return <>{text}</>;

  return (
    <>
      {splitHighlight(text, ranges, currentStart).map((part, index) =>
        part.kind === "plain" ? (
          <Fragment key={index}>{part.text}</Fragment>
        ) : (
          <mark
            key={index}
            className={
              part.kind === "current"
                ? "rounded-sm bg-primary-600 text-on-primary"
                : "rounded-sm bg-primary-muted text-primary"
            }
          >
            {part.text}
          </mark>
        ),
      )}
    </>
  );
}
