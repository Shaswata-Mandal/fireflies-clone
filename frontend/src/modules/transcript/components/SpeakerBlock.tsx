import { memo } from "react";
import { TranscriptLine } from "@/modules/transcript/components/TranscriptLine";
import type {
  SpeakerBlockData,
  TextRange,
  TranscriptMatch,
  TranscriptSegment,
} from "@/modules/transcript/types";
import { UserAvatar } from "@/shared/components/UserAvatar";
import { formatTimestamp } from "@/shared/utils/format-time";

const NO_RANGES: TextRange[] = [];

interface SpeakerBlockProps {
  block: SpeakerBlockData;
  segments: ReadonlyArray<TranscriptSegment>;
  avatarColor: string | null;
  /** The active index if it falls in this block, else -1, so other blocks keep equal props. */
  activeIndex: number;
  rangesBySegment: ReadonlyMap<number, TextRange[]>;
  /** The current search match if it is in this block, else null (same reason). */
  currentMatch: TranscriptMatch | null;
  onSelect: (index: number) => void;
}

/** Avatar + speaker name + timestamp, then that speaker's consecutive lines. */
export const SpeakerBlock = memo(function SpeakerBlock({
  block,
  segments,
  avatarColor,
  activeIndex,
  rangesBySegment,
  currentMatch,
  onSelect,
}: SpeakerBlockProps) {
  return (
    <section aria-label={`${block.speaker_label}, ${formatTimestamp(block.start_ms)}`}>
      <header className="mb-1 flex items-center gap-2 px-2">
        <UserAvatar name={block.speaker_label} color={avatarColor} className="size-6 text-[11px]" />
        <span className="truncate text-sm font-medium text-default">{block.speaker_label}</span>
        <span className="text-xs text-muted tabular-nums">{formatTimestamp(block.start_ms)}</span>
      </header>

      <div className="flex flex-col gap-0.5 pl-6">
        {block.segmentIndexes.map((index) => {
          const segment = segments[index];
          return (
            <TranscriptLine
              key={segment.id}
              index={index}
              text={segment.text}
              startMs={segment.start_ms}
              speakerLabel={block.speaker_label}
              isActive={index === activeIndex}
              ranges={rangesBySegment.get(index) ?? NO_RANGES}
              currentMatchStart={currentMatch?.segmentIndex === index ? currentMatch.start : null}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </section>
  );
});
