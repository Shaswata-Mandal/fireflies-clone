/**
 * Team constants.
 *
 * WHAT: Tab ids, the owner role label and the "Coming soon" text for unbuilt team tabs.
 * LAYER: Module constants.
 * CALLED BY: the team components and `settings/nav.ts` (ids must match its Team menu).
 */

import { Bell, Radio, SlidersHorizontal, Sparkles, Video, type LucideIcon } from "lucide-react";

// Tab ids match the Team menu in modules/settings/nav.ts; only workspace and teammates are built.
export const TEAM_TAB_IDS = [
  "workspace",
  "teammates",
  "recording",
  "compliance",
  "ai",
  "live-meeting",
  "rules",
] as const;
export type TeamTabId = (typeof TEAM_TAB_IDS)[number];
export const DEFAULT_TEAM_TAB: TeamTabId = "workspace";

/** The only role in a single-user workspace (docs/reference/36 shows ADMIN; we call it Owner). */
export const OWNER_ROLE = "Owner";

// `Exclude<...>` limits the keys to the unbuilt tabs, as in the settings module.
export const TEAM_COMING_SOON: Record<
  Exclude<TeamTabId, "workspace" | "teammates">,
  { icon: LucideIcon; title: string; description: string }
> = {
  recording: {
    icon: Video,
    title: "Recording & Privacy",
    description: "Team-wide recording rules.",
  },
  compliance: {
    icon: Bell,
    title: "Compliance Notification",
    description: "Team recording notices.",
  },
  ai: { icon: Sparkles, title: "AI Settings", description: "Team defaults for summaries." },
  "live-meeting": { icon: Radio, title: "Live Meeting", description: "Team live meeting options." },
  rules: { icon: SlidersHorizontal, title: "Rules", description: "Automation rules for the team." },
};
