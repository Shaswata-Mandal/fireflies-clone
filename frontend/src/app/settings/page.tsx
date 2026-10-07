import { Suspense } from "react";
import { SettingsView } from "@/modules/settings/components/SettingsView";

export default function SettingsPage() {
  // SettingsView reads ?tab= with useSearchParams, which needs a Suspense boundary for `next build`.
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
