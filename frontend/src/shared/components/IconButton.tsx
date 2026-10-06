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
