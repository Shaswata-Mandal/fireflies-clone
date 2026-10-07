/**
 * Outline (chapters) list.
 *
 * WHAT: Chapters in order; clicking one seeks the player; the playing chapter is highlighted.
 * LAYER: Module component (client: player context + external-store hook).
 * CALLED BY: `NotesTabPanel`.
 * CALLS: `usePlayer`, `useActiveChapterIndex`, `OutlineItem`.
 */

"use client";

import { ListTree } from "lucide-react";
import type { Chapter } from "@/modules/meetings/types";
import { usePlayer } from "@/modules/player/hooks";
import { OutlineItem } from "@/modules/summary/components/OutlineItem";
import { SUMMARY_COPY } from "@/modules/summary/constants";
import { useActiveChapterIndex } from "@/modules/summary/use-active-chapter-index";

interface OutlineListProps {
  chapters: ReadonlyArray<Chapter>;
}

/** Outline tab: chapters in order; click seeks, the playing chapter is highlighted. */
export function OutlineList({ chapters }: OutlineListProps) {
  // `seek` is a stable function from the player context, so memoised rows are not invalidated.
  const { seek } = usePlayer();
  const activeIndex = useActiveChapterIndex(chapters);

  // Empty state first (a data view always needs one), then the list.
  if (chapters.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <ListTree className="size-8 text-muted" aria-hidden="true" />
        <h3 className="text-base font-medium text-primary">{SUMMARY_COPY.OUTLINE_EMPTY_TITLE}</h3>
        <p className="max-w-sm text-sm text-secondary">{SUMMARY_COPY.OUTLINE_EMPTY_BODY}</p>
      </div>
    );
  }

  return (
    <ol aria-label="Chapters" className="flex flex-col gap-1">
      {chapters.map((chapter, index) => (
        <OutlineItem
          key={chapter.id}
          title={chapter.title}
          startMs={chapter.start_ms}
          isActive={index === activeIndex}
          onSeek={seek}
        />
      ))}
    </ol>
  );
}
