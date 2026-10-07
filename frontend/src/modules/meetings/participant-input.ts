/**
 * Parsing and list rules for the participant tag input.
 *
 * WHAT: Turns "Name" or "Name <email>" text into a participant, with clear error messages, and
 *   keeps the list free of duplicates.
 * LAYER: Module util (pure; unit-tested).
 * CALLED BY: `ParticipantTagInput`, `meeting-patch.ts`.
 * CALLS: constants and types.
 * MERN EQUIVALENT: input validation helpers for a "tags" field.
 */

import { EMAIL_MAX_LENGTH, PARTICIPANT_NAME_MAX_LENGTH } from "@/modules/meetings/constants";
import type { ParticipantDraft } from "@/modules/meetings/types";

// "Name" or "Name <email>"; deliberately loose email check (the backend doesn't validate format).
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const NAME_WITH_EMAIL_PATTERN = /^(.*?)\s*<([^<>]*)>$/;
const ANGLE_BRACKET = /[<>]/;
const WHITESPACE_RUN = /\s+/g;

// A "discriminated union": check `result.ok` and TypeScript knows which fields exist, so callers
// cannot read `participant` on a failure. This is the typed alternative to throwing.
export type ParticipantParseResult =
  { ok: true; participant: ParticipantDraft } | { ok: false; error: string };

/** Shorthand for building the failure variant. */
function fail(error: string): ParticipantParseResult {
  return { ok: false, error };
}

/** Parses one tag-input entry: "Name" or "Name <email>". Extra whitespace is collapsed. */
export function parseParticipantInput(raw: string): ParticipantParseResult {
  const text = raw.replace(WHITESPACE_RUN, " ").trim();
  if (!text) return fail("Enter a name");

  // Regex group 1 = the name, group 2 = whatever sits inside the angle brackets.
  const withEmail = NAME_WITH_EMAIL_PATTERN.exec(text);
  if (ANGLE_BRACKET.test(text) && !withEmail) {
    return fail('Use the format "Name <email@example.com>"');
  }

  const name = (withEmail ? withEmail[1] : text).trim();
  const email = withEmail ? withEmail[2].trim() : null;

  if (!name) return fail("Enter a name before the email");
  if (name.length > PARTICIPANT_NAME_MAX_LENGTH) {
    return fail(`Names can be at most ${PARTICIPANT_NAME_MAX_LENGTH} characters`);
  }
  if (email !== null && (!EMAIL_PATTERN.test(email) || email.length > EMAIL_MAX_LENGTH)) {
    return fail(`"${email}" isn't a valid email address`);
  }
  return { ok: true, participant: { name, email } };
}

/** The backend matches speakers to participants by name (case-insensitive), so that is our key too. */
export function participantKey(participant: ParticipantDraft): string {
  return participant.name.toLowerCase();
}

/** Appends unless someone with the same name is already listed. */
// Returns a NEW list (never mutates the old one), as React state updates require.
export function addParticipant(
  list: ReadonlyArray<ParticipantDraft>,
  participant: ParticipantDraft,
): { list: ParticipantDraft[]; added: boolean } {
  const key = participantKey(participant);
  if (list.some((existing) => participantKey(existing) === key)) {
    return { list: [...list], added: false };
  }
  return { list: [...list, participant], added: true };
}

/** "Name <email>" for tooltips and suggestions. */
export function formatParticipant(participant: ParticipantDraft): string {
  return participant.email ? `${participant.name} <${participant.email}>` : participant.name;
}
