import { Upload } from "lucide-react";
import { ComingSoon } from "@/shared/components/ComingSoon";
import { ROUTE_TITLES, ROUTES } from "@/shared/constants/routes";

export default function UploadsPage() {
  return (
    <ComingSoon
      title={ROUTE_TITLES[ROUTES.UPLOADS]}
      icon={Upload}
      description="Upload a transcript file to create a meeting with a summary."
    />
  );
}
