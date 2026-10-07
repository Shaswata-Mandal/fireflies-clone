/**
 * Meetings module constants.
 *
 * WHAT: Page size, sort options, tab ids, form limits and all fixed UI copy for this module.
 * LAYER: Module constants.
 * CALLED BY: meetings components, hooks, schemas and url-state.
 * CALLS: types only.
 * MERN EQUIVALENT: a `constants.js` (no magic numbers or strings in components, per CLAUDE.md).
 */

import type { MeetingSort, TranscriptFormat } from "@/modules/meetings/types";

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
// `as const` + the derived type below = a string-literal "enum" without TypeScript's `enum`.
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

// ---------------------------------------------------------------------------
// Create / edit form. Limits mirror the backend (meetings/schemas.py, meetings/service.py).
// ---------------------------------------------------------------------------

export const TITLE_MAX_LENGTH = 200;
export const PARTICIPANT_NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 255;
/** Backend `MAX_UPLOAD_BYTES`: bigger files are rejected with 413 FILE_TOO_LARGE. */
// Keep in sync with the backend (checked there too: never trust the client alone).
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const BYTES_PER_KB = 1024;

export const TRANSCRIPT_EXTENSIONS: ReadonlyArray<TranscriptFormat> = ["txt", "vtt", "json"];
/** Value for `<input accept>`. */
export const TRANSCRIPT_ACCEPT = TRANSCRIPT_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export const CREATE_TABS = {
  UPLOAD: "upload",
  PASTE: "paste",
  MANUAL: "manual",
} as const;

export type CreateTab = (typeof CREATE_TABS)[keyof typeof CREATE_TABS];

export const CREATE_TAB_ITEMS: ReadonlyArray<{ id: CreateTab; label: string }> = [
  { id: CREATE_TABS.UPLOAD, label: "Upload file" },
  { id: CREATE_TABS.PASTE, label: "Paste transcript" },
  { id: CREATE_TABS.MANUAL, label: "Manual form" },
];

/** Backend error codes the create form shows inline (docs/api.md). */
export const CREATE_ERROR_CODES = {
  UNSUPPORTED_FILE: "UNSUPPORTED_FILE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  TRANSCRIPT_PARSE_ERROR: "TRANSCRIPT_PARSE_ERROR",
  EMPTY_TRANSCRIPT: "EMPTY_TRANSCRIPT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export const FORM_COPY = {
  TRANSCRIPT_HINT: "One line per utterance: [HH:MM:SS] Speaker Name: text",
  TRANSCRIPT_PLACEHOLDER: "[00:00:05] Priya: Let's start with the roadmap.",
  DROP_TITLE: "Upload a file to generate a transcript",
  DROP_BODY: "Browse or drag and drop TXT, VTT or JSON transcripts. (Max file size: 2 MB)",
  UPLOADING: "Uploading and processing…",
  SAVING: "Saving…",
  CREATED: "Meeting created",
  UPDATED: "Meeting updated",
  DELETED: "Meeting deleted",
  VIEW_MEETING: "View meeting",
  NO_CHANGES: "No changes to save",
  MANUAL_HINT: "Add a meeting with just a title and date. You can add a transcript later.",
} as const;

// ---------------------------------------------------------------------------
// Ask a question about this meeting
// ---------------------------------------------------------------------------

/** Matches the backend, which only uses the last 6 messages anyway. */
export const ASK_HISTORY_LIMIT = 6;
export const ASK_QUESTION_MAX_LENGTH = 500;

export const ASK_SUGGESTED_PROMPTS = [
  "Summarize this meeting",
  "What are the action items?",
  "What decisions were made?",
] as const;

export const ASK_COPY = {
  CONTEXT_LABEL: "This meeting",
  GREETING_FALLBACK_NAME: "there",
  HEADLINE: "Ask anything about this meeting",
  YOU: "You",
  ASSISTANT: "AskFred",
  THINKING: "Thinking…",
  CLEAR: "Clear chat",
  NOT_CONFIGURED:
    "AskFred isn't set up on this server yet. Ask the admin to add a Groq API key to enable it.",
  RATE_LIMITED_FALLBACK_SECONDS: 60,
  GENERIC_ERROR: "AskFred couldn't answer that. Please try again.",
} as const;
