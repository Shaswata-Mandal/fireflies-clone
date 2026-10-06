import {
  Bot,
  Calendar,
  ChartNoAxesColumn,
  House,
  Layers,
  ListTodo,
  Mic,
  Settings,
  Sparkle,
  Upload,
  Video,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import { FredMark } from "@/shared/components/FredMark";
import { ROUTES } from "@/shared/constants/routes";

// Sidebar items in the order of docs/reference/01-shell-sidebar-expanded. Items without `href` are
// out of scope and show a "Coming soon" toast; `action` items are handled by the Sidebar itself.

export type NavAction = "toggle-askfred";

export interface NavItem {
  label: string;
  /** Lucide icon or our own SVG mark; both accept className. */
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
  href?: string;
  action?: NavAction;
  /** Small chip after the label ("40% OFF"); a dot replaces it in the collapsed rail. */
  badge?: string;
}

/** Groups are separated by a divider. */
export const NAV_GROUPS: NavItem[][] = [
  [
    { label: "Home", icon: House, href: ROUTES.HOME },
    {
      label: "AskFred",
      icon: FredMark,
      iconClassName: "text-primary-fg",
      action: "toggle-askfred",
    },
  ],
  [
    { label: "Meetings", icon: Video, href: ROUTES.MEETINGS },
    { label: "Tasks", icon: ListTodo, href: ROUTES.TASKS },
    { label: "AI Skills", icon: Sparkle },
  ],
  [
    { label: "Analytics", icon: ChartNoAxesColumn, href: ROUTES.ANALYTICS },
    { label: "Voice Agents", icon: Bot },
  ],
  [{ label: "Upgrade", icon: Zap, badge: "40% OFF" }],
];

export const NAV_FOOTER: NavItem[] = [
  { label: "Integrations", icon: Layers, href: ROUTES.INTEGRATIONS },
  { label: "Settings", icon: Settings, href: ROUTES.SETTINGS },
];

// Account menu (docs/reference/04-shell-avatar-menu), left column item list. Items without `href`
// show a "Coming soon" toast; plan/storage and promo blocks are billing and out of scope.
export interface AccountMenuItem {
  label: string;
  href?: string;
}

export const ACCOUNT_MENU_ITEMS: AccountMenuItem[] = [
  { label: "Playlist" },
  { label: "Settings", href: ROUTES.SETTINGS },
  { label: "My Team", href: ROUTES.TEAM },
  { label: "Manage Web Logins" },
  { label: "Platform Rules" },
];

// Capture split-button dropdown (docs/reference/27-upload-popup). Only uploads exist in this app.
export const CAPTURE_MENU_ITEMS: NavItem[] = [
  { label: "Add to live meeting", icon: Video },
  { label: "Schedule new meeting", icon: Calendar },
  { label: "Upload audio or video", icon: Upload, href: ROUTES.UPLOADS },
  { label: "Start recording", icon: Mic },
];
