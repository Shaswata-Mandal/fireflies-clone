import type { ReactNode } from "react";

interface ActionItemSectionProps {
  title: string;
  count: number;
  children: ReactNode;
}

/** "OPEN 3" / "COMPLETED 2" heading (overline style from 17) above a list of rows. */
export function ActionItemSection({ title, count, children }: ActionItemSectionProps) {
  const headingId = `action-items-${title.toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1">
      <h3
        id={headingId}
        className="flex items-center gap-2 px-3 text-xs font-medium tracking-wide text-muted uppercase"
      >
        {title}
        <span className="rounded-md bg-active px-1.5 py-0.5 text-secondary tabular-nums">
          {count}
        </span>
      </h3>
      {children}
    </section>
  );
}
