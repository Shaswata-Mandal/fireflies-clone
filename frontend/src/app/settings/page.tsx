/**
 * Route `/settings`.
 *
 * WHAT: The personal settings screens (profile, account, appearance...).
 * LAYER: App Router page (server component).
 * CALLED BY: Next.js, for the URL `/settings` (the tab comes from `?tab=`).
 * CALLS: `SettingsView`, wrapped in `<Suspense>` (it reads search params).
 */

import { Suspense } from "react";
import { SettingsView } from "@/modules/settings/components/SettingsView";

export default function SettingsPage() {
  // SettingsView reads ?tab= with useSearchParams, which needs a Suspense boundary for `next build`.
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
