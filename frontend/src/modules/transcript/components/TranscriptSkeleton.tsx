/**
 * Loading placeholder for the transcript.
 *
 * WHAT: Five skeleton speaker blocks.
 * LAYER: Module component (server-safe).
 * CALLED BY: `TranscriptPanel`, `MeetingDetailSkeleton`.
 */

import { Skeleton } from "@/shared/components/ui/skeleton";

const SKELETON_BLOCKS = 5;

/** Speaker blocks while the transcript loads: avatar + name, then two text lines. */
export function TranscriptSkeleton() {
  return (
    <div role="status" aria-label="Loading transcript" className="flex flex-col gap-6 p-4">
      {Array.from({ length: SKELETON_BLOCKS }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-sm" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="flex flex-col gap-2 pl-8">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
