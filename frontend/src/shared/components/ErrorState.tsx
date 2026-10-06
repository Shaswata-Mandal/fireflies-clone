import { AlertCircle, RotateCw } from "lucide-react";
import { isApiError } from "@/shared/lib/api-error";
import { cn } from "@/shared/utils/cn";

interface ErrorStateProps {
  title: string;
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
  className?: string;
}

const FALLBACK_MESSAGE = "Something went wrong.";

/** Inline failed-query state with Retry (queries never toast; see decision 15). */
export function ErrorState({ title, error, onRetry, isRetrying, className }: ErrorStateProps) {
  const message = isApiError(error) ? error.message : FALLBACK_MESSAGE;

  return (
    <section
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <AlertCircle className="size-8 text-danger-fg" aria-hidden="true" />
      <h2 className="text-base font-medium text-primary">{title}</h2>
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
