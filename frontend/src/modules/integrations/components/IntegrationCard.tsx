/**
 * One integration card.
 *
 * WHAT: Icon, name, description, a disabled "Connect" button and a "Coming soon" badge.
 * LAYER: Module component (server-safe).
 * CALLED BY: `IntegrationsView`.
 * CALLS: `COMING_SOON`.
 */

import type { Integration } from "@/modules/integrations/constants";
import { COMING_SOON } from "@/shared/constants/messages";

interface IntegrationCardProps {
  integration: Integration;
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  // `icon: Icon` renames the field to a capitalised variable so it can be used as <Icon />.
  const { name, description, icon: Icon } = integration;

  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary-subtle text-primary-fg">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="text-base font-medium text-primary">{name}</h3>
      <p className="flex-1 text-sm text-secondary">{description}</p>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled
          aria-label={`Connect ${name} (${COMING_SOON.toLowerCase()})`}
          className="h-9 rounded-md bg-primary-600 px-4 text-sm font-medium text-on-primary disabled:opacity-50"
        >
          Connect
        </button>
        <span className="rounded-md bg-primary-subtle-2 px-2 py-0.5 text-xs font-medium text-primary-fg">
          {COMING_SOON}
        </span>
      </div>
    </li>
  );
}
