/**
 * Recent meetings list on Home.
 *
 * WHAT: The newest few meetings with loading, error and empty states, and a "View all" link.
 * LAYER: Module component (client).
 * CALLED BY: `HomeFeed` (the "Recent" tab).
 * CALLS: `useMeetings`, `MeetingRow`, `MeetingsSkeleton`.
 */

"use client";

import Link from "next/link";
import { HOME_COPY, HOME_LIST_LIMIT } from "@/modules/home/constants";
import { MeetingRow } from "@/modules/meetings/components/MeetingRow";
import { MeetingsEmptyState } from "@/modules/meetings/components/MeetingsEmptyState";
import { MeetingsSkeleton } from "@/modules/meetings/components/MeetingsSkeleton";
import { useMeetings } from "@/modules/meetings/hooks";
import { ErrorState } from "@/shared/components/ErrorState";
import { ROUTES } from "@/shared/constants/routes";

export function RecentMeetingsSection() {
  const { data, isPending, isError, error, refetch, isRefetching } = useMeetings({
    limit: HOME_LIST_LIMIT,
    sort: "-meeting_date",
  });

  function renderBody() {
    if (isPending) return <MeetingsSkeleton />;
    if (isError) {
      return (
        <ErrorState
          title={HOME_COPY.RECENT_ERROR}
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      );
    }
    if (data.items.length === 0) return <MeetingsEmptyState variant="no-meetings" />;
    return (
      <div className="flex flex-col gap-3">
        {data.items.map((meeting) => (
          <MeetingRow key={meeting.id} meeting={meeting} />
        ))}
      </div>
    );
  }

  return (
    <section aria-label={HOME_COPY.RECENT_HEADING} className="flex flex-col gap-3">
      {renderBody()}
      <Link href={ROUTES.MEETINGS} className="self-end text-sm text-link hover:underline">
        View all meetings
      </Link>
    </section>
  );
}
