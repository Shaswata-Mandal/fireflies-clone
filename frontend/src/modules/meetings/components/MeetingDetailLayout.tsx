/**
 * Layout of the meeting page.
 *
 * WHAT: Arranges navbar, tool rail, Smart Search, notes column, transcript panel and player bar.
 * LAYER: Module component (client).
 * CALLED BY: `MeetingDetailView` (inside the PlayerProvider).
 * CALLS: `MeetingNavbar`, `MeetingRail`, `SmartSearchPanel`, `MeetingNotes`, `TranscriptPanel`,
 *   `PlayerBar`, `useDeepLinkSeek`.
 * MERN EQUIVALENT: a page-level layout component composing several panels.
 */

"use client";

import { useState } from "react";
import { MeetingHeader } from "@/modules/meetings/components/MeetingHeader";
import { MeetingNavbar } from "@/modules/meetings/components/MeetingNavbar";
import { MeetingRail } from "@/modules/meetings/components/MeetingRail";
import { SmartSearchPanel } from "@/modules/meetings/components/SmartSearchPanel";
import { MeetingNotes } from "@/modules/meetings/components/MeetingNotes";
import type { MeetingDetail } from "@/modules/meetings/types";
import { MediaSurface } from "@/modules/player/components/MediaSurface";
import { PlayerBar } from "@/modules/player/components/PlayerBar";
import { useDeepLinkSeek } from "@/modules/player/use-deep-link-seek";
import { TranscriptPanel } from "@/modules/transcript/components/TranscriptPanel";
import { useTranscript } from "@/modules/transcript/hooks";

interface MeetingDetailLayoutProps {
  meeting: MeetingDetail;
}

/**
 * Page shell from 17/21, inside the PlayerProvider:
 *   [centre: video (toggle) + header + notes tabs] | [transcript ≈430px]
 *   [player bar, full width]
 * Centre and transcript scroll independently; the player stays at the bottom.
 */
export function MeetingDetailLayout({ meeting }: MeetingDetailLayoutProps) {
  const [isVideoVisible, setVideoVisible] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(true);
  // Same query as the panel (deduped by TanStack Query); only used to know when data is in.
  // INTERVIEW: two components calling the same hook with the same key share ONE request.
  const transcript = useTranscript(meeting.id);
  useDeepLinkSeek(!transcript.isPending);

  return (
    <div className="flex h-full flex-col">
      <MeetingNavbar meeting={meeting} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <MeetingRail
          isSearchOpen={isSearchOpen}
          onToggleSearch={() => setSearchOpen((open) => !open)}
        />
        {isSearchOpen && (
          <SmartSearchPanel meeting={meeting} onCollapse={() => setSearchOpen(false)} />
        )}
        <div className="min-w-0 flex-1 lg:overflow-y-auto">
          <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
            <MediaSurface isVisible={isVideoVisible} />
            <MeetingHeader
              meeting={meeting}
              isVideoVisible={isVideoVisible}
              onToggleVideo={() => setVideoVisible((visible) => !visible)}
            />
            <MeetingNotes meeting={meeting} />
          </div>
        </div>
        <TranscriptPanel meetingId={meeting.id} participants={meeting.participants} />
      </div>
      <PlayerBar />
    </div>
  );
}
