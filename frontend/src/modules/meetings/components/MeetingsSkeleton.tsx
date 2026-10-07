/**
 * Loading placeholder for the library.
 *
 * WHAT: Six grey animated cards while the first page loads.
 * LAYER: Module component (server-safe).
 * CALLED BY: `MeetingsView`.
 * CALLS: shadcn `Skeleton`.
 */

import { Skeleton } from "@/shared/components/ui/skeleton";

const SKELETON_ROWS = 6;

/** Loading cards from screenshot 30: a square avatar plus a long and a short bar per row. */
export function MeetingsSkeleton() {
  return (
    <div role="status" aria-label="Loading meetings" className="flex flex-col gap-4">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-xl border bg-page px-5 py-5">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-3.5 w-64 max-w-full" />
            <Skeleton className="h-2.5 w-40 max-w-[70%]" />
          </div>
        </div>
      ))}
    </div>
  );
}
