/**
 * Filters popover (participants and date range).
 *
 * WHAT: A two-pane popover: category list on the left, the chosen filter's controls on the right.
 * LAYER: Module component (client: open pane state, Radix popover).
 * CALLED BY: `MeetingsToolbar`.
 * CALLS: `FilterParticipantsPane`, `FilterDateRangePane`.
 */

"use client";

import { CalendarDays, ListFilter, Users } from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { FilterDateRangePane } from "@/modules/meetings/components/FilterDateRangePane";
import { FilterParticipantsPane } from "@/modules/meetings/components/FilterParticipantsPane";
import type { MeetingsUrlState } from "@/modules/meetings/url-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/utils/cn";

type FilterSection = "participants" | "dates";
// `Pick<Partial<T>, keys>` = an object that may contain only these optional fields of the URL state.
type FilterPatch = Pick<Partial<MeetingsUrlState>, "participantId" | "dateFrom" | "dateTo">;

interface MeetingsFilterPopoverProps {
  state: MeetingsUrlState;
  onChange: (patch: FilterPatch) => void;
}

// Only the filters GET /meetings supports. Hosted by / Duration / Captured From / Privacy from
// screenshot 10 have no API parameter, so they aren't shown (docs/decisions.md).
const SECTIONS: ReadonlyArray<{ id: FilterSection; label: string; icon: LucideIcon }> = [
  { id: "participants", label: "Participants", icon: Users },
  { id: "dates", label: "Date Range", icon: CalendarDays },
];

/** Two-pane filter popover from screenshot 10. Radix handles Esc, outside click and focus return. */
export function MeetingsFilterPopover({ state, onChange }: MeetingsFilterPopoverProps) {
  const [section, setSection] = useState<FilterSection>("participants");
  // `Number(boolean)` is 1 or 0, so this counts how many filter groups are active (badge number).
  const activeCount =
    Number(state.participantId !== null) + Number(Boolean(state.dateFrom || state.dateTo));

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-default hover:bg-hover",
          "data-[state=open]:border-primary-600 data-[state=open]:bg-primary-muted data-[state=open]:text-primary-fg",
        )}
      >
        <ListFilter className="size-4" aria-hidden="true" />
        Filters
        {activeCount > 0 && (
          <span className="rounded-full bg-primary-600 px-1.5 text-xs text-on-primary">
            {activeCount}
            <span className="sr-only"> active</span>
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[calc(100vw-2rem)] max-w-150 flex-col gap-0 overflow-hidden border border-default bg-surface p-0 ring-0 sm:flex-row"
      >
        <div className="flex shrink-0 flex-col border-b p-3 sm:w-52 sm:border-r sm:border-b-0">
          <nav aria-label="Filter categories" className="flex gap-1 sm:flex-col">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={section === id ? "true" : undefined}
                onClick={() => setSection(id)}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-md px-3 text-sm text-default hover:bg-hover",
                  section === id && "bg-primary-subtle text-primary-fg hover:bg-primary-subtle",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            disabled={activeCount === 0}
            onClick={() => onChange({ participantId: null, dateFrom: null, dateTo: null })}
            className="mt-3 h-9 self-start rounded-md border bg-card px-3 text-sm text-default hover:bg-hover disabled:text-disabled disabled:hover:bg-card sm:mt-auto"
          >
            Clear All Filters
          </button>
        </div>

        <div className="min-h-64 flex-1 p-3">
          {section === "participants" ? (
            <FilterParticipantsPane
              selectedId={state.participantId}
              onSelect={(participantId) => onChange({ participantId })}
            />
          ) : (
            <FilterDateRangePane
              dateFrom={state.dateFrom}
              dateTo={state.dateTo}
              onChange={(range) => onChange(range)}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
