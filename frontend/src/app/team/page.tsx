import { Suspense } from "react";
import { TeamView } from "@/modules/team/components/TeamView";

export default function TeamPage() {
  // TeamView reads ?tab= with useSearchParams, which needs a Suspense boundary for `next build`.
  return (
    <Suspense>
      <TeamView />
    </Suspense>
  );
}
