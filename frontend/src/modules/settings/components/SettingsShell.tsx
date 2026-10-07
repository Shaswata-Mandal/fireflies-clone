/**
 * Full-page layout for Settings and Team.
 *
 * WHAT: A left menu (user, Personal/Team switch, grouped links) next to the content area.
 * LAYER: Module component (client).
 * CALLED BY: `SettingsView` and `TeamView`.
 * CALLS: `useCurrentUser`, the nav definitions, `UserAvatar`.
 * INTERVIEW: `AppShell` renders these routes WITHOUT the main sidebar/navbar
 * (`isFullPageRoute`), so this shell supplies its own menu.
 */

"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ACCOUNT_NAV_ITEM,
  PERSONAL_NAV,
  TEAM_NAV,
  type SettingsMode,
  type SettingsNavItem,
} from "@/modules/settings/nav";
import { useCurrentUser } from "@/modules/settings/hooks";
import { UserAvatar } from "@/shared/components/UserAvatar";
import { ROUTES } from "@/shared/constants/routes";
import { cn } from "@/shared/utils/cn";

interface SettingsShellProps {
  mode: SettingsMode;
  /** Active `?tab=` value. */
  activeTab: string;
  children: ReactNode;
}

const NAV_LINK =
  "flex h-9 items-center gap-3 rounded-md px-3 text-sm text-default hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** One menu link. `aria-current="page"` tells screen readers which item is the current one. */
function NavLink({ item, active }: { item: SettingsNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(NAV_LINK, active && "bg-active font-medium text-primary")}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/**
 * Full-page settings layout (docs/reference/31-37): the app sidebar is replaced by a settings menu
 * with a Personal / Team switch. Used by /settings and /team.
 */
export function SettingsShell({ mode, activeTab, children }: SettingsShellProps) {
  const { data: user } = useCurrentUser();
  const groups = mode === "personal" ? PERSONAL_NAV : TEAM_NAV;
  // A small helper that returns the classes of the Personal/Team switch buttons.
  const switchClass = (active: boolean) =>
    cn(
      "flex-1 rounded-md py-1.5 text-center text-sm text-secondary hover:text-primary",
      active && "bg-segment-active font-medium text-primary",
    );

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 border-b bg-surface p-3 lg:w-60 lg:border-r lg:border-b-0">
        <Link
          href={ROUTES.HOME}
          aria-label="Back to Home"
          className="flex size-8 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>

        <div className="flex items-center gap-3 px-1">
          <UserAvatar name={user?.name} avatarUrl={user?.avatar_url} className="size-8 text-sm" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-primary">
              {user?.email ?? "Account"}
            </span>
            <span className="text-xs text-muted">Free Plan</span>
          </div>
        </div>

        <div className="flex gap-1 rounded-lg bg-hover p-1">
          <Link href={ROUTES.SETTINGS} className={switchClass(mode === "personal")}>
            Personal
          </Link>
          <Link href={ROUTES.TEAM} className={switchClass(mode === "team")}>
            Team
          </Link>
        </div>

        <nav aria-label="Settings sections" className="flex flex-col">
          {groups.map((group, index) => (
            <div key={group[0].tab} className={cn("flex flex-col py-1", index > 0 && "border-t")}>
              {group.map((item) => (
                <NavLink key={item.tab} item={item} active={item.tab === activeTab} />
              ))}
            </div>
          ))}
        </nav>

        {mode === "personal" && (
          <div className="mt-auto border-t pt-2">
            <NavLink item={ACCOUNT_NAV_ITEM} active={ACCOUNT_NAV_ITEM.tab === activeTab} />
          </div>
        )}
      </aside>

      <main id="main-content" className="min-w-0 flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-164 flex-col gap-3">{children}</div>
      </main>
    </div>
  );
}
