"use client";

import { ChevronsLeft } from "lucide-react";
import { SmartSearchSection } from "@/modules/meetings/components/SmartSearchSection";
import {
  getSmartFilters,
  getSpeakerTalktime,
  type SmartFilter,
  type Talktime,
} from "@/modules/meetings/smart-search";
import type { MeetingDetail } from "@/modules/meetings/types";
import { useActionItems } from "@/modules/action-items/hooks";
import { useTranscript } from "@/modules/transcript/hooks";
import { IconButton } from "@/shared/components/IconButton";

interface SmartSearchPanelProps {
  meeting: MeetingDetail;
  onCollapse: () => void;
}

const SENTIMENTS = ["Positive", "Neutral", "Negative"] as const;
const NO_DATA = "–";
const DOT = "size-1.5 shrink-0 rounded-full bg-current";

function FilterTiles({ filters }: { filters: SmartFilter[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {filters.map(({ id, label, count, dotClass }) => (
        <li
          key={id}
          className="flex items-center gap-2 rounded-lg border bg-card px-3 py-4 text-sm"
        >
          <span aria-hidden="true" className={`${DOT} ${dotClass}`} />
          <span className="min-w-0 flex-1 truncate text-default">{label}</span>
          <span className="text-muted tabular-nums">{count}</span>
        </li>
      ))}
    </ul>
  );
}

function SpeakerBars({ talktime }: { talktime: Talktime[] }) {
  if (talktime.length === 0) return <p className="text-sm text-muted">No speaking time yet.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {talktime.map(({ speaker, percent }) => (
        <li key={speaker} className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-default">
            <span className="truncate">{speaker}</span>
            <span className="text-muted tabular-nums">{percent}%</span>
          </div>
          <div
            role="meter"
            aria-label={`${speaker} talk time`}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 rounded-full bg-active"
          >
            <div className="h-full rounded-full bg-primary-600" style={{ width: `${percent}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Left column of the meeting page (docs/reference/17): collapsible sections about this meeting.
 * Counts come from the transcript and action items already cached by the other panels.
 */
export function SmartSearchPanel({ meeting, onCollapse }: SmartSearchPanelProps) {
  const { data: transcript } = useTranscript(meeting.id);
  const { data: actionItems } = useActionItems(meeting.id);
  const segments = transcript?.segments ?? [];

  const filters = getSmartFilters({
    segments,
    taskCount: actionItems?.length ?? 0,
    topicCount: meeting.summary?.keywords.length ?? 0,
  });

  return (
    <aside
      aria-label="Smart Search"
      className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r bg-page lg:flex xl:w-[400px]"
    >
      <div className="flex h-13 shrink-0 items-center justify-between border-b pr-3 pl-5">
        <h2 className="text-base text-primary">Smart Search</h2>
        <IconButton label="Collapse Smart Search" onClick={onCollapse}>
          <ChevronsLeft />
        </IconButton>
      </div>

      <SmartSearchSection title="AI Filters" defaultOpen>
        <FilterTiles filters={filters} />
      </SmartSearchSection>
      <SmartSearchSection title="Sentiments">
        <ul className="flex flex-col gap-3">
          {SENTIMENTS.map((label) => (
            <li
              key={label}
              className="flex items-center justify-between rounded-lg border bg-card px-3 py-4 text-sm"
            >
              <span className="text-default">{label}</span>
              {/* No sentiment analysis exists, so show "no data" rather than a fake 0. */}
              <span className="text-muted">{NO_DATA}</span>
            </li>
          ))}
        </ul>
      </SmartSearchSection>
      <SmartSearchSection title="Speaker Talktime">
        <SpeakerBars talktime={getSpeakerTalktime(segments)} />
      </SmartSearchSection>
      <SmartSearchSection title="Topic Trackers">
        <p className="text-sm text-muted">Topic trackers are coming soon.</p>
      </SmartSearchSection>
    </aside>
  );
}
