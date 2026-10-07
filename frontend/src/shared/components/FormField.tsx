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
export function fieldErrorId(htmlFor: string): string {
  return `${htmlFor}-error`;
}

/** Label + control + inline error, the layout every form in the app shares. */
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
