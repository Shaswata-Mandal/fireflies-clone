/**
 * Maps backend errors onto the create-meeting form.
 *
 * WHAT: Decides which field (file, transcript, title, date, or the top banner) shows an API error.
 * LAYER: Module util (pure; unit-tested).
 * CALLED BY: `use-create-meeting-submit.ts`.
 * CALLS: `isApiError`, `CREATE_ERROR_CODES`.
 * MERN EQUIVALENT: translating `err.response.data.errors` into Formik `setFieldError` calls.
 */

import { CREATE_ERROR_CODES } from "@/modules/meetings/constants";
import { isApiError } from "@/shared/lib/api-error";

/** Where an API error is shown in the create form; "form" = the banner at the top. */
export type CreateErrorField = "file" | "transcript_text" | "title" | "meeting_date" | "form";

export interface CreateFormError {
  field: CreateErrorField;
  message: string;
}

// The only body fields the form can show a message under.
const BODY_FIELDS = ["title", "meeting_date"] as const;

/** Position text for TRANSCRIPT_PARSE_ERROR: `details` is `{line}` (txt/vtt) or `{segment}` (json). */
function parseErrorLocation(details: unknown): string | null {
  if (typeof details !== "object" || details === null) return null;
  if ("line" in details && typeof details.line === "number") return `line ${details.line}`;
  if ("segment" in details && typeof details.segment === "number") {
    return `segment ${details.segment}`;
  }
  return null;
}

/** FastAPI field errors look like `[{loc: ["body", "title"], msg}]`; returns the first we can place. */
function firstFieldError(details: unknown): CreateFormError | null {
  if (!Array.isArray(details)) return null;
  for (const entry of details) {
    if (typeof entry !== "object" || entry === null) continue;
    const loc: unknown[] = "loc" in entry && Array.isArray(entry.loc) ? entry.loc : [];
    const message = "msg" in entry && typeof entry.msg === "string" ? entry.msg : null;
    const field = BODY_FIELDS.find((name) => loc.includes(name));
    if (message && field) return { field, message };
  }
  return null;
}

/**
 * Maps a failed create / upload to a place in the form. Returns null for errors with no form
 * meaning (network down, 500): those only get the toast from the global MutationCache handler.
 * `isUpload` decides whether transcript problems belong to the file zone or the pasted text.
 */
// INTERVIEW: a stable `code` from the backend (not the message text) is what the UI branches on,
// so rewording a message never breaks the form.
export function mapCreateError(error: unknown, isUpload: boolean): CreateFormError | null {
  if (!isApiError(error)) return null;
  const transcriptField: CreateErrorField = isUpload ? "file" : "transcript_text";

  switch (error.code) {
    case CREATE_ERROR_CODES.UNSUPPORTED_FILE:
    case CREATE_ERROR_CODES.FILE_TOO_LARGE:
      return { field: "file", message: error.message };
    case CREATE_ERROR_CODES.EMPTY_TRANSCRIPT:
      return { field: transcriptField, message: error.message };
    case CREATE_ERROR_CODES.TRANSCRIPT_PARSE_ERROR: {
      const location = parseErrorLocation(error.details);
      // The backend message usually starts with "Line N:" already; only add it when it's missing.
      const alreadyMentioned = location !== null && error.message.toLowerCase().includes(location);
      const message =
        location && !alreadyMentioned ? `${error.message} (${location})` : error.message;
      return { field: transcriptField, message };
    }
    case CREATE_ERROR_CODES.VALIDATION_ERROR:
      return firstFieldError(error.details) ?? { field: "form", message: error.message };
    default:
      return null;
  }
}
