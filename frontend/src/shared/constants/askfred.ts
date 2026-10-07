import { CircleHelp, FileText, Sparkles, SquareCheck, Target, type LucideIcon } from "lucide-react";

// Prompt chips copied from the screenshots.

export interface AskFredPrompt {
  label: string;
  icon: LucideIcon;
  /** Token text class for the small colored icon. */
  iconClassName: string;
}

/** Open panel, empty state (docs/reference/06). */
export const PANEL_PROMPTS: AskFredPrompt[] = [
  { label: "What's my day looking like?", icon: Sparkles, iconClassName: "text-warning" },
  { label: "Pending tasks across all meetings", icon: CircleHelp, iconClassName: "text-danger" },
  {
    label: "List out my action items from the past week",
    icon: SquareCheck,
    iconClassName: "text-success",
  },
];

/** Closed dock chip row (docs/reference/07). */
export const DOCK_PROMPTS: AskFredPrompt[] = [
  { label: "My tasks", icon: SquareCheck, iconClassName: "text-success" },
  { label: "Prep me for the day", icon: Target, iconClassName: "text-danger" },
  { label: "My last meeting", icon: FileText, iconClassName: "text-default" },
];

export const ASKFRED_PLACEHOLDERS = {
  dock: "Type / to run AI skills",
  panel: "Ask anything. Type / to run AI skills.",
} as const;

export const ASKFRED_HEADLINE = "Get ready for your meeting";

/** Context chip above the panel input (docs/reference/15). */
export const ASKFRED_CONTEXT_LABEL = "My Meetings";
