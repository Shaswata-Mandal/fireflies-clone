/**
 * Loading placeholder for the meeting page.
 *
 * WHAT: Grey animated blocks shaped like the real layout, so the page doesn't jump when data
 *   arrives.
 * LAYER: Module component (server-safe).
 * CALLED BY: `MeetingDetailView` while the meeting loads.
 */

import { TranscriptSkeleton } from "@/modules/transcript/components/TranscriptSkeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Loading layout from 17.1: a title bar and a row of meta pills, transcript blocks on the right. */
export function MeetingDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading meeting" className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex flex-1 flex-col gap-4 px-6 py-8 lg:px-10">
          <Skeleton className="h-8 w-full max-w-2xl" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-14" />
          </div>
        </div>
        <div className="border-t lg:w-[430px] lg:border-t-0 lg:border-l">
          <TranscriptSkeleton />
        </div>
      </div>
      <div className="h-16 shrink-0 border-t" />
    </div>
  );
}
