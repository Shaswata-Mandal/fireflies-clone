/**
 * Route `/integrations`.
 *
 * WHAT: The integrations screen (all "Coming soon").
 * LAYER: App Router page (server component).
 * CALLED BY: Next.js, for the URL `/integrations`.
 * CALLS: `IntegrationsView`, wrapped in `<Suspense>`.
 * INTERVIEW: `useSearchParams()` makes a page depend on the URL at request time; Next.js requires a
 * Suspense boundary around components that call it, or `next build` fails.
 */

import { Suspense } from "react";
import { IntegrationsView } from "@/modules/integrations/components/IntegrationsView";

export default function IntegrationsPage() {
  // IntegrationsView reads ?tab= with useSearchParams, which needs a Suspense boundary for `next build`.
  return (
    <Suspense>
      <IntegrationsView />
    </Suspense>
  );
}
