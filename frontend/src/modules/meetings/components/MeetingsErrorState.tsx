import { AlertCircle, RotateCw } from "lucide-react";
import { MEETINGS_COPY } from "@/modules/meetings/constants";
import { isApiError } from "@/shared/lib/api-error";

interface MeetingsErrorStateProps {
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
}

/** Inline (not a toast): only the list area fails, the toolbar stays usable. */
export function MeetingsErrorState({ error, onRetry, isRetrying }: MeetingsErrorStateProps) {
  const message = isApiError(error) ? error.message : "Something went wrong.";

  return (
    <section
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center"
    >
      <AlertCircle className="size-8 text-danger-fg" aria-hidden="true" />
      <h2 className="text-base font-medium text-primary">{MEETINGS_COPY.ERROR_TITLE}</h2>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-2 flex h-9 items-center gap-2 rounded-md border bg-surface px-4 text-sm text-default hover:bg-hover disabled:text-disabled"
      >
        <RotateCw className={isRetrying ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
        {isRetrying ? "Retrying…" : "Retry"}
      </button>
    </section>
  );
}
