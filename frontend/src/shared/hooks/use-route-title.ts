"use client";

import { usePathname } from "next/navigation";
import { ROUTE_TITLES, ROUTES, isRouteActive, type AppRoute } from "@/shared/constants/routes";

/** Title of the top-level section the current URL belongs to (/meetings/12 → "Meetings"). */
export function useRouteTitle(): string {
  const pathname = usePathname();
  const routes = Object.values(ROUTES) as AppRoute[];
  const match = routes.find((route) => isRouteActive(pathname, route));
  return match ? ROUTE_TITLES[match] : "";
}
