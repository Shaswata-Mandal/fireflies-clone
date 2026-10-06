import { Layers } from "lucide-react";
import { ComingSoon } from "@/shared/components/ComingSoon";
import { ROUTE_TITLES, ROUTES } from "@/shared/constants/routes";

export default function IntegrationsPage() {
  return (
    <ComingSoon
      title={ROUTE_TITLES[ROUTES.INTEGRATIONS]}
      icon={Layers}
      description="Zoom, Google Meet, calendar and CRM integrations are out of scope for this demo."
    />
  );
}
