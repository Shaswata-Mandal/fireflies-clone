"use client";

import { HostedSharedToggle } from "@/modules/meetings/components/HostedSharedToggle";
import { MeetingsFilterPopover } from "@/modules/meetings/components/MeetingsFilterPopover";
import { MeetingsSearch } from "@/modules/meetings/components/MeetingsSearch";
import { MeetingsSortMenu } from "@/modules/meetings/components/MeetingsSortMenu";
import { MEETING_VIEWS } from "@/modules/meetings/constants";
import type { MeetingsUrlState } from "@/modules/meetings/url-state";

interface MeetingsToolbarProps {
  state: MeetingsUrlState;
  onChange: (patch: Partial<MeetingsUrlState>, options?: { replace?: boolean }) => void;
}

/** The row under the navbar in 09/13/14. Wraps onto several lines on narrow screens. */
export function MeetingsToolbar({ state, onChange }: MeetingsToolbarProps) {
  return (
    <div className="flex min-h-13 flex-wrap items-center gap-2 border-b px-4 py-2.5 sm:px-6">
      {/* Screenshot 13: "All Meetings" hides the ownership toggle. */}
      {state.view === MEETING_VIEWS.MINE && (
        <>
          <HostedSharedToggle />
          <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-active sm:block" />
        </>
      )}
      <MeetingsFilterPopover state={state} onChange={onChange} />
      <MeetingsSortMenu value={state.sort} onChange={(sort) => onChange({ sort })} />
      <div className="flex w-full justify-end sm:ml-auto sm:w-auto">
        {/* Typing replaces the history entry: one Back press shouldn't undo a single letter. */}
        <MeetingsSearch value={state.q} onSearch={(q) => onChange({ q }, { replace: true })} />
      </div>
    </div>
  );
}
