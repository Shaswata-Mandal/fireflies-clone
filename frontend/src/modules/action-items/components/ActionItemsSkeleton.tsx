import { Skeleton } from "@/shared/components/ui/skeleton";

const ROW_WIDTHS = ["w-3/4", "w-2/3", "w-5/6", "w-1/2"] as const;

/** Checkbox + text + meta line per row while the list loads. */
export function ActionItemsSkeleton() {
  return (
    <div role="status" aria-label="Loading action items" className="flex flex-col gap-4 px-3">
      {ROW_WIDTHS.map((width) => (
        <div key={width} className="flex items-start gap-3">
          <Skeleton className="mt-0.5 size-4 rounded-sm" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className={`h-3 ${width}`} />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
