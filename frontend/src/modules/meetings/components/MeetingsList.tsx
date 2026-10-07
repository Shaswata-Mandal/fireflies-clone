/**
 * The list of meeting cards.
 *
 * WHAT: Groups meetings under day headings (for date sorts) and renders a `MeetingRow` for each.
 * LAYER: Module component (client: it attaches an onClick).
 * CALLED BY: `MeetingsView`.
 * CALLS: `groupMeetingsByDay`, `MeetingRow`.
 */

"use client";

import { MessageSquare } from "lucide-react";
import { MeetingRow } from "@/modules/meetings/components/MeetingRow";
import { DATE_SORTS, MEETINGS_COPY } from "@/modules/meetings/constants";
import { groupMeetingsByDay, type MeetingDayGroup } from "@/modules/meetings/group-by-day";
import type { MeetingListItem, MeetingSort } from "@/modules/meetings/types";
import { cn } from "@/shared/utils/cn";
import { showComingSoon } from "@/shared/utils/coming-soon";

interface MeetingsListProps {
  items: MeetingListItem[];
  sort: MeetingSort;
  isLastPage: boolean;
  /** True while the next page/filter loads and the previous results are still shown. */
  isStale: boolean;
}

/** Meetings under "Today / Yesterday / …" headings when sorted by date; a flat list otherwise. */
export function MeetingsList({ items, sort, isLastPage, isStale }: MeetingsListProps) {
  // Day headings only make sense for date sorts; otherwise one flat group without a heading.
  const groups: MeetingDayGroup[] = DATE_SORTS.has(sort)
    ? groupMeetingsByDay(items)
    : [{ key: "all", heading: null, items }];

  return (
    // While the next page loads, the previous results stay (`keepPreviousData`) but dimmed.
    <div
      aria-busy={isStale}
      className={cn("flex flex-col gap-6 transition-opacity", isStale && "opacity-60")}
    >
      {groups.map((group, index) => (
        <section
          key={group.key}
          aria-label={group.heading ?? "Meetings"}
          className="flex flex-col gap-3"
        >
          {(group.heading || index === 0) && (
            <div className="flex items-center justify-between px-2">
              {group.heading ? (
                <h2 className="text-base text-default">{group.heading}</h2>
              ) : (
                <span />
              )}
              {index === 0 && (
                <button
                  type="button"
                  onClick={() => showComingSoon("Feedback")}
                  className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
                >
                  <MessageSquare className="size-4" aria-hidden="true" />
                  Feedback
                </button>
              )}
            </div>
          )}
          <ul className="flex flex-col gap-3">
            {group.items.map((meeting) => (
              <li key={meeting.id}>
                <MeetingRow meeting={meeting} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {isLastPage && (
        <p className="py-6 text-center text-xs text-secondary">{MEETINGS_COPY.END_OF_LIST}</p>
      )}
    </div>
  );
}
