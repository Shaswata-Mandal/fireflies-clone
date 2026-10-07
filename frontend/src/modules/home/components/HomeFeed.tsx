"use client";

import { CalendarClock, Newspaper } from "lucide-react";
import { useState } from "react";
import { RecentMeetingsSection } from "@/modules/home/components/RecentMeetingsSection";
import { ComingSoonPanel } from "@/shared/components/ComingSoonPanel";
import {
  TabList,
  tabElementId,
  tabPanelElementId,
  type TabItem,
} from "@/shared/components/TabList";

type FeedTab = "recent" | "upcoming" | "ai-feed";

const FEED_TABS: ReadonlyArray<TabItem<FeedTab>> = [
  { id: "recent", label: "Recent" },
  { id: "upcoming", label: "Upcoming" },
  { id: "ai-feed", label: "AI Feed" },
];

const ID_PREFIX = "home-feed";

/** Recent / Upcoming / AI Feed tabs (docs/reference/08); only Recent has data. */
export function HomeFeed() {
  const [tab, setTab] = useState<FeedTab>("recent");

  function renderPanel() {
    if (tab === "recent") return <RecentMeetingsSection />;
    if (tab === "upcoming") {
      return (
        <ComingSoonPanel
          icon={CalendarClock}
          title="Upcoming meetings"
          description="Calendar integration is not part of this demo."
        />
      );
    }
    return (
      <ComingSoonPanel
        icon={Newspaper}
        title="AI Feed"
        description="Highlights from your meetings will appear here."
      />
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <TabList
        tabs={FEED_TABS}
        activeId={tab}
        onChange={setTab}
        idPrefix={ID_PREFIX}
        label="Home feed"
        variant="segmented"
        className="self-start"
      />
      <div
        role="tabpanel"
        id={tabPanelElementId(ID_PREFIX, tab)}
        aria-labelledby={tabElementId(ID_PREFIX, tab)}
      >
        {renderPanel()}
      </div>
    </section>
  );
}
