"use client";

import type { ParticipantBrief } from "@/modules/meetings/types";
import { TranscriptEmptyState } from "@/modules/transcript/components/TranscriptEmptyState";
import { TranscriptList } from "@/modules/transcript/components/TranscriptList";
import { TranscriptSkeleton } from "@/modules/transcript/components/TranscriptSkeleton";
import { TRANSCRIPT_COPY } from "@/modules/transcript/constants";
import { useTranscript } from "@/modules/transcript/hooks";
import { ErrorState } from "@/shared/components/ErrorState";

interface TranscriptPanelProps {
  meetingId: number;
  participants: ParticipantBrief[];
}

/** Right panel (≈430px in 17/19): tab header, then loading / error / empty / transcript. */
export function TranscriptPanel({ meetingId, participants }: TranscriptPanelProps) {
  const { data, error, isPending, isError, refetch, isRefetching } = useTranscript(meetingId);

  return (
    <aside
      aria-label="Transcript"
      className="flex h-[60vh] min-h-0 flex-col border-t bg-page lg:h-auto lg:w-[430px] lg:shrink-0 lg:border-t-0 lg:border-l"
    >
      {/* Single tab for now; AskFred (17) is out of scope. Styled as the active tab in 19. */}
      <div className="flex h-13 shrink-0 items-end border-b px-6">
        <h2 className="border-b-2 border-focus px-1 pb-3 text-sm text-link">Transcript</h2>
      </div>

      {isPending && <TranscriptSkeleton />}
      {isError && (
        <div className="p-4">
          <ErrorState
            title={TRANSCRIPT_COPY.ERROR_TITLE}
            error={error}
            onRetry={() => void refetch()}
            isRetrying={isRefetching}
          />
        </div>
      )}
      {data && data.segments.length === 0 && <TranscriptEmptyState />}
      {data && data.segments.length > 0 && (
        <TranscriptList segments={data.segments} participants={participants} />
      )}
    </aside>
  );
}
