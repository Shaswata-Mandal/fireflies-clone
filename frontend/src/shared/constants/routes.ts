// Every in-app URL lives here so links and the navbar title can't drift apart.

export const ROUTES = {
  HOME: "/",
  MEETINGS: "/meetings",
  TASKS: "/tasks",
  UPLOADS: "/uploads",
  ANALYTICS: "/analytics",
  INTEGRATIONS: "/integrations",
  TEAM: "/team",
  SETTINGS: "/settings",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** `/meetings/12` */
export function meetingDetailRoute(id: number): string {
  return `${ROUTES.MEETINGS}/${id}`;
}

/** Navbar breadcrumb text per top-level route. */
export const ROUTE_TITLES: Record<AppRoute, string> = {
  [ROUTES.HOME]: "Home",
  [ROUTES.MEETINGS]: "Meetings",
  [ROUTES.TASKS]: "Tasks",
  [ROUTES.UPLOADS]: "Uploads",
  [ROUTES.ANALYTICS]: "Analytics",
  [ROUTES.INTEGRATIONS]: "Integrations",
  [ROUTES.TEAM]: "Team",
  [ROUTES.SETTINGS]: "Settings",
};

/** Home only matches exactly; every other route also matches its sub-pages (/meetings/12). */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === ROUTES.HOME) return pathname === ROUTES.HOME;
  return pathname === href || pathname.startsWith(`${href}/`);
}
