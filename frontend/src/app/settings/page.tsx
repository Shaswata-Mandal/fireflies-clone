import { Settings } from "lucide-react";
import { ComingSoon } from "@/shared/components/ComingSoon";
import { ROUTE_TITLES, ROUTES } from "@/shared/constants/routes";

export default function SettingsPage() {
  return <ComingSoon title={ROUTE_TITLES[ROUTES.SETTINGS]} icon={Settings} />;
}
