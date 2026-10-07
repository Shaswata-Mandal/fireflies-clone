/**
 * Full-page "Coming soon" placeholder.
 *
 * WHAT: Title plus a centred empty-state card for out-of-scope pages (Analytics, Integrations...).
 * LAYER: Shared component (server-safe: no hooks, so no "use client").
 * CALLED BY: thin pages in `app/` for unbuilt sections.
 * CALLS: `constants/messages.ts`.
 * MERN EQUIVALENT: a `<ComingSoon />` presentational component.
 */

import type { LucideIcon } from "lucide-react";
import { COMING_SOON } from "@/shared/constants/messages";

// Props are typed with an interface (CLAUDE.md rule); `?` marks an optional prop.
interface ComingSoonProps {
  title: string;
  icon: LucideIcon;
  description?: string;
}

const DEFAULT_DESCRIPTION = "This section is being built and will be available in a later release.";

/**
 * Placeholder page body: title plus a centred empty state, sized like the Fireflies empty states.
 * @param title page heading; @param icon a lucide icon component; @param description optional text
 */
export function ComingSoon({
  title,
  // `icon: Icon` renames the prop: a JSX component name must start with a capital letter.
  icon: Icon,
  description = DEFAULT_DESCRIPTION,
}: ComingSoonProps) {
  // Tailwind: `mx-auto max-w-205` centres a fixed-width column; `flex flex-col gap-8` stacks the
  // heading and card with spacing; colours (`text-primary`, `bg-card`) are theme tokens.
  return (
    <div className="mx-auto flex w-full max-w-205 flex-col gap-8 px-6 py-8">
      <h1 className="text-2xl font-medium text-primary">{title}</h1>
      <section className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary-subtle text-primary-fg">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="text-base font-medium text-primary">{COMING_SOON}</h2>
        <p className="max-w-sm text-sm text-muted">{description}</p>
      </section>
    </div>
  );
}
