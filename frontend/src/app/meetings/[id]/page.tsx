/**
 * Route `/meetings/[id]` (a dynamic segment).
 *
 * WHAT: Validates the id from the URL, then renders the meeting detail screen.
 * LAYER: App Router page (an `async` SERVER component, so it can `await params`).
 * CALLED BY: Next.js, for URLs like `/meetings/12`. The folder name `[id]` is the parameter name.
 * CALLS: `parseMeetingIdParam`, `MeetingDetailView`, `MeetingNotFound`.
 * MERN EQUIVALENT: `<Route path="/meetings/:id">` plus `const { id } = useParams()`.
 */

import { Suspense } from "react";
import { MeetingDetailSkeleton } from "@/modules/meetings/components/MeetingDetailSkeleton";
import { MeetingDetailView } from "@/modules/meetings/components/MeetingDetailView";
import { MeetingNavbar } from "@/modules/meetings/components/MeetingNavbar";
import { MeetingNotFound } from "@/modules/meetings/components/MeetingNotFound";
import { parseMeetingIdParam } from "@/shared/constants/routes";

// `PageProps<"/meetings/[id]">` is a global Next.js type; in this version `params` is a Promise,
// hence the `await`. A bad id ("abc", "0") shows "not found" without calling the API at all.
export default async function MeetingDetailPage({ params }: PageProps<"/meetings/[id]">) {
  const meetingId = parseMeetingIdParam((await params).id);
  if (meetingId === null) {
    return (
      <>
        <MeetingNavbar meeting={null} />
        <MeetingNotFound />
      </>
    );
  }

  // useSearchParams (the ?t= deep link) needs a Suspense boundary. `key` remounts everything,
  // including the player, when navigating from one meeting straight to another.
  return (
    <Suspense fallback={<MeetingDetailSkeleton />}>
      <MeetingDetailView key={meetingId} meetingId={meetingId} />
    </Suspense>
  );
}
