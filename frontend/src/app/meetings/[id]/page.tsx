import { Suspense } from "react";
import { MeetingDetailSkeleton } from "@/modules/meetings/components/MeetingDetailSkeleton";
import { MeetingDetailView } from "@/modules/meetings/components/MeetingDetailView";
import { MeetingNavbar } from "@/modules/meetings/components/MeetingNavbar";
import { MeetingNotFound } from "@/modules/meetings/components/MeetingNotFound";
import { parseMeetingIdParam } from "@/shared/constants/routes";

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
