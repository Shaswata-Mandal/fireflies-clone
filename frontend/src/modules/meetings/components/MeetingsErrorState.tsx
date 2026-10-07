/**
 * Error state for the library list.
 *
 * WHAT: The shared `ErrorState` with this module's title.
 * LAYER: Module component (server-safe).
 * CALLED BY: `MeetingsView`.
 * CALLS: `ErrorState`.
 */

import { MEETINGS_COPY } from "@/modules/meetings/constants";
import { ErrorState } from "@/shared/components/ErrorState";

interface MeetingsErrorStateProps {
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
}

/** Inline (not a toast): only the list area fails, the toolbar stays usable. */
export function MeetingsErrorState(props: MeetingsErrorStateProps) {
  // `{...props}` forwards error, onRetry and isRetrying unchanged.
  return <ErrorState title={MEETINGS_COPY.ERROR_TITLE} {...props} />;
}
