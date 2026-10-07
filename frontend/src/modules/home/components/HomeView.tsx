/**
 * The Home dashboard.
 *
 * WHAT: Greeting, stats, feed and open action items stacked in one column.
 * LAYER: Module component (server-safe: it only arranges children).
 * CALLED BY: `app/page.tsx`.
 * CALLS: `HomeGreeting`, `HomeStats`, `HomeFeed`, `OpenActionItemsSection`.
 */

import { HomeFeed } from "@/modules/home/components/HomeFeed";
import { HomeGreeting } from "@/modules/home/components/HomeGreeting";
import { HomeStats } from "@/modules/home/components/HomeStats";
import { OpenActionItemsSection } from "@/modules/home/components/OpenActionItemsSection";

export function HomeView() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <HomeGreeting />
      <HomeStats />
      <HomeFeed />
      <OpenActionItemsSection />
    </div>
  );
}
