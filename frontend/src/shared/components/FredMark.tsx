/**
 * AskFred icon.
 *
 * WHAT: A custom SVG robot-head glyph.
 * LAYER: Shared component (server-safe).
 * CALLED BY: sidebar nav, AskFred panel and dock.
 * CALLS: nothing.
 * MERN EQUIVALENT: an inline SVG icon component.
 */

import type { SVGProps } from "react";

/**
 * AskFred glyph: a simple original robot head drawn in `currentColor`, so callers color it with a
 * text-* class. Deliberately not the Fireflies asset.
 */
// `{...props}` below lets callers pass className/size; `currentColor` makes the drawing follow
// the text colour (so `text-primary-fg` colours the icon).
export function FredMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3v3" />
      <circle cx="12" cy="2.5" r="0.5" fill="currentColor" />
      <rect x="4" y="9" width="16" height="11" rx="5.5" fill="currentColor" fillOpacity={0.25} />
      <path d="M9 14.5h.01M15 14.5h.01" strokeWidth={2.5} />
      <path d="M8 6.5a6 6 0 0 1 8 0" />
    </svg>
  );
}
