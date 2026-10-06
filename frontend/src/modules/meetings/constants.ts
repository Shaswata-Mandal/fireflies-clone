import type { MeetingSort } from "@/modules/meetings/types";

export const MEETINGS_PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 300;
export const MAX_VISIBLE_AVATARS = 3;

export const DEFAULT_SORT: MeetingSort = "-meeting_date";

/** Labels for the API's sort whitelist, in menu order. */
export const SORT_OPTIONS: ReadonlyArray<{ value: MeetingSort; label: string }> = [
  { value: "-meeting_date", label: "Newest first" },
  { value: "meeting_date", label: "Oldest first" },
  { value: "title", label: "Title (A–Z)" },
  { value: "-duration_ms", label: "Longest first" },
];

/** Date sorts are the only ones where "Today / Yesterday" headings make sense. */
export const DATE_SORTS: ReadonlySet<MeetingSort> = new Set(["-meeting_date", "meeting_date"]);

/** The two channels from screenshots 09/13. Both list the same meetings: there is no sharing model. */
export const MEETING_VIEWS = {
  MINE: "mine",
  ALL: "all",
} as const;

export type MeetingView = (typeof MEETING_VIEWS)[keyof typeof MEETING_VIEWS];

export const MEETING_VIEW_LABELS: Record<MeetingView, string> = {
  mine: "My Meetings",
  all: "All Meetings",
};

export const MEETINGS_COPY = {
  END_OF_LIST: "You've reached the end of your meetings.",
  NO_MEETINGS_TITLE: "No meetings yet",
  NO_MEETINGS_BODY:
    "Upload a transcript to see its summary, action items and searchable transcript here.",
  NO_RESULTS_TITLE: "Nothing matched your search",
  NO_RESULTS_BODY:
    "Try checking your spelling, using fewer keywords, or clearing filters to see more meetings.",
  ERROR_TITLE: "Couldn't load your meetings",
  LINK_COPIED: "Link copied to clipboard",
  LINK_COPY_FAILED: "Couldn't copy the link",
} as const;
