/**
 * Integrations data.
 *
 * WHAT: Tab ids, tab labels and the list of placeholder integrations.
 * LAYER: Module constants (data).
 * CALLED BY: the Integrations components.
 */

import {
  Building2,
  Calendar,
  Cloud,
  Hash,
  Users,
  Video,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { TabItem } from "@/shared/components/TabList";

// Generic icons instead of brand logos: nothing here connects to anything (CLAUDE.md §1, out of scope).

export const INTEGRATION_TAB_IDS = ["discover", "connected"] as const;
export type IntegrationTabId = (typeof INTEGRATION_TAB_IDS)[number];
export const DEFAULT_INTEGRATION_TAB: IntegrationTabId = "discover";

export const INTEGRATION_TABS: ReadonlyArray<TabItem<IntegrationTabId>> = [
  { id: "discover", label: "Discover" },
  { id: "connected", label: "Connected" },
];

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const INTEGRATIONS: ReadonlyArray<Integration> = [
  {
    id: "zoom",
    name: "Zoom",
    description: "Automatically capture, transcribe and summarize your Zoom calls.",
    icon: Video,
  },
  {
    id: "google-meet",
    name: "Google Meet",
    description: "Record and take notes in every Google Meet you join.",
    icon: Video,
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    description: "Bring meeting notes from Microsoft Teams into your library.",
    icon: Users,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Share summaries and action items to a Slack channel.",
    icon: Hash,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Join meetings from your calendar automatically.",
    icon: Calendar,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Push meeting notes and tasks to your Salesforce records.",
    icon: Cloud,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync meeting data to contacts and deals in HubSpot.",
    icon: Workflow,
  },
];

export const CONNECTED_EMPTY = {
  title: "No connected integrations",
  body: "Apps you connect will appear here.",
  icon: Building2,
} as const;
