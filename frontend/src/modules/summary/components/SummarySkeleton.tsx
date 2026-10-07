/**
 * Loading placeholder while a summary is being generated.
 *
 * WHAT: Skeleton bars shaped like an overview, keyword chips and bullet lines.
 * LAYER: Module component (server-safe).
 * CALLED BY: `SummaryPanel`.
 * `role="status"` + `aria-label` announce the loading state to screen readers.
 */

import { Skeleton } from "@/shared/components/ui/skeleton";

const KEYWORD_WIDTHS = ["w-16", "w-24", "w-14", "w-20"] as const;
const BULLET_WIDTHS = ["w-11/12", "w-4/5", "w-2/3"] as const;

/** Placeholder while a summary generates: a wide bar, chip row and lines, like the bars in 17.1. */
export function SummarySkeleton() {
  return (
    <div role="status" aria-label="Generating summary" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex flex-wrap gap-2">
        {KEYWORD_WIDTHS.map((width) => (
          <Skeleton key={width} className={`h-6 ${width}`} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {BULLET_WIDTHS.map((width) => (
          <Skeleton key={width} className={`h-3 ${width}`} />
        ))}
      </div>
    </div>
  );
}
