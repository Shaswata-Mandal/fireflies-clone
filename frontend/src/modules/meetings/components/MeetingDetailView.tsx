"use client";

import { MeetingDetailLayout } from "@/modules/meetings/components/MeetingDetailLayout";
import { MeetingDetailSkeleton } from "@/modules/meetings/components/MeetingDetailSkeleton";
import { MeetingNotFound } from "@/modules/meetings/components/MeetingNotFound";
import { useMeeting } from "@/modules/meetings/hooks";
import { PlayerProvider } from "@/modules/player/components/PlayerProvider";
import { ErrorState } from "@/shared/components/ErrorState";
import { isApiError } from "@/shared/lib/api-error";

const HTTP_NOT_FOUND = 404;

interface MeetingDetailViewProps {
  meetingId: number;
}

/** Loading → 404 / error → the meeting with its own player. */
export function MeetingDetailView({ meetingId }: MeetingDetailViewProps) {
  const { data: meeting, error, isPending, isError, refetch, isRefetching } = useMeeting(meetingId);

  if (isPending) return <MeetingDetailSkeleton />;

  if (isError) {
    if (isApiError(error) && error.status === HTTP_NOT_FOUND) return <MeetingNotFound />;
    return (
      <div className="p-6">
        <ErrorState
          title="Couldn't load this meeting"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      </div>
    );
  }

  return (
    <PlayerProvider durationMs={meeting.duration_ms} mediaUrl={meeting.media_url}>
      <MeetingDetailLayout meeting={meeting} />
    </PlayerProvider>
  );
}
