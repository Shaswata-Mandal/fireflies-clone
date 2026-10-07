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
