import { Suspense } from "react";
import { MeetingsSkeleton } from "@/modules/meetings/components/MeetingsSkeleton";
import { MeetingsView } from "@/modules/meetings/components/MeetingsView";

export default function MeetingsPage() {
  // MeetingsView reads the URL with useSearchParams, which must sit under a Suspense boundary or
  // `next build` fails for this static route. The fallback matches the loading state.
  return (
    <Suspense
      fallback={
        <div className="px-4 py-6 sm:px-6">
          <MeetingsSkeleton />
        </div>
      }
    >
      <MeetingsView />
    </Suspense>
  );
}
