import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface StatCardProps {
  title: string;
  icon: LucideIcon;
  /** undefined while loading; null when the query failed. */
  subtitle: string | null | undefined;
}

const UNAVAILABLE = "Unavailable";

/** One Personal Assistant card (docs/reference/08): icon tile, title, one line of data. */
export function StatCard({ title, icon: Icon, subtitle }: StatCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary-fg">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium text-primary">{title}</h3>
        {subtitle === undefined ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <p className="text-sm text-secondary">{subtitle ?? UNAVAILABLE}</p>
        )}
      </div>
    </div>
  );
}
