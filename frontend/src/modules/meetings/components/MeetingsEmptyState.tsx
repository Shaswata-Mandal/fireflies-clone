import { Upload, Video } from "lucide-react";
import Link from "next/link";
import { NoResultsIllustration } from "@/modules/meetings/components/NoResultsIllustration";
import { MEETINGS_COPY } from "@/modules/meetings/constants";
import { ROUTES } from "@/shared/constants/routes";

type MeetingsEmptyStateProps =
  /** The user has no meetings at all. */
  | { variant: "no-meetings" }
  /** Meetings exist, but none match the search/filters (screenshot 14). */
  | { variant: "no-results"; actionLabel: string; onClear: () => void };

const OUTLINE_BUTTON =
  "flex h-9 items-center gap-2 rounded-md border bg-card px-4 text-sm text-default hover:bg-hover";

export function MeetingsEmptyState(props: MeetingsEmptyStateProps) {
  if (props.variant === "no-results") {
    return (
      <section className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <NoResultsIllustration />
        <h2 className="mt-8 text-lg font-medium text-primary">{MEETINGS_COPY.NO_RESULTS_TITLE}</h2>
        <p className="max-w-md text-sm text-secondary">{MEETINGS_COPY.NO_RESULTS_BODY}</p>
        <button type="button" onClick={props.onClear} className={`${OUTLINE_BUTTON} mt-4`}>
          {props.actionLabel}
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-subtle text-primary-fg">
        <Video className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-base font-medium text-primary">{MEETINGS_COPY.NO_MEETINGS_TITLE}</h2>
      <p className="max-w-sm text-sm text-muted">{MEETINGS_COPY.NO_MEETINGS_BODY}</p>
      <Link
        href={ROUTES.UPLOADS}
        className="mt-2 flex h-9 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-medium text-on-primary hover:bg-primary-700"
      >
        <Upload className="size-4" aria-hidden="true" />
        Upload a meeting
      </Link>
    </section>
  );
}
