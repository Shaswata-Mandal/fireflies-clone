import toast from "react-hot-toast";
import { COMING_SOON } from "@/shared/constants/messages";

/** Feedback for visible-but-unbuilt features (billing, integrations, …), so no click is a dead end. */
export function showComingSoon(feature: string): void {
  // The id stops repeated clicks from stacking identical toasts.
  toast(`${feature}: ${COMING_SOON.toLowerCase()}`, { id: `coming-soon-${feature}` });
}
