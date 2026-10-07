/**
 * Team > Teammates tab.
 *
 * WHAT: The member list (only the current user) and an Invite button that says "Coming soon".
 * LAYER: Module component (client).
 * CALLED BY: `TeamView`.
 * CALLS: `useCurrentUser`, `UserAvatar`, `ErrorState`.
 * There is a single user (no real auth), so "teammates" is a list of one.
 */

"use client";

import { Plus } from "lucide-react";
import { OWNER_ROLE } from "@/modules/team/constants";
import { useCurrentUser } from "@/modules/settings/hooks";
import { ErrorState } from "@/shared/components/ErrorState";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { UserAvatar } from "@/shared/components/UserAvatar";
import { showComingSoon } from "@/shared/utils/coming-soon";

/** Teammates list (docs/reference/36): just the current user, plus an Invite button that says "Coming soon". */
export function TeammatesPanel() {
  const { data: user, isPending, isError, error, refetch, isRefetching } = useCurrentUser();

  // Maps the query status to one body: loading, error, or the member row.
  function renderMember() {
    if (isPending) {
      return (
        <div role="status" aria-label="Loading teammates" className="flex items-center gap-3 p-4">
          <Skeleton className="size-8" />
          <Skeleton className="h-4 w-48" />
        </div>
      );
    }
    if (isError) {
      return (
        <ErrorState
          title="Couldn't load teammates"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
          className="border-0"
        />
      );
    }
    return (
      <ul>
        <li className="flex items-center gap-3 p-4">
          <UserAvatar name={user.name} avatarUrl={user.avatar_url} className="size-8 text-sm" />
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 text-sm font-medium text-primary">
              <span className="truncate">{user.name}</span>
              <span className="rounded bg-primary-subtle-2 px-1.5 text-xs font-medium text-primary-fg">
                {OWNER_ROLE}
              </span>
            </span>
            <span className="truncate text-xs text-muted">{user.email}</span>
          </div>
        </li>
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium text-primary">All teammates (1)</h2>
        <button
          type="button"
          onClick={() => showComingSoon("Inviting teammates")}
          className="flex h-9 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-medium text-on-primary hover:bg-primary-700"
        >
          <Plus className="size-4" aria-hidden="true" />
          Invite teammate
        </button>
      </div>
      <div className="rounded-xl border bg-card">{renderMember()}</div>
    </section>
  );
}
