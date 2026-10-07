/**
 * Route `/analytics`.
 *
 * WHAT: A "Coming soon" placeholder (analytics is out of scope).
 * LAYER: App Router page (server component).
 * CALLED BY: Next.js, for the URL `/analytics`.
 * CALLS: `ComingSoon`, `ROUTE_TITLES`.
 */

import { ChartNoAxesColumn } from "lucide-react";
import { ComingSoon } from "@/shared/components/ComingSoon";
import { ROUTE_TITLES, ROUTES } from "@/shared/constants/routes";

export default function AnalyticsPage() {
  return <ComingSoon title={ROUTE_TITLES[ROUTES.ANALYTICS]} icon={ChartNoAxesColumn} />;
}
