/**
 * Top bar.
 *
 * WHAT: Hamburger (small screens), section title, search, Upgrade, notifications and Upload.
 * LAYER: Shared layout component (client).
 * CALLED BY: `AppShell`.
 * CALLS: `NavbarSearch`, `NotificationsPopover`, `CaptureButton`, `useRouteTitle`, `useUI`.
 * MERN EQUIVALENT: a `<Header>` / `<AppBar>` component.
 */

"use client";

import { Menu } from "lucide-react";
import { IconButton } from "@/shared/components/IconButton";
import { CaptureButton } from "@/shared/components/layout/CaptureButton";
import { NavbarSearch } from "@/shared/components/layout/NavbarSearch";
import { NotificationsPopover } from "@/shared/components/layout/NotificationsPopover";
import { useUI } from "@/shared/context/UIContext";
import { useRouteTitle } from "@/shared/hooks/use-route-title";
import { showComingSoon } from "@/shared/utils/coming-soon";

const UPGRADE_LABEL = "Upgrade";

/** Top bar (docs/reference/03): section title, search, Upgrade, bell, Capture. */
export function Navbar() {
  // Only the setter is needed here: this component never re-renders because of drawer state.
  const { setMobileNavOpen } = useUI();
  const title = useRouteTitle();

  return (
    <header className="flex h-13 shrink-0 items-center gap-3 border-b bg-surface px-3 sm:px-4">
      <IconButton
        label="Open navigation"
        onClick={() => setMobileNavOpen(true)}
        className="lg:hidden"
      >
        <Menu className="size-5" />
      </IconButton>

      {/* Fixed width so the search stays put across pages, like the Fireflies breadcrumb column. */}
      <p className="min-w-0 truncate text-base text-primary md:w-40 md:shrink-0">{title}</p>

      <div className="flex flex-1 justify-center">
        <NavbarSearch />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => showComingSoon(UPGRADE_LABEL)}
          className="hidden h-8 items-center rounded-md bg-success-btn px-3 text-sm font-medium text-success-btn-fg hover:brightness-125 sm:flex"
        >
          {UPGRADE_LABEL}
        </button>
        <span className="hidden h-6 border-l sm:block" aria-hidden="true" />
        <NotificationsPopover />
        <CaptureButton />
      </div>
    </header>
  );
}
