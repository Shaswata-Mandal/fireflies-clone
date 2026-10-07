/**
 * Route `/team`.
 *
 * WHAT: The team screens (workspace, teammates...).
 * LAYER: App Router page (server component).
 * CALLED BY: Next.js, for the URL `/team` (the tab comes from `?tab=`).
 * CALLS: `TeamView`, wrapped in `<Suspense>` (it reads search params).
 */

import { Suspense } from "react";
import { TeamView } from "@/modules/team/components/TeamView";

export default function TeamPage() {
  // TeamView reads ?tab= with useSearchParams, which needs a Suspense boundary for `next build`.
  return (
    <Suspense>
      <TeamView />
    </Suspense>
  );
}
