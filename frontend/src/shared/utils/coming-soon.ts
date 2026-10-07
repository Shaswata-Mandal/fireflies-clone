/**
 * "Coming soon" toast helper.
 *
 * WHAT: Shows one toast for features that are visible in the UI but not built.
 * LAYER: Shared util.
 * CALLED BY: Sidebar, account menu and other placeholder items.
 * CALLS: react-hot-toast and `constants/messages.ts`.
 * MERN EQUIVALENT: a `notify("Not implemented yet")` helper.
 */

import toast from "react-hot-toast";
import { COMING_SOON } from "@/shared/constants/messages";

/** Feedback for visible-but-unbuilt features (billing, integrations, …), so no click is a dead end. */
// @param feature the feature name shown in the toast, e.g. "Analytics"
export function showComingSoon(feature: string): void {
  // The id stops repeated clicks from stacking identical toasts.
  toast(`${feature}: ${COMING_SOON.toLowerCase()}`, { id: `coming-soon-${feature}` });
}
