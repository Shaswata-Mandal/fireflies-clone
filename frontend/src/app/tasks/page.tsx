/**
 * Route `/tasks`.
 *
 * WHAT: A "Coming soon" placeholder; the open tasks already show on Home.
 * LAYER: App Router page (server component).
 * CALLED BY: Next.js, for the URL `/tasks`.
 * CALLS: `ComingSoon`.
 */

import { ListTodo } from "lucide-react";
import { ComingSoon } from "@/shared/components/ComingSoon";
import { ROUTE_TITLES, ROUTES } from "@/shared/constants/routes";

export default function TasksPage() {
  return (
    <ComingSoon
      title={ROUTE_TITLES[ROUTES.TASKS]}
      icon={ListTodo}
      description="Action items from every meeting will be collected here."
    />
  );
}
