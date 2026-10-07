/**
 * One row of the outline (chapter).
 *
 * WHAT: A button with the chapter's start time and title; clicking seeks the player.
 * LAYER: Module component (server-safe; wrapped in `memo`).
 * CALLED BY: `OutlineList`.
 * CALLS: `formatTimestamp`.
 * INTERVIEW: `memo` skips re-rendering when props are unchanged. It works here because every prop
 * is a primitive or a stable function, so only the row that gains/loses `isActive` re-renders.
 */

import { memo } from "react";
import { cn } from "@/shared/utils/cn";
import { formatTimestamp } from "@/shared/utils/format-time";

interface OutlineItemProps {
  title: string;
  startMs: number;
  isActive: boolean;
  /** Stable (from usePlayer), so memoization holds. */
  onSeek: (ms: number) => void;
}

/**
 * One chapter: start time + title as a single button. Memoized with primitive props, so when
 * playback enters a new chapter only the old and the new row re-render.
 */
export const OutlineItem = memo(function OutlineItem({
  title,
  startMs,
  isActive,
  onSeek,
}: OutlineItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSeek(startMs)}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "flex w-full items-baseline gap-4 rounded-md border-l-2 border-transparent px-3 py-2.5 text-left text-sm hover:bg-hover",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          isActive && "border-primary-fg bg-primary-subtle hover:bg-primary-subtle",
        )}
      >
        <time className="w-14 shrink-0 text-link tabular-nums">{formatTimestamp(startMs)}</time>
        <span className={cn("min-w-0 flex-1", isActive ? "text-primary" : "text-body")}>
          {title}
        </span>
      </button>
    </li>
  );
});
