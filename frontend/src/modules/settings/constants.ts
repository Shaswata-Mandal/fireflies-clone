/**
 * Settings tab definitions.
 *
 * WHAT: The tab ids, their labels, and the "Coming soon" icon/text for the unbuilt ones.
 * LAYER: Module constants.
 * CALLED BY: `SettingsView`, `SettingsShell`.
 */

import {
  Bell,
  BookOpen,
  Code,
  Cookie,
  Mail,
  Sparkles,
  Video,
  Radio,
  type LucideIcon,
} from "lucide-react";
import type { TabItem } from "@/shared/components/TabList";

// Tabs follow the left menu of docs/reference/31-37. Only the first three are built; the rest render
// a "Coming soon" panel.

export const SETTINGS_TAB_IDS = [
  "profile",
  "account",
  "appearance",
  "recording",
  "compliance",
  "email",
  "ai",
  "live-assist",
  "knowledge-base",
  "mcp-api",
  "cookies",
] as const;

// A union of the ids above ("profile" | "account" | ...), derived so the two never drift apart.
export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number];

export const DEFAULT_SETTINGS_TAB: SettingsTabId = "profile";

export const SETTINGS_TABS: ReadonlyArray<TabItem<SettingsTabId>> = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "appearance", label: "Language & Appearance" },
  { id: "recording", label: "Recording & Privacy", separatorBefore: true },
  { id: "compliance", label: "Compliance Notification" },
  { id: "email", label: "Email Assistant" },
  { id: "ai", label: "AI Settings" },
  { id: "live-assist", label: "Live Assist" },
  { id: "knowledge-base", label: "Knowledge Base" },
  { id: "mcp-api", label: "MCP & API" },
  { id: "cookies", label: "Cookies" },
];

interface ComingSoonTab {
  icon: LucideIcon;
  description: string;
}

/** Icon and one-liner for each unbuilt tab. */
// `Exclude<Union, "a" | "b">` removes the built tabs, so this object needs entries ONLY for the
// unbuilt ones and the compiler checks none is forgotten.
export const COMING_SOON_TABS: Record<
  Exclude<SettingsTabId, "profile" | "account" | "appearance">,
  ComingSoonTab
> = {
  recording: { icon: Video, description: "Auto-record, meeting privacy and retention rules." },
  compliance: { icon: Bell, description: "Notify participants when a meeting is recorded." },
  email: { icon: Mail, description: "Let the assistant draft follow-up emails for you." },
  ai: { icon: Sparkles, description: "Choose how summaries and action items are generated." },
  "live-assist": { icon: Radio, description: "Real-time help during live meetings." },
  "knowledge-base": { icon: BookOpen, description: "Give the assistant your own documents." },
  "mcp-api": { icon: Code, description: "API keys and MCP access to your meetings." },
  cookies: { icon: Cookie, description: "Manage cookie preferences." },
};
