"use client";

import { Play } from "lucide-react";
import { usePlayer } from "@/modules/player/hooks";
import { formatTimestamp } from "@/shared/utils/format-time";

interface SourceTimestampChipProps {
  startMs: number;
}

/** "▶ 10:55": jumps the player to where the action item was said (the Bookmarks "00:00" link in 26). */
export function SourceTimestampChip({ startMs }: SourceTimestampChipProps) {
  const { seek } = usePlayer();
  const timestamp = formatTimestamp(startMs);

  return (
    <button
      type="button"
      onClick={() => seek(startMs)}
      aria-label={`Jump to ${timestamp} in the recording`}
      className="inline-flex items-center gap-1 rounded-md bg-primary-subtle px-1.5 py-0.5 text-xs text-primary-fg tabular-nums hover:bg-primary-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Play className="size-3" aria-hidden="true" />
      {timestamp}
    </button>
  );
}
