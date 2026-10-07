/**
 * Settings page body.
 *
 * WHAT: Reads the active tab from `?tab=` and shows the matching panel inside `SettingsShell`.
 * LAYER: Module component (client).
 * CALLED BY: `app/settings/page.tsx`.
 * CALLS: `useTabParam`, the panels, `ComingSoonPanel`.
 */

"use client";

import { AccountPanel } from "@/modules/settings/components/AccountPanel";
import { AppearancePanel } from "@/modules/settings/components/AppearancePanel";
import { ProfilePanel } from "@/modules/settings/components/ProfilePanel";
import { SettingsShell } from "@/modules/settings/components/SettingsShell";
import {
  COMING_SOON_TABS,
  DEFAULT_SETTINGS_TAB,
  SETTINGS_TAB_IDS,
  SETTINGS_TABS,
  type SettingsTabId,
} from "@/modules/settings/constants";
import { ComingSoonPanel } from "@/shared/components/ComingSoonPanel";
import { useTabParam } from "@/shared/hooks/use-tab-param";

/** Maps a tab id to its panel; the `default` branch covers every unbuilt tab with one placeholder. */
function renderPanel(tab: SettingsTabId) {
  switch (tab) {
    case "profile":
      return <ProfilePanel />;
    case "account":
      return <AccountPanel />;
    case "appearance":
      return <AppearancePanel />;
    default: {
      const { icon, description } = COMING_SOON_TABS[tab];
      const title = SETTINGS_TABS.find((item) => item.id === tab)?.label ?? "";
      return (
        <div className="rounded-xl border bg-card">
          <ComingSoonPanel icon={icon} title={title} description={description} />
        </div>
      );
    }
  }
}

/** Settings page body: the active `?tab=` selects the panel; the menu lives in SettingsShell. */
export function SettingsView() {
  const [tab] = useTabParam(SETTINGS_TAB_IDS, DEFAULT_SETTINGS_TAB);
  const heading = SETTINGS_TABS.find((item) => item.id === tab)?.label ?? "Settings";

  return (
    <SettingsShell mode="personal" activeTab={tab}>
      <h1 className="text-sm text-secondary">{heading}</h1>
      {renderPanel(tab)}
    </SettingsShell>
  );
}
