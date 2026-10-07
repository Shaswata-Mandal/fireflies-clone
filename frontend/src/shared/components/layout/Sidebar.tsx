/**
 * Left navigation sidebar.
 *
 * WHAT: Renders the nav groups and footer from data, works out the active item, handles clicks.
 * LAYER: Shared layout component (client).
 * CALLED BY: `AppShell` (desktop) and `MobileNavDrawer` (`inDrawer`).
 * CALLS: `SidebarHeader`, `SidebarItem`, `NAV_GROUPS`, `useUI`, `usePathname`.
 * MERN EQUIVALENT: a `<Sidebar>` with `NavLink` items (active styling from the URL).
 */

"use client";

import { Mail } from "lucide-react";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { SidebarHeader } from "@/shared/components/layout/SidebarHeader";
import { SidebarItem } from "@/shared/components/layout/SidebarItem";
import { NAV_FOOTER, NAV_GROUPS, type NavItem } from "@/shared/constants/navigation";
import { isMeetingDetailRoute, isRouteActive } from "@/shared/constants/routes";
import { useUI } from "@/shared/context/UIContext";
import { showComingSoon } from "@/shared/utils/coming-soon";
import { cn } from "@/shared/utils/cn";

const EMAIL_ASSISTANT_LABEL = "Try Email Assistant";

interface SidebarProps {
  collapsed: boolean;
  inDrawer?: boolean;
}

// @param collapsed icon-only rail; @param inDrawer true when shown inside the mobile sheet
export function Sidebar({ collapsed, inDrawer = false }: SidebarProps) {
  const pathname = usePathname();
  const {
    toggleSidebar,
    setMobileNavOpen,
    isAskFredOpen,
    setAskFredOpen,
    meetingPanelTab,
    setMeetingPanelTab,
  } = useUI();
  // A meeting page has its own AskFred tab, so the global panel must not open on top of it.
  const isMeetingPage = isMeetingDetailRoute(pathname);

  // The active item comes from the URL (links) or from UI state (the AskFred toggle).
  function isActive(item: NavItem): boolean {
    if (item.action === "toggle-askfred") {
      return isMeetingPage ? meetingPanelTab === "askfred" : isAskFredOpen;
    }
    return item.href ? isRouteActive(pathname, item.href) : false;
  }

  function handleSelect(item: NavItem) {
    // Any choice closes the mobile drawer (a no-op on desktop), including re-clicking the current page.
    setMobileNavOpen(false);
    if (item.action === "toggle-askfred") {
      if (isMeetingPage) setMeetingPanelTab("askfred");
      else setAskFredOpen(!isAskFredOpen);
    } else if (!item.href) showComingSoon(item.label);
  }

  // One renderer for both lists (main groups and footer), so they stay consistent.
  function renderItem(item: NavItem) {
    return (
      <SidebarItem
        key={item.label}
        item={item}
        collapsed={collapsed}
        active={isActive(item)}
        onSelect={handleSelect}
      />
    );
  }

  // Tailwind: the width switches between `w-14` (rail) and `w-58`, animated by
  // `transition-[width]`; `mt-auto` on the footer block pushes it to the bottom of the column.
  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-surface transition-[width] duration-200",
        !inDrawer && "border-r",
        collapsed ? "w-14" : "w-58",
      )}
    >
      <SidebarHeader
        collapsed={collapsed}
        inDrawer={inDrawer}
        onToggle={inDrawer ? () => setMobileNavOpen(false) : toggleSidebar}
      />

      <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3">
        <ul className="flex flex-col">
          {NAV_GROUPS.map((group, index) => (
            <Fragment key={group[0].label}>
              {index > 0 && <li className="my-2 border-t" aria-hidden />}
              {group.map((item) => (
                <li key={item.label} className="flex flex-col py-0.5">
                  {renderItem(item)}
                </li>
              ))}
            </Fragment>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3 pt-6">
          {!collapsed && (
            <button
              type="button"
              onClick={() => showComingSoon(EMAIL_ASSISTANT_LABEL)}
              className="flex h-8 items-center gap-2 rounded-md bg-primary-subtle-2 px-3 text-sm font-medium text-primary hover:bg-primary-subtle"
            >
              <Mail className="size-4 text-danger" aria-hidden="true" />
              {EMAIL_ASSISTANT_LABEL}
            </button>
          )}
          <ul className="flex flex-col">
            {NAV_FOOTER.map((item) => (
              <li key={item.label} className="flex flex-col py-0.5">
                {renderItem(item)}
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
