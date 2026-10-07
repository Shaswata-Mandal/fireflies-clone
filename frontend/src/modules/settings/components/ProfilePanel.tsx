import { SettingsCard } from "@/modules/settings/components/SettingsCard";
import { UserDetailsFields } from "@/modules/settings/components/UserDetailsFields";

export function ProfilePanel() {
  return (
    <SettingsCard title="Profile" description="How you appear to teammates.">
      <UserDetailsFields idPrefix="profile" showName saveFeature="Saving your profile" />
    </SettingsCard>
  );
}
