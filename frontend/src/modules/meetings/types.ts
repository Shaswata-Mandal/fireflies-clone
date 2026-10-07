// Mirrors backend/app/modules/meetings/schemas.py and participants/schemas.py (snake_case, no mapping layer).

export type MeetingPlatform = "zoom" | "google_meet" | "teams" | "upload";
export type MeetingSource = "seed" | "upload" | "paste" | "form";
export type ParticipantRole = "host" | "attendee";
export type GeneratedBy = "seed" | "mock" | "llm";

/** The four sort keys the API whitelists; a leading `-` means descending (docs/api.md). */
export type MeetingSort = "-meeting_date" | "meeting_date" | "title" | "-duration_ms";

export interface ParticipantBrief {
  id: number;
  name: string;
  avatar_color: string | null;
}

export interface MeetingParticipant extends ParticipantBrief {
  email: string | null;
  role: ParticipantRole;
}

/** Row from `GET /participants`. */
export interface Participant extends ParticipantBrief {
  email: string | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export interface MeetingListItem {
  id: number;
  title: string;
  /** ISO 8601 UTC. */
  meeting_date: string;
  duration_ms: number;
  platform: MeetingPlatform | null;
  participants: ParticipantBrief[];
  summary_preview: string | null;
  action_items_open: number;
  tags: Tag[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type MeetingList = Paginated<MeetingListItem>;

export interface MeetingSummary {
  overview: string;
  bullet_points: string[];
  keywords: string[];
  generated_by: GeneratedBy;
}

export interface Chapter {
  id: number;
  title: string;
  start_ms: number;
  position: number;
}

export interface MeetingDetail {
  id: number;
  title: string;
  meeting_date: string;
  duration_ms: number;
  media_url: string | null;
  platform: MeetingPlatform | null;
  source: MeetingSource;
  created_at: string;
  updated_at: string;
  participants: MeetingParticipant[];
  summary: MeetingSummary | null;
  chapters: Chapter[];
  tags: Tag[];
}

/** `GET /meetings/{id}/export?format=` */
export type ExportFormat = "md" | "txt";

export interface ExportedFile {
  blob: Blob;
  filename: string;
}

/** Query params of `GET /meetings`; undefined = not sent. Dates are `YYYY-MM-DD`. */
export interface MeetingsQuery {
  q?: string;
  participant_id?: number;
  date_from?: string;
  date_to?: string;
  sort?: MeetingSort;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Create / update payloads (docs/api.md: POST /meetings, POST /meetings/upload, PATCH /meetings/{id})
// ---------------------------------------------------------------------------

export type TranscriptFormat = "txt" | "vtt" | "json";

/** One entry of the `participants` list the API accepts; also what the tag input edits. */
export interface ParticipantDraft {
  name: string;
  email: string | null;
}

/** JSON body of `POST /meetings` (pasted transcript, or no transcript at all). */
export interface MeetingCreateBody {
  title: string;
  /** ISO 8601 UTC. */
  meeting_date: string;
  participants: ParticipantDraft[];
  transcript_text?: string;
  transcript_format?: TranscriptFormat;
  generate_summary: boolean;
}

/** Same fields as the create body, plus the file; sent as multipart to `POST /meetings/upload`. */
export interface MeetingUploadInput {
  title: string;
  meeting_date: string;
  participants: ParticipantDraft[];
  generate_summary: boolean;
  file: File;
}

/** `PATCH /meetings/{id}`: only the fields that changed. */
export interface MeetingUpdateBody {
  title?: string;
  meeting_date?: string;
  /** When present it replaces the whole list. */
  participants?: ParticipantDraft[];
}

// ---------------------------------------------------------------------------
// Ask (POST /meetings/{id}/ask)
// ---------------------------------------------------------------------------

export type AskRole = "user" | "assistant";

/** A turn sent back as context, so follow-up questions make sense. */
export interface AskHistoryMessage {
  role: AskRole;
  content: string;
}

export interface AskCitation {
  segment_id: number;
  start_ms: number;
  speaker_label: string;
  /** Only on answers from the cross-meeting `POST /ask`. */
  meeting_id?: number;
  meeting_title?: string;
}

export interface AskBody {
  question: string;
  history: AskHistoryMessage[];
}

export interface AskResponse {
  answer: string;
  citations: AskCitation[];
}
