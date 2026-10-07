/**
 * Shared Tailwind class strings for form controls.
 *
 * WHAT: Input, textarea and label styles reused by the create and edit forms.
 * LAYER: Module constants (not a component).
 * CALLED BY: `MeetingCommonFields`, `PasteTranscriptFields`, forms.
 * CALLS: nothing.
 * Class groups in INPUT_CLASS: size (`h-9 w-full`), look (`rounded-md border bg-card`), text
 * (`text-sm text-default`), focus (`outline-none focus:border-focus`), and states
 * (`disabled:opacity-60`, `aria-invalid:border-danger-fg` which turns the border red when the
 * input has `aria-invalid="true"`).
 */

// Tailwind classes shared by the create / edit meeting forms (tokens from globals.css only).

export const INPUT_CLASS =
  "h-9 w-full rounded-md border border-strong bg-card px-3 text-sm text-default outline-none placeholder:text-muted focus:border-focus disabled:opacity-60 aria-invalid:border-danger-fg";

export const TEXTAREA_CLASS =
  "min-h-40 w-full resize-y rounded-md border border-strong bg-card px-3 py-2 font-mono text-sm text-default outline-none placeholder:text-muted focus:border-focus disabled:opacity-60 aria-invalid:border-danger-fg";

export const LABEL_CLASS = "text-sm font-medium text-default";
