/**
 * Team page body.
 *
 * WHAT: Reads `?tab=` and shows Workspace, Teammates or a "Coming soon" panel inside the shared
 *   settings layout.
 * LAYER: Module component (client).
 * CALLED BY: `app/team/page.tsx`.
 * CALLS: `useTabParam`, `SettingsShell` (from the settings module), the team panels.
 */

"use client";

import { SettingsShell } from "@/modules/settings/components/SettingsShell";
import { TeammatesPanel } from "@/modules/team/components/TeammatesPanel";
import { WorkspacePanel } from "@/modules/team/components/WorkspacePanel";
import {
  DEFAULT_TEAM_TAB,
  TEAM_COMING_SOON,
  TEAM_TAB_IDS,
  type TeamTabId,
} from "@/modules/team/constants";
import { ComingSoonPanel } from "@/shared/components/ComingSoonPanel";
import { useTabParam } from "@/shared/hooks/use-tab-param";

function renderPanel(tab: TeamTabId) {
  if (tab === "workspace") return <WorkspacePanel />;
  if (tab === "teammates") return <TeammatesPanel />;
  const { icon, title, description } = TEAM_COMING_SOON[tab];
  return (
    <div className="rounded-xl border bg-card">
      <ComingSoonPanel icon={icon} title={title} description={description} />
    </div>
  );
}

/** Team page body; same full-page layout as Settings, in its "Team" mode. */
export function TeamView() {
  const [tab] = useTabParam(TEAM_TAB_IDS, DEFAULT_TEAM_TAB);

  return (
    <SettingsShell mode="team" activeTab={tab}>
      {renderPanel(tab)}
    </SettingsShell>
  );
}
