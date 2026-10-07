import { AlertCircle, RotateCw } from "lucide-react";
import type { AskErrorView } from "@/modules/meetings/ask-errors";

interface AskErrorNoticeProps {
  error: AskErrorView;
  onRetry: () => void;
}

/** Inline failure under the last question. Retry only appears when trying again can help. */
export function AskErrorNotice({ error, onRetry }: AskErrorNoticeProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger-fg" aria-hidden="true" />
      <p className="flex-1 text-default">{error.message}</p>
      {error.canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1 text-primary-fg hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <RotateCw className="size-3.5" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}
