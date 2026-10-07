/**
 * Right-hand panel of the meeting page.
 *
 * WHAT: Tabs for AskFred and Transcript; the transcript tab shows skeleton, error, empty state
 *   or the list.
 * LAYER: Module component (client).
 * CALLED BY: `MeetingDetailLayout`.
 * CALLS: `useTranscript`, `TranscriptList`, `AskMeetingPanel`, `TabList`, `useUI`.
 * INTERVIEW: both tab panels stay MOUNTED and are only hidden (`hidden` attribute), so switching
 * tabs does not lose the chat history or the transcript's scroll position and search.
 */

"use client";

import { AskMeetingPanel } from "@/modules/meetings/components/AskMeetingPanel";
import type { ParticipantBrief } from "@/modules/meetings/types";
import { TranscriptEmptyState } from "@/modules/transcript/components/TranscriptEmptyState";
import { TranscriptList } from "@/modules/transcript/components/TranscriptList";
import { TranscriptSkeleton } from "@/modules/transcript/components/TranscriptSkeleton";
import { TRANSCRIPT_COPY } from "@/modules/transcript/constants";
import { useTranscript } from "@/modules/transcript/hooks";
import { ErrorState } from "@/shared/components/ErrorState";
import { useUI, type MeetingPanelTab } from "@/shared/context/UIContext";
import { FredMark } from "@/shared/components/FredMark";
import {
  TabList,
  tabElementId,
  tabPanelElementId,
  type TabItem,
} from "@/shared/components/TabList";

interface TranscriptPanelProps {
  meetingId: number;
  participants: ParticipantBrief[];
}

const ID_PREFIX = "right-panel";

// Defined outside the component so the array is created once, not on every render.
const TABS: ReadonlyArray<TabItem<MeetingPanelTab>> = [
  { id: "askfred", label: "AskFred", icon: <FredMark className="size-4" /> },
  { id: "transcript", label: "Transcript" },
];

/**
 * Right panel (≈430px in 17/19): AskFred | Transcript tabs; opens on AskFred (17). Both panels stay
 * mounted while hidden, so the transcript keeps its search/scroll and the chat keeps its messages.
 */
export function TranscriptPanel({ meetingId, participants }: TranscriptPanelProps) {
  // The selected tab lives in UIContext (not local state), because the sidebar's AskFred button
  // also selects it.
  const { meetingPanelTab: activeTab, setMeetingPanelTab: setActiveTab } = useUI();
  // The transcript tab below shows exactly one of four states of this query: loading, error,
  // empty, or loaded.
  const { data, error, isPending, isError, refetch, isRefetching } = useTranscript(meetingId);

  return (
    <aside
      aria-label="Transcript"
      className="flex h-[60vh] min-h-0 flex-col border-t bg-page lg:h-auto lg:w-[430px] lg:shrink-0 lg:border-t-0 lg:border-l"
    >
      <div className="flex h-13 shrink-0 items-end border-b px-6">
        <TabList
          tabs={TABS}
          activeId={activeTab}
          onChange={setActiveTab}
          idPrefix={ID_PREFIX}
          label="Side panel"
          variant="underline"
        />
      </div>

      <div
        role="tabpanel"
        id={tabPanelElementId(ID_PREFIX, "askfred")}
        aria-labelledby={tabElementId(ID_PREFIX, "askfred")}
        hidden={activeTab !== "askfred"}
        className="flex min-h-0 flex-1 flex-col"
      >
        <AskMeetingPanel key={meetingId} meetingId={meetingId} />
      </div>

      <div
        role="tabpanel"
        id={tabPanelElementId(ID_PREFIX, "transcript")}
        aria-labelledby={tabElementId(ID_PREFIX, "transcript")}
        hidden={activeTab !== "transcript"}
        className="flex min-h-0 flex-1 flex-col"
      >
        {isPending && <TranscriptSkeleton />}
        {isError && (
          <div className="p-4">
            <ErrorState
              title={TRANSCRIPT_COPY.ERROR_TITLE}
              error={error}
              onRetry={() => void refetch()}
              isRetrying={isRefetching}
            />
          </div>
        )}
        {data && data.segments.length === 0 && <TranscriptEmptyState />}
        {data && data.segments.length > 0 && (
          <TranscriptList segments={data.segments} participants={participants} />
        )}
      </div>
    </aside>
  );
}
