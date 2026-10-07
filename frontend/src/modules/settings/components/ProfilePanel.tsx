/**
 * Settings > Profile tab.
 *
 * WHAT: A card with the user's name and email (read-only).
 * LAYER: Module component (server-safe wrapper around a client child).
 * CALLED BY: `SettingsView`.
 * CALLS: `SettingsCard`, `UserDetailsFields`.
 */

import { SettingsCard } from "@/modules/settings/components/SettingsCard";
import { UserDetailsFields } from "@/modules/settings/components/UserDetailsFields";

export function ProfilePanel() {
  return (
    <SettingsCard title="Profile" description="How you appear to teammates.">
      <UserDetailsFields idPrefix="profile" showName saveFeature="Saving your profile" />
    </SettingsCard>
  );
}
