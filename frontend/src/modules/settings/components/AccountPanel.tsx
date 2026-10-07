/**
 * Settings > Account tab.
 *
 * WHAT: The signed-in email and a "Delete account" card (both read-only / "Coming soon").
 * LAYER: Module component (client).
 * CALLED BY: `SettingsView`.
 * CALLS: `SettingsCard`, `UserDetailsFields`, `showComingSoon`.
 */

"use client";

import { SettingsCard } from "@/modules/settings/components/SettingsCard";
import { UserDetailsFields } from "@/modules/settings/components/UserDetailsFields";
import { showComingSoon } from "@/shared/utils/coming-soon";

const OUTLINE_BUTTON = "h-9 rounded-md border bg-surface px-4 text-sm text-default hover:bg-hover";

export function AccountPanel() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsCard title="Account" description="The email you sign in with.">
        <UserDetailsFields idPrefix="account" showName={false} saveFeature="Saving your account" />
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
