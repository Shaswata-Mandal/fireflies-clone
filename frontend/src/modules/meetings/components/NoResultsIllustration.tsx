/**
 * Decorative "no results" picture.
 *
 * WHAT: Three stacked placeholder cards made of styled divs (no image file).
 * LAYER: Module component (server-safe).
 * CALLED BY: `MeetingsEmptyState`.
 * CALLS: `cn`.
 */

import { cn } from "@/shared/utils/cn";

// The three placeholder cards from screenshot 14; the middle one is wider and sticks out.
const CARDS = [
  { letter: "K", width: "w-64" },
  { letter: "A", width: "w-80" },
  { letter: "R", width: "w-64" },
] as const;

/** Decorative only: hidden from assistive tech. */
export function NoResultsIllustration() {
  return (
    <div aria-hidden="true" className="flex flex-col items-center gap-4">
      {CARDS.map(({ letter, width }) => (
        <div
          key={letter}
          className={cn(
            "flex max-w-full items-center gap-3 rounded-lg border bg-page px-3 py-3",
            width,
          )}
        >
          <span className="flex size-6 items-center justify-center rounded-sm bg-active text-[10px] text-secondary">
            {letter}
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="h-1.5 w-24 rounded-full bg-active" />
            <span className="h-1.5 w-10 rounded-full bg-active" />
          </span>
        </div>
      ))}
    </div>
  );
}
