/**
 * "Coming soon" placeholder inside a panel.
 *
 * WHAT: A smaller empty state for unbuilt tabs on the meeting page.
 * LAYER: Shared component.
 * CALLED BY: meeting-detail panels (Soundbites, Analytics, AI Skills...).
 * CALLS: `constants/messages.ts`.
 * MERN EQUIVALENT: a presentational "empty state" component.
 */

import type { ComponentType } from "react";
import { COMING_SOON } from "@/shared/constants/messages";

interface ComingSoonPanelProps {
  /** Any icon component that takes a className (lucide icons, FredMark). */
  icon: ComponentType<{ className?: string }>;
  /** The feature, e.g. "Soundbites". */
  title: string;
  description: string;
}

/** In-panel "Coming soon" empty state for tabs that exist in Fireflies but not here (24, 25, 26, 20). */
// @param icon the feature icon; @param title the feature name; @param description what it will do
export function ComingSoonPanel({ icon: Icon, title, description }: ComingSoonPanelProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-subtle text-primary-fg">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-medium text-primary">{title}</h3>
      <p className="max-w-sm text-sm text-secondary">{description}</p>
      <span className="rounded-md bg-primary-subtle-2 px-2 py-0.5 text-xs font-medium text-primary-fg">
        {COMING_SOON}
      </span>
    </div>
  );
}
