/**
 * Icon-only button.
 *
 * WHAT: A square ghost button that requires an accessible label.
 * LAYER: Shared component.
 * CALLED BY: navbar, panels, popovers, any toolbar of icons.
 * CALLS: `cn`.
 * MERN EQUIVALENT: an `<IconButton aria-label>` component, like MUI's.
 */

import type { ComponentProps } from "react";
import { cn } from "@/shared/utils/cn";

interface IconButtonProps extends ComponentProps<"button"> {
  /** Required: an icon alone has no accessible name. */
  label: string;
}

/**
 * Square ghost button for a single icon. Spreads remaining props (and `ref`, a plain prop in React 19)
 * so it can be a Radix `asChild` trigger.
 */
// `ComponentProps<"button">` (above) = every normal <button> attribute, so this can replace a
// plain button anywhere. @param label becomes the `aria-label` read by screen readers.
export function IconButton({
  label,
  className,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      // Tailwind groups: (1) size, layout and colours with hover, (2) keyboard focus ring and
      // disabled look, (3) force any child svg to ignore pointer events and default to size-4.
      // `cn` merges them and lets a caller's `className` override.
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary data-[state=open]:bg-hover",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
