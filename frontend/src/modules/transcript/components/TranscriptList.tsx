"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ParticipantBrief } from "@/modules/meetings/types";
import { usePlayer } from "@/modules/player/hooks";
import { JumpToCurrentButton } from "@/modules/transcript/components/JumpToCurrentButton";
import { SpeakerBlock } from "@/modules/transcript/components/SpeakerBlock";
import { TranscriptSearch } from "@/modules/transcript/components/TranscriptSearch";
import { scrollLineToCenter } from "@/modules/transcript/dom";
import type { SpeakerBlockData, TranscriptSegment } from "@/modules/transcript/types";
import { useActiveSegmentIndex } from "@/modules/transcript/use-active-segment-index";
import { useAutoScroll } from "@/modules/transcript/use-auto-scroll";
import { useTranscriptSearch } from "@/modules/transcript/use-transcript-search";
import { groupSegmentsBySpeaker } from "@/modules/transcript/utils";

interface TranscriptListProps {
  segments: TranscriptSegment[];
  participants: ParticipantBrief[];
}

function blockContains(block: SpeakerBlockData, index: number): boolean {
  const first = block.segmentIndexes[0];
  const last = block.segmentIndexes[block.segmentIndexes.length - 1];
  return index >= first && index <= last;
}

/**
 * Search bar + scrollable speaker blocks. This component re-renders when the active line changes,
 * but blocks/lines are memoized and only the blocks containing the old or new active line (or the
 * current match) receive different props, so only those re-render.
 */
export function TranscriptList({ segments, participants }: TranscriptListProps) {
  const { seek, play } = usePlayer();
  const activeIndex = useActiveSegmentIndex(segments);
  const search = useTranscriptSearch(segments);
  const { currentMatch, rangesBySegment } = search;
  // Callback ref as state: the effects in useAutoScroll re-run once the element exists.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { isActiveOffscreen, jumpToCurrent, suspendAutoScroll } = useAutoScroll(
    container,
    activeIndex,
  );

  const blocks = useMemo(() => groupSegmentsBySpeaker(segments), [segments]);
  const avatarColors = useMemo(
    () => new Map(participants.map((person) => [person.id, person.avatar_color])),
    [participants],
  );

  const handleSelect = useCallback(
    (index: number) => {
      seek(segments[index].start_ms);
      play();
    },
    [segments, seek, play],
  );

  // Bring the current search match into view; counts as manual so auto-follow doesn't undo it.
  useEffect(() => {
    if (!container || !currentMatch) return;
    suspendAutoScroll();
    scrollLineToCenter(container, currentMatch.segmentIndex);
  }, [container, currentMatch, suspendAutoScroll]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-4 py-3">
        <TranscriptSearch search={search} />
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={setContainer}
          tabIndex={-1}
          className="h-full overflow-y-auto px-2 py-4 outline-none"
        >
          <div className="flex flex-col gap-5">
            {blocks.map((block) => (
              <SpeakerBlock
                key={block.key}
                block={block}
                segments={segments}
                avatarColor={
                  block.participant_id === null
                    ? null
                    : (avatarColors.get(block.participant_id) ?? null)
                }
                activeIndex={blockContains(block, activeIndex) ? activeIndex : -1}
                rangesBySegment={rangesBySegment}
                currentMatch={
                  currentMatch && blockContains(block, currentMatch.segmentIndex)
                    ? currentMatch
                    : null
                }
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
        {isActiveOffscreen && <JumpToCurrentButton onClick={jumpToCurrent} />}
      </div>
    </div>
  );
}
