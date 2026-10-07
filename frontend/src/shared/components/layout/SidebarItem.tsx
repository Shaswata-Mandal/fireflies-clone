/**
 * One sidebar entry (link or button).
 *
 * WHAT: Renders an icon + label (or icon-only with a tooltip when collapsed), as a `<Link>` when
 *   it has an `href`, otherwise as a `<button>`.
 * LAYER: Shared layout component (client).
 * CALLED BY: `Sidebar`.
 * CALLS: `next/link`, shadcn `Tooltip`, `cn`.
 * MERN EQUIVALENT: a React Router `<NavLink>` styled as a nav item.
 */

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

// @param item the nav definition; @param active highlights it; @param onSelect click callback
export function SidebarItem({ item, collapsed, active, onSelect }: SidebarItemProps) {
  const { label, icon: Icon, iconClassName, href, badge } = item;

  // `cn` joins class groups: base look, hover/focus states, collapsed vs expanded sizing, and the
  // active highlight (the last `&&` adds classes only when `active` is true).
  const className = cn(
    "relative flex h-8 items-center gap-3 rounded-md text-sm text-default transition-colors",
    "hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    collapsed ? "w-10 justify-center self-center" : "px-2.5",
    active && "bg-active font-medium text-primary",
  );

  // The inner content is built once and reused by both the link and the button variants.
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

  // Collapsed rail shows only icons, so a tooltip supplies the label for sighted users
  // (screen-reader text is already in the `sr-only` span above).
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
