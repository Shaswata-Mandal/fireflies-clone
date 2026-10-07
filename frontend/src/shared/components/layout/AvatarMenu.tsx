/**
 * Account menu (avatar + name dropdown) in the sidebar header.
 *
 * WHAT: Shows the current user, links to Settings/Team/Theme, and "Coming soon" entries.
 * LAYER: Shared layout component (client: data hook + dropdown state).
 * CALLED BY: `SidebarHeader`.
 * CALLS: `useCurrentUser` (settings module), `useTheme`, shadcn `DropdownMenu`, `ACCOUNT_MENU_ITEMS`.
 * MERN EQUIVALENT: a user dropdown fed by `GET /me` through a data hook.
 */

"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/modules/settings/hooks";
import { UserAvatar } from "@/shared/components/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ACCOUNT_MENU_ITEMS } from "@/shared/constants/navigation";
import { settingsTabRoute } from "@/shared/constants/routes";
import { useTheme } from "@/shared/context/ThemeContext";
import { showComingSoon } from "@/shared/utils/coming-soon";
import { cn } from "@/shared/utils/cn";

interface AvatarMenuProps {
  /** Rail mode: avatar only, no name. */
  collapsed: boolean;
}

const FALLBACK_NAME = "Account";
// Shared Tailwind classes for every menu row, so the rows look identical.
const ITEM_CLASS = "text-default focus:bg-hover px-3 py-2 text-sm";

/** Account menu from docs/reference/04 (left column): greeting, email, account links, logout. */
export function AvatarMenu({ collapsed }: AvatarMenuProps) {
  // INTERVIEW: TanStack Query returns `data`, `isPending` (no data yet) and `isError`; this
  // component handles loading with a skeleton and tolerates errors by falling back to defaults.
  const { data: user, isPending } = useCurrentUser();
  const { theme } = useTheme();

  if (isPending) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2" aria-busy="true">
        <Skeleton className="size-6 rounded-sm" />
        {!collapsed && <Skeleton className="h-4 flex-1" />}
        <span className="sr-only">Loading account</span>
      </div>
    );
  }

  // On error `user` is undefined: the avatar falls back to "?" and the menu still works.
  const name = user?.name ?? FALLBACK_NAME;

  // `group` + `group-data-[state=open]:rotate-180` rotates the chevron while the Radix menu is
  // open. Menu rows come from data: an item with `href` is a link, otherwise a "Coming soon" toast.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${name}`}
        className={cn(
          "group flex h-9 min-w-0 items-center gap-2 rounded-md hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          collapsed ? "w-10 justify-center" : "flex-1 px-2",
        )}
      >
        <UserAvatar name={user?.name} avatarUrl={user?.avatar_url} />
        {!collapsed && (
          <>
            <span className="truncate text-base font-medium text-primary">{name}</span>
            <ChevronDown
              className="size-4 shrink-0 text-secondary transition-transform group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 bg-surface p-0">
        <div className="px-3 py-3">
          <p className="truncate text-base font-medium text-primary">Hi {name}</p>
          {user && <p className="truncate text-xs text-muted">{user.email}</p>}
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />
        <div className="p-1">
          {ACCOUNT_MENU_ITEMS.map((item) =>
            item.href ? (
              <DropdownMenuItem key={item.label} asChild className={ITEM_CLASS}>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={item.label}
                className={ITEM_CLASS}
                onSelect={() => showComingSoon(item.label)}
              >
                {item.label}
              </DropdownMenuItem>
            ),
          )}
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href={settingsTabRoute("appearance")}>
              Theme
              <span className="rounded bg-primary-subtle-2 px-1.5 text-xs font-medium text-primary-fg">
                BETA
              </span>
              <span className="ml-auto text-xs text-muted capitalize">{theme}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onSelect={() => showComingSoon("Logout")}>
            Logout
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
