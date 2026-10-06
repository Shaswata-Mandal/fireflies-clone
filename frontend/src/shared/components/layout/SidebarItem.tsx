"use client";

import Link from "next/link";
import type { NavItem } from "@/shared/constants/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";

interface SidebarItemProps {
  item: NavItem;
  collapsed: boolean;
  /** Current page (links) or open panel (AskFred toggle). */
  active: boolean;
  onSelect: (item: NavItem) => void;
}

export function SidebarItem({ item, collapsed, active, onSelect }: SidebarItemProps) {
  const { label, icon: Icon, iconClassName, href, badge } = item;

  const className = cn(
    "relative flex h-8 items-center gap-3 rounded-md text-sm text-default transition-colors",
    "hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    collapsed ? "w-10 justify-center self-center" : "px-2.5",
    active && "bg-active font-medium text-primary",
  );

  const content = (
    <>
      <Icon className={cn("size-4 shrink-0", iconClassName)} aria-hidden="true" />
      {collapsed ? (
        <>
          <span className="sr-only">{label}</span>
          {badge && (
            <span
              className="absolute top-1.5 right-2 size-1.5 rounded-full bg-success"
              aria-hidden
            />
          )}
        </>
      ) : (
        <>
          <span className="truncate">{label}</span>
          {badge && (
            <span className="ml-auto rounded bg-success-subtle px-1.5 py-0.5 text-xs font-medium text-success">
              {badge}
            </span>
          )}
        </>
      )}
    </>
  );

  const element = href ? (
    <Link
      href={href}
      className={className}
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(item)}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      className={className}
      // Only toggles (AskFred) have an on/off state; "coming soon" buttons don't.
      aria-pressed={item.action ? active : undefined}
      onClick={() => onSelect(item)}
    >
      {content}
    </button>
  );

  if (!collapsed) return element;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{element}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {badge ? `${label} · ${badge}` : label}
      </TooltipContent>
    </Tooltip>
  );
}
