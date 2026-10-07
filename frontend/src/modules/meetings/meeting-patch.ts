import { participantKey } from "@/modules/meetings/participant-input";
import type { MeetingUpdateBody, ParticipantDraft } from "@/modules/meetings/types";

interface MeetingSnapshot {
  title: string;
  /** ISO 8601. */
  meeting_date: string;
  participants: ReadonlyArray<ParticipantDraft>;
}

function signature(participant: ParticipantDraft): string {
  return `${participantKey(participant)}|${(participant.email ?? "").toLowerCase()}`;
}

function sameParticipants(
  a: ReadonlyArray<ParticipantDraft>,
  b: ReadonlyArray<ParticipantDraft>,
): boolean {
  if (a.length !== b.length) return false;
  const remaining = new Set(a.map(signature));
  return b.every((participant) => remaining.delete(signature(participant)));
}

/**
 * PATCH body with only the fields that differ from `original`. Dates are compared as instants, so
 * "10:00:00Z" and "10:00:00.000Z" are equal. Participant order is ignored: attendees are a set.
 */
export function buildMeetingPatch(
  original: MeetingSnapshot,
  next: MeetingSnapshot,
): MeetingUpdateBody {
  const patch: MeetingUpdateBody = {};
  const title = next.title.trim();
  if (title !== original.title) patch.title = title;
  if (new Date(next.meeting_date).getTime() !== new Date(original.meeting_date).getTime()) {
    patch.meeting_date = next.meeting_date;
  }
  if (!sameParticipants(original.participants, next.participants)) {
    patch.participants = [...next.participants];
  }
  return patch;
}
