import { Sparkles } from "lucide-react";

/** Holds the Notes area (17) until the Summary / Action Items / Outline slice lands. */
export function NotesPlaceholder() {
  return (
    <section
      aria-label="Notes"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center"
    >
      <span className="flex size-10 items-center justify-center rounded-md border bg-card">
        <Sparkles className="size-5 text-primary-fg" aria-hidden="true" />
      </span>
      <p className="text-base font-medium text-primary">Summary coming next</p>
    </section>
  );
}
