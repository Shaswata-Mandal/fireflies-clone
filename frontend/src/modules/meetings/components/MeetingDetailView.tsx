/**
 * Data-aware entry point of the meeting page.
 *
 * WHAT: Fetches the meeting and shows skeleton, 404, error, or the full page inside a
 *   `PlayerProvider`.
 * LAYER: Module component (client).
 * CALLED BY: `app/meetings/[id]/page.tsx` (with `key={meetingId}`).
 * CALLS: `useMeeting`, `MeetingDetailLayout`, `PlayerProvider`, `ErrorState`.
 * MERN EQUIVALENT: a route component that does `const { data, isLoading, error } = useQuery(...)`.
 * INTERVIEW: the `PlayerProvider` is mounted here, so the player (clock, play state) lives and
 * dies with ONE meeting page; navigating to another meeting remounts it from scratch.
 */

"use client";

import { MeetingDetailLayout } from "@/modules/meetings/components/MeetingDetailLayout";
import { MeetingDetailSkeleton } from "@/modules/meetings/components/MeetingDetailSkeleton";
import { MeetingNavbar } from "@/modules/meetings/components/MeetingNavbar";
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

  // The three early returns are the loading, error and success states, in that order. After them,
  // TypeScript knows `meeting` is defined.
  if (isPending) {
    return (
      <>
        <MeetingNavbar meeting={null} />
        <MeetingDetailSkeleton />
      </>
    );
  }

  if (isError) {
    // A 404 gets a friendly page; any other error gets a Retry card.
    const isNotFound = isApiError(error) && error.status === HTTP_NOT_FOUND;
    return (
      <>
        <MeetingNavbar meeting={null} />
        {isNotFound ? (
          <MeetingNotFound />
        ) : (
          <div className="p-6">
            <ErrorState
              title="Couldn't load this meeting"
              error={error}
              onRetry={() => void refetch()}
              isRetrying={isRefetching}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <PlayerProvider durationMs={meeting.duration_ms} mediaUrl={meeting.media_url}>
      <MeetingDetailLayout meeting={meeting} />
    </PlayerProvider>
  );
}
