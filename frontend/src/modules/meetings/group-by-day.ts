import type { MeetingListItem } from "@/modules/meetings/types";
import { formatDayHeading, localDayKey } from "@/shared/utils/format-date";

export interface MeetingDayGroup {
  key: string;
  /** "Today", "Yesterday", "Mon, Oct 5"; null for an ungrouped list. */
  heading: string | null;
  items: MeetingListItem[];
}

/**
 * Groups consecutive meetings by the viewer's local day, keeping the API's order. Consecutive (not
 * global) grouping is enough because the list is already sorted by date when this is used.
 */
export function groupMeetingsByDay(
  items: MeetingListItem[],
  now: Date = new Date(),
): MeetingDayGroup[] {
  const groups: MeetingDayGroup[] = [];
  for (const item of items) {
    const key = localDayKey(item.meeting_date);
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, heading: formatDayHeading(item.meeting_date, now), items: [item] });
    }
  }
  return groups;
}
