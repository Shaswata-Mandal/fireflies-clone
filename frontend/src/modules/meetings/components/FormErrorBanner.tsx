/**
 * Form-level error banner.
 *
 * WHAT: A red alert box for errors that belong to the whole form, not one field.
 * LAYER: Module component (server-safe).
 * CALLED BY: `CreateMeetingForm`.
 * CALLS: nothing. `role="alert"` makes screen readers announce it immediately.
 */

import { AlertCircle } from "lucide-react";

interface FormErrorBannerProps {
  message: string;
}

/** Form-level error (a server problem that isn't tied to one field). */
export function FormErrorBanner({ message }: FormErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger-fg bg-card px-3 py-2 text-sm text-danger-fg"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
