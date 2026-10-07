/**
 * Route `/uploads`.
 *
 * WHAT: The full-page "Add a meeting" form.
 * LAYER: App Router page (server component).
 * CALLED BY: Next.js, for the URL `/uploads`.
 * CALLS: `UploadsView` (a client component).
 */

import { UploadsView } from "@/modules/meetings/components/UploadsView";

export default function UploadsPage() {
  return <UploadsView />;
}
