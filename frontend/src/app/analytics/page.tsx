import { ChartNoAxesColumn } from "lucide-react";
import { ComingSoon } from "@/shared/components/ComingSoon";
import { ROUTE_TITLES, ROUTES } from "@/shared/constants/routes";

export default function AnalyticsPage() {
  return <ComingSoon title={ROUTE_TITLES[ROUTES.ANALYTICS]} icon={ChartNoAxesColumn} />;
}
