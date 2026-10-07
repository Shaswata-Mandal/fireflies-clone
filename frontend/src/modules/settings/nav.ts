import {
  Bell,
  BookOpen,
  Code,
  Cookie,
  Mail,
  Radio,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  Video,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { settingsTabRoute, teamTabRoute } from "@/shared/constants/routes";

// Left menu of the full-page settings layout (docs/reference/31, 34-37). Groups are separated by a
// divider; "Personal" links go to /settings, "Team" links to /team.

export interface SettingsNavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  /** Matches the `?tab=` value that makes this item active. */
  tab: string;
}

export type SettingsMode = "personal" | "team";

export const PERSONAL_NAV: ReadonlyArray<ReadonlyArray<SettingsNavItem>> = [
  [
    { label: "Profile", icon: UserRound, href: settingsTabRoute("profile"), tab: "profile" },
    {
      label: "Language & Appearance",
      icon: SlidersHorizontal,
      href: settingsTabRoute("appearance"),
      tab: "appearance",
    },
  ],
  [
    {
      label: "Recording & Privacy",
      icon: Video,
      href: settingsTabRoute("recording"),
      tab: "recording",
    },
    {
      label: "Compliance Notification",
      icon: Bell,
      href: settingsTabRoute("compliance"),
      tab: "compliance",
    },
  ],
  [{ label: "Email Assistant", icon: Mail, href: settingsTabRoute("email"), tab: "email" }],
  [
    { label: "AI Settings", icon: Wand2, href: settingsTabRoute("ai"), tab: "ai" },
    {
      label: "Live Assist",
      icon: Radio,
      href: settingsTabRoute("live-assist"),
      tab: "live-assist",
    },
    {
      label: "Knowledge Base",
      icon: BookOpen,
      href: settingsTabRoute("knowledge-base"),
      tab: "knowledge-base",
    },
  ],
  [{ label: "MCP & API", icon: Code, href: settingsTabRoute("mcp-api"), tab: "mcp-api" }],
  [{ label: "Cookies", icon: Cookie, href: settingsTabRoute("cookies"), tab: "cookies" }],
];

export const TEAM_NAV: ReadonlyArray<ReadonlyArray<SettingsNavItem>> = [
  [
    { label: "Workspace", icon: Users, href: teamTabRoute("workspace"), tab: "workspace" },
    {
      label: "Recording & Privacy",
      icon: Video,
      href: teamTabRoute("recording"),
      tab: "recording",
    },
    {
      label: "Compliance Notification",
      icon: Bell,
      href: teamTabRoute("compliance"),
      tab: "compliance",
    },
  ],
  [
    { label: "AI Settings", icon: Sparkles, href: teamTabRoute("ai"), tab: "ai" },
    { label: "Live Meeting", icon: Radio, href: teamTabRoute("live-meeting"), tab: "live-meeting" },
  ],
  [{ label: "Rules", icon: SlidersHorizontal, href: teamTabRoute("rules"), tab: "rules" }],
  [
    {
      label: "Teammates and groups",
      icon: Users,
      href: teamTabRoute("teammates"),
      tab: "teammates",
    },
  ],
];

/** Pinned under the menu in personal mode (Account in docs/reference/37). */
export const ACCOUNT_NAV_ITEM: SettingsNavItem = {
  label: "Account",
  icon: UserRound,
  href: settingsTabRoute("account"),
  tab: "account",
};
