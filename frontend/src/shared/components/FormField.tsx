/**
 * Form field wrapper (label + control + error).
 *
 * WHAT: Gives every form the same layout and wires accessibility (`label for`, `role="alert"`).
 * LAYER: Shared component.
 * CALLED BY: meeting create/edit forms, summary edit form, assignee/date forms.
 * CALLS: `cn`.
 * MERN EQUIVALENT: a `<FormGroup>` / `<Field>` component used with Formik or react-hook-form.
 */

import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

interface FormFieldProps {
  /** Id of the control; the label points at it and the error is linked via `errorId`. */
  htmlFor: string;
  label: string;
  error?: string;
  hint?: string;
  /** Visually hide the label (the control's placeholder or layout makes it obvious). */
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}

/** Id the control should put in `aria-describedby` so screen readers announce the error. */
// @param htmlFor the control's id; @returns the id for the error element (for aria-describedby)
export function fieldErrorId(htmlFor: string): string {
  return `${htmlFor}-error`;
}

/** Label + control + inline error, the layout every form in the app shares. */
// `hideLabel` uses Tailwind's `sr-only`: invisible on screen but still read by screen readers.
export function FormField({
  htmlFor,
  label,
  error,
  hint,
  hideLabel = false,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className={cn("text-sm font-medium text-default", hideLabel && "sr-only")}
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={fieldErrorId(htmlFor)} role="alert" className="text-xs text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}
