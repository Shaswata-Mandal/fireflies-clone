import { Video } from "lucide-react";
import { ComingSoon } from "@/shared/components/ComingSoon";
import { ROUTE_TITLES, ROUTES } from "@/shared/constants/routes";

export default function MeetingsPage() {
  return (
    <ComingSoon
      title={ROUTE_TITLES[ROUTES.MEETINGS]}
      icon={Video}
      description="Browse, search and filter all your meetings here."
    />
  );
}
