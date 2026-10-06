import { Users } from "lucide-react";
import { ComingSoon } from "@/shared/components/ComingSoon";
import { ROUTE_TITLES, ROUTES } from "@/shared/constants/routes";

export default function TeamPage() {
  return (
    <ComingSoon
      title={ROUTE_TITLES[ROUTES.TEAM]}
      icon={Users}
      description="Team workspaces and sharing are out of scope for this demo."
    />
  );
}
