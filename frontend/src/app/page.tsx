/**
 * Route `/` (Home).
 *
 * WHAT: A thin page that just renders the Home dashboard.
 * LAYER: App Router page (server component; routing only, per CLAUDE.md).
 * CALLED BY: Next.js, for the URL `/` (the file path `app/page.tsx` IS the route).
 * CALLS: `HomeView`.
 * MERN EQUIVALENT: `<Route path="/" element={<HomeView />} />`.
 */

import { HomeView } from "@/modules/home/components/HomeView";

export default function HomePage() {
  return <HomeView />;
}
