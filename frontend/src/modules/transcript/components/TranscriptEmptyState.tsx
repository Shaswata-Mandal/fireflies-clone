/**
 * Empty state for a meeting with no transcript.
 *
 * WHAT: Illustration plus an explanation.
 * LAYER: Module component (server-safe).
 * CALLED BY: `TranscriptPanel`.
 */

import { TRANSCRIPT_COPY } from "@/modules/transcript/constants";
import { cn } from "@/shared/utils/cn";

/** Speaker-square colors of the two placeholder cards in screenshot 19. */
const PLACEHOLDER_SQUARES = ["bg-skeleton-speaker-a", "bg-skeleton-speaker-b"] as const;

/** Shown when a meeting has no transcript segments (illustration and copy from screenshot 19). */
export function TranscriptEmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div aria-hidden="true" className="mb-10 flex w-full max-w-72 flex-col gap-3">
        {PLACEHOLDER_SQUARES.map((squareClass) => (
          <div key={squareClass} className="flex flex-col gap-3 rounded-lg bg-card p-4">
            <div className="flex items-center gap-2">
              <span className={cn("size-5 rounded-sm", squareClass)} />
              <span className="h-1.5 w-12 rounded-full bg-active" />
              <span className="h-1.5 w-5 rounded-full bg-primary-subtle" />
              <span className="h-1.5 w-5 rounded-full bg-active" />
            </div>
            <span className="h-1.5 w-11/12 rounded-full bg-active" />
            <span className="h-1.5 w-2/3 rounded-full bg-active" />
          </div>
        ))}
      </div>
      <h3 className="text-xl text-primary">{TRANSCRIPT_COPY.EMPTY_TITLE}</h3>
      <p className="mt-2 max-w-xs text-sm text-secondary">{TRANSCRIPT_COPY.EMPTY_BODY}</p>
    </div>
  );
}
