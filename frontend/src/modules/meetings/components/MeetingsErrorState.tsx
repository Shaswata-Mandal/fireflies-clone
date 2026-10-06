import { MEETINGS_COPY } from "@/modules/meetings/constants";
import { ErrorState } from "@/shared/components/ErrorState";

interface MeetingsErrorStateProps {
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
}

/** Inline (not a toast): only the list area fails, the toolbar stays usable. */
export function MeetingsErrorState(props: MeetingsErrorStateProps) {
  return <ErrorState title={MEETINGS_COPY.ERROR_TITLE} {...props} />;
}
