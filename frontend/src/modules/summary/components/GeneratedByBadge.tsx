/**
 * Small badge showing who wrote the summary.
 *
 * WHAT: "Seed" for sample data, "AI generated" for the mock or the LLM.
 * LAYER: Module component (server-safe).
 * CALLED BY: `SummaryToolbar`.
 * CALLS: `GENERATED_BY_LABEL`, `cn`.
 */

import { Database, Sparkles } from "lucide-react";
import type { GeneratedBy } from "@/modules/meetings/types";
import { GENERATED_BY_LABEL } from "@/modules/summary/constants";
import { cn } from "@/shared/utils/cn";

interface GeneratedByBadgeProps {
  generatedBy: GeneratedBy;
}

/** Where the summary came from: sample data ("Seed") or a generator ("AI generated"). */
export function GeneratedByBadge({ generatedBy }: GeneratedByBadgeProps) {
  const isSeed = generatedBy === "seed";
  const Icon = isSeed ? Database : Sparkles;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        isSeed ? "bg-active text-secondary" : "bg-primary-subtle text-primary-fg",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {GENERATED_BY_LABEL[generatedBy]}
    </span>
  );
}
