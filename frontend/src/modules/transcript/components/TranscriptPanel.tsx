"use client";

import { useState } from "react";
import type { ParticipantBrief } from "@/modules/meetings/types";
import { TranscriptEmptyState } from "@/modules/transcript/components/TranscriptEmptyState";
import { TranscriptList } from "@/modules/transcript/components/TranscriptList";
import { TranscriptSkeleton } from "@/modules/transcript/components/TranscriptSkeleton";
import { TRANSCRIPT_COPY } from "@/modules/transcript/constants";
import { useTranscript } from "@/modules/transcript/hooks";
import { ComingSoonPanel } from "@/shared/components/ComingSoonPanel";
import { ErrorState } from "@/shared/components/ErrorState";
import { FredMark } from "@/shared/components/FredMark";
import {
  TabList,
  tabElementId,
  tabPanelElementId,
  type TabItem,
} from "@/shared/components/TabList";
import { ASKFRED_COMING_SOON } from "@/shared/constants/messages";

interface TranscriptPanelProps {
  meetingId: number;
  participants: ParticipantBrief[];
}

type RightTab = "askfred" | "transcript";

const ID_PREFIX = "right-panel";

const TABS: ReadonlyArray<TabItem<RightTab>> = [
  { id: "askfred", label: "AskFred", icon: <FredMark className="size-4" /> },
  { id: "transcript", label: "Transcript" },
];

/**
 * Right panel (≈430px in 17/19): AskFred | Transcript tabs. AskFred is a placeholder, so the panel
 * opens on Transcript. The transcript stays mounted while hidden, keeping its search and scroll.
 */
export function TranscriptPanel({ meetingId, participants }: TranscriptPanelProps) {
  const [activeTab, setActiveTab] = useState<RightTab>("transcript");
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

      {activeTab === "askfred" && (
        <div
          role="tabpanel"
          id={tabPanelElementId(ID_PREFIX, "askfred")}
          aria-labelledby={tabElementId(ID_PREFIX, "askfred")}
          className="overflow-y-auto"
        >
          <ComingSoonPanel icon={FredMark} title="AskFred" description={ASKFRED_COMING_SOON} />
        </div>
      )}

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
