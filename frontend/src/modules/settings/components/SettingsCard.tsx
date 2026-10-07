/**
 * Settings card container.
 *
 * WHAT: A bordered box with a title, optional description and content.
 * LAYER: Module component (server-safe).
 * CALLED BY: the settings and team panels.
 */

import type { ReactNode } from "react";

interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** Bordered card with a heading, the container every settings panel uses. */
export function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-medium text-primary">{title}</h2>
        {description && <p className="text-sm text-secondary">{description}</p>}
      </header>
      {children}
    </section>
  );
}
