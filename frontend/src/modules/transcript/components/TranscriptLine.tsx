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
