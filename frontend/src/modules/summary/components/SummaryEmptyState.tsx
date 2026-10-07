import { Sparkles } from "lucide-react";
import { SUMMARY_COPY } from "@/modules/summary/constants";
import { Button } from "@/shared/components/ui/button";

interface SummaryEmptyStateProps {
  /** False while the transcript is loading or when it has no segments. */
  canGenerate: boolean;
  /** The transcript loaded and is empty: show the screenshot's reason instead of the invitation. */
  isMissingTranscript: boolean;
  onGenerate: () => void;
}

const DESCRIPTION_ID = "summary-empty-description";

/** Coloured stubs + grey lines + sparkle tile: the empty-notes illustration in 17. */
const ILLUSTRATION_ROWS = ["bg-danger-fg/40", "bg-primary-600/50", "bg-info/30"] as const;

/**
 * No summary yet (17 / 17.1). With a transcript there's a Generate button; without one the button is
 * disabled and the screenshot's own sentence explains why (linked via aria-describedby).
 */
export function SummaryEmptyState({
  canGenerate,
  isMissingTranscript,
  onGenerate,
}: SummaryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div aria-hidden="true" className="relative mb-6 flex w-48 flex-col gap-2">
        {ILLUSTRATION_ROWS.map((stubClass) => (
          <div key={stubClass} className="mb-2 flex flex-col gap-2">
            <span className={`h-1.5 w-12 rounded-full ${stubClass}`} />
            <span className="h-1 w-full rounded-full bg-active" />
            <span className="h-1 w-3/4 rounded-full bg-active" />
          </div>
        ))}
        <span className="absolute -bottom-3 left-1/2 flex size-10 -translate-x-1/2 items-center justify-center rounded-md border bg-page">
          <Sparkles className="size-5 text-primary-fg" />
        </span>
      </div>

      <h3 className="mt-4 text-base font-medium text-primary">
        {isMissingTranscript ? SUMMARY_COPY.NO_TRANSCRIPT_TITLE : SUMMARY_COPY.EMPTY_TITLE}
      </h3>
      <p id={DESCRIPTION_ID} className="mt-2 max-w-sm text-sm text-secondary">
        {isMissingTranscript ? SUMMARY_COPY.NO_TRANSCRIPT_BODY : SUMMARY_COPY.EMPTY_BODY}
      </p>

      <Button
        size="lg"
        onClick={onGenerate}
        disabled={!canGenerate}
        aria-describedby={DESCRIPTION_ID}
        className="mt-6 px-4"
      >
        <Sparkles aria-hidden="true" />
        {SUMMARY_COPY.GENERATE}
      </Button>
    </div>
  );
}
