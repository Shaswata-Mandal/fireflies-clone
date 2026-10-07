/**
 * Titled block inside the summary.
 *
 * WHAT: An uppercase small heading followed by its content.
 * LAYER: Module component (server-safe).
 * CALLED BY: `SummaryView`.
 */

import type { ReactNode } from "react";

interface SummarySectionProps {
  title: string;
  children: ReactNode;
}

/** One block of the summary with an overline heading (the "AI FILTERS" style in 17). */
export function SummarySection({ title, children }: SummarySectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium tracking-wide text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}
