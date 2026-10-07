/**
 * One transcript line.
 *
 * WHAT: A real <button>: clicking seeks the player to this line and starts playback.
 * LAYER: Module component (server-safe, wrapped in `memo`).
 * CALLED BY: `SpeakerBlock`.
 * CALLS: `HighlightedText`.
 * INTERVIEW: with ~1,000 lines, re-rendering all of them on each active-line change would be
 * slow. `memo` skips a line whose props are equal, and all props here are primitives or stable
 * values, so only the previous and the new active line re-render.
 */

import { memo } from "react";
import { HighlightedText } from "@/modules/transcript/components/HighlightedText";
import type { TextRange } from "@/modules/transcript/types";
import { cn } from "@/shared/utils/cn";
import { formatTimestamp } from "@/shared/utils/format-time";

interface TranscriptLineProps {
  index: number;
  text: string;
  startMs: number;
  speakerLabel: string;
  isActive: boolean;
  ranges: ReadonlyArray<TextRange>;
  currentMatchStart: number | null;
  /** Stable (useCallback in the panel), so it never breaks memoization. */
  onSelect: (index: number) => void;
}

/**
 * One segment as a real button: click seeks there and plays. Memoized with primitive props, so
 * when the active line moves only the old and the new line re-render.
 */
export const TranscriptLine = memo(function TranscriptLine({
  index,
  text,
  startMs,
  speakerLabel,
  isActive,
  ranges,
  currentMatchStart,
  onSelect,
}: TranscriptLineProps) {
  return (
    <button
      type="button"
      // This attribute is how `dom.ts` finds the line again (no per-line ref needed).
      data-segment-index={index}
      aria-current={isActive ? "true" : undefined}
      onClick={() => onSelect(index)}
      className={cn(
        "block w-full rounded-md border-l-2 border-transparent px-2 py-1 text-left text-sm leading-6 text-body hover:bg-hover",
        isActive && "border-primary-fg bg-primary-subtle text-primary hover:bg-primary-subtle",
      )}
    >
      {/* Accessible name = speaker + time + text; sighted users get those from the block header. */}
      <span className="sr-only">
        {speakerLabel} at {formatTimestamp(startMs)}:{" "}
      </span>
      <HighlightedText text={text} ranges={ranges} currentStart={currentMatchStart} />
    </button>
  );
});
