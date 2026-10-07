import Link from "next/link";
import type { AskCitation } from "@/modules/meetings/types";
import { meetingDetailRoute } from "@/shared/constants/routes";
import { formatTimestamp } from "@/shared/utils/format-time";

interface AskCitationChipsProps {
  citations: AskCitation[];
  /** In-meeting answers jump the player. Cross-meeting citations link to the meeting instead. */
  onSeek?: (ms: number) => void;
}

const CHIP_CLASS =
  "inline-block max-w-56 truncate rounded-md bg-primary-subtle px-2 py-0.5 text-xs text-primary-fg tabular-nums hover:bg-active focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Timestamp chips under an answer; each jumps to that line (`?t=` deep link across meetings). */
export function AskCitationChips({ citations, onSeek }: AskCitationChipsProps) {
  if (citations.length === 0) return null;

  return (
    <ul aria-label="Sources" className="mt-2 flex flex-wrap gap-1.5">
      {citations.map(({ segment_id, start_ms, speaker_label, meeting_id, meeting_title }) => {
        const time = formatTimestamp(start_ms);
        return (
          <li key={segment_id}>
            {meeting_id !== undefined ? (
              <Link
                href={`${meetingDetailRoute(meeting_id)}?t=${start_ms}`}
                aria-label={`Open ${meeting_title ?? "meeting"} at ${time}`}
                title={speaker_label}
                className={CHIP_CLASS}
              >
                {meeting_title ? `${meeting_title} · ${time}` : time}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => onSeek?.(start_ms)}
                aria-label={`Jump to ${time}, ${speaker_label}`}
                title={speaker_label}
                className={CHIP_CLASS}
              >
                {time}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
