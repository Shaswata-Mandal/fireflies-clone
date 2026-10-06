import { House } from "lucide-react";
import { ComingSoon } from "@/shared/components/ComingSoon";
import { ROUTE_TITLES, ROUTES } from "@/shared/constants/routes";

export default function HomePage() {
  return (
    <ComingSoon
      title={ROUTE_TITLES[ROUTES.HOME]}
      icon={House}
      description="Your recent meetings and open action items will appear here."
    />
  );
}
