"use client";

import { Building2 } from "lucide-react";
import { SettingsCard } from "@/modules/settings/components/SettingsCard";
import { useCurrentUser } from "@/modules/settings/hooks";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { showComingSoon } from "@/shared/utils/coming-soon";

const OUTLINE_BUTTON = "h-9 rounded-md border bg-surface px-4 text-sm text-default hover:bg-hover";

/** Workspace (docs/reference/35): team card plus the Leave / Delete account actions. */
export function WorkspacePanel() {
  const { data: user, isPending } = useCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center gap-4 rounded-xl border bg-card p-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary-fg">
          <Building2 className="size-6" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          {isPending ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <h1 className="truncate text-base font-medium text-primary">
              {user ? `${user.name}'s Team` : "My Team"}
            </h1>
          )}
          <p className="text-sm text-secondary">1 member</p>
        </div>
      </section>

      <h2 className="text-sm text-secondary">Accounts</h2>
      <SettingsCard
        title="Leave team"
        description="You're the team owner. After leaving the team, you'll be downgraded to the free plan."
      >
        <div>
          <button
            type="button"
            onClick={() => showComingSoon("Leaving the team")}
            className={OUTLINE_BUTTON}
          >
            Leave team
          </button>
        </div>
      </SettingsCard>
      <SettingsCard
        title="Delete account"
        description="Permanently delete all your data, including meetings, summaries and action items."
      >
        <div>
          <button
            type="button"
            onClick={() => showComingSoon("Deleting your account")}
            className={OUTLINE_BUTTON}
          >
            Delete my account
          </button>
        </div>
      </SettingsCard>
    </div>
  );
}
