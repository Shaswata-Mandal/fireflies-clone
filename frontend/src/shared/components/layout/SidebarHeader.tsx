"use client";

import { PanelLeft, X } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import { AvatarMenu } from "@/shared/components/layout/AvatarMenu";
import { cn } from "@/shared/utils/cn";

interface SidebarHeaderProps {
  collapsed: boolean;
  /** In the mobile drawer the toggle becomes a close button. */
  inDrawer: boolean;
  onToggle: () => void;
}

/** Top row, same height as the navbar: account menu + collapse toggle (01), toggle only (02). */
export function SidebarHeader({ collapsed, inDrawer, onToggle }: SidebarHeaderProps) {
  const toggleLabel = inDrawer
    ? "Close navigation"
    : collapsed
      ? "Expand sidebar"
      : "Collapse sidebar";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1",
        collapsed ? "flex-col pt-2.5 pb-2" : "h-13 px-2",
      )}
    >
      {!collapsed && <AvatarMenu collapsed={false} />}
      <IconButton
        label={toggleLabel}
        aria-expanded={inDrawer ? undefined : !collapsed}
        onClick={onToggle}
      >
        {inDrawer ? <X /> : <PanelLeft />}
      </IconButton>
      {/* The rail in 02 has no account trigger; an avatar-only one keeps the menu reachable. */}
      {collapsed && <AvatarMenu collapsed />}
    </div>
  );
}
