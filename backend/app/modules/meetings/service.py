"""Meeting business rules: create (JSON + upload share one path), list, read, patch, delete.

Transaction rule: helpers only `flush`; the public functions that write own the single `commit` and
roll back on any error, so a failed create leaves nothing behind (no orphan participants either).

WHAT: All the rules for meetings: building a meeting from a form/paste/upload, resolving speakers
    to participants, optional summary generation, ownership checks, partial updates, deletes.
LAYER: Service (business logic). No FastAPI imports, no raw SQL.
CALLED BY: meetings/router.py; other services call `get_owned_or_404` for ownership checks.
CALLS: meetings/repository.py, participants/service.py, summaries/builder.py, and
    utils/transcript_parser.py. Raises AppException subclasses.
MERN EQUIVALENT: the "service" layer many Express apps add between controller and model, where
    you also open and commit a Mongo transaction.
"""

import logging
from datetime import datetime
from pathlib import PurePath

from pydantic import TypeAdapter
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.orm import Session

from app.core.db_types import utcnow
from app.core.enums import MeetingPlatform, MeetingSource, ParticipantRole
from app.core.exceptions import (
    EmptyTranscriptError,
    FileTooLargeError,
    NotFoundError,
    TranscriptParseError,
    UnsupportedFileError,
    ValidationError,
)
from app.modules.action_items.models import ActionItem
from app.modules.meetings import repository
from app.modules.meetings.models import Meeting, MeetingParticipant
from app.modules.meetings.repository import MeetingFilters
from app.modules.meetings.schemas import (
    ChapterRead,
    MeetingCreate,
    MeetingDetail,
    MeetingList,
    MeetingListItem,
    MeetingSort,
    MeetingUpdate,
    ParticipantBrief,
    ParticipantInput,
    ParticipantRead,
    SummaryRead,
    TagRead,
)
from app.modules.participants import service as participants_service
from app.modules.participants.models import Participant
from app.modules.summaries.builder import build_summary_graph
from app.modules.summaries.models import Chapter, Summary
from app.modules.transcripts.models import TranscriptSegment
from app.modules.users.models import User
from app.utils.transcript_parser import (
    UNKNOWN_SPEAKER,
    ParsedSegment,
    detect_format,
    parse_transcript,
)

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 2 * 1024 * 1024
ALLOWED_UPLOAD_EXTENSIONS = frozenset({".txt", ".vtt", ".json"})
SUMMARY_PREVIEW_MAX_CHARS = 160

# A TypeAdapter validates a plain type (here a list) that is not a BaseModel class, e.g. to parse
# the JSON text of the upload form's `participants` field.
_participants_adapter = TypeAdapter(list[ParticipantInput])


# ── Read ────────────────────────────────────────────────────────────────────────────────────────


def _preview(overview: str) -> str:
    """Shorten a summary overview to a card-sized preview, adding an ellipsis when cut."""
    if len(overview) <= SUMMARY_PREVIEW_MAX_CHARS:
        return overview
    # Leave one character of room for the "…" so the result never exceeds the max.
    return overview[: SUMMARY_PREVIEW_MAX_CHARS - 1].rstrip() + "…"


def _ordered_links(meeting: Meeting) -> list[MeetingParticipant]:
    """Host first, then by participant id, so the avatar stack is stable between requests."""
    # Sort keys are tuples; `False < True`, so `role != HOST` is False for the host and sorts first.
    return sorted(
        meeting.participant_links,
        key=lambda link: (link.role != ParticipantRole.HOST, link.participant_id),
    )


def _to_list_item(meeting: Meeting, open_items: int) -> MeetingListItem:
    """Map an ORM Meeting (plus its open-item count) to the card DTO.

    Why it exists: the API never exposes ORM objects directly; this is the explicit mapping.
    """
    summary = meeting.summary
    return MeetingListItem(
        id=meeting.id,
        title=meeting.title,
        meeting_date=meeting.meeting_date,
        duration_ms=meeting.duration_ms,
        platform=meeting.platform,
        # `model_validate` builds a Pydantic model from an ORM object (needs from_attributes).
        participants=[
            ParticipantBrief.model_validate(link.participant) for link in _ordered_links(meeting)
        ],
        summary_preview=_preview(summary.overview) if summary else None,
        action_items_open=open_items,
        tags=[TagRead.model_validate(tag) for tag in meeting.tags],
    )


def _to_detail(meeting: Meeting) -> MeetingDetail:
    """Map an ORM Meeting (with its relationships loaded) to the full detail DTO."""
    return MeetingDetail(
        id=meeting.id,
        title=meeting.title,
        meeting_date=meeting.meeting_date,
        duration_ms=meeting.duration_ms,
        media_url=meeting.media_url,
        platform=meeting.platform,
        source=meeting.source,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        # Built by hand because `role` lives on the link row, not on the Participant itself.
        participants=[
            ParticipantRead(
                id=link.participant.id,
                name=link.participant.name,
                email=link.participant.email,
                avatar_color=link.participant.avatar_color,
                role=link.role,
            )
            for link in _ordered_links(meeting)
        ],
        summary=SummaryRead.model_validate(meeting.summary) if meeting.summary else None,
        chapters=[ChapterRead.model_validate(chapter) for chapter in meeting.chapters],
        tags=[TagRead.model_validate(tag) for tag in meeting.tags],
    )


def get_owned_or_404(db: Session, owner: User, meeting_id: int) -> Meeting:
    """Load a meeting the user owns, or raise MEETING_NOT_FOUND.

    Args:
        db: the request's session.
        owner: the current user.
        meeting_id: id from the URL.
    Returns:
        The ORM Meeting.
    Why it exists: the shared ownership guard; other modules' services reuse it.
    """
    # Someone else's meeting looks exactly like a missing one, so ids can't be probed.
    # INTERVIEW: returning 404 (not 403) for other people's data avoids leaking that it exists.
    meeting = repository.get_owned(db, owner.id, meeting_id)
    if meeting is None:
        raise NotFoundError("MEETING_NOT_FOUND", f"Meeting {meeting_id} not found")
    return meeting


def list_meetings(
    db: Session,
    owner: User,
    *,
    filters: MeetingFilters,
    sort: MeetingSort,
    page: int,
    limit: int,
) -> MeetingList:
    """Return one page of the owner's meetings as DTOs.

    Args:
        db: the request's session.
        owner: the current user.
        filters, sort, page, limit: keyword-only (the bare `*` forces callers to name them).
    Returns:
        A MeetingList envelope with items, total, page and limit.
    """
    rows, total = repository.list_filtered(db, owner.id, filters, sort, page, limit)
    items = [_to_list_item(meeting, open_items) for meeting, open_items in rows]
    return MeetingList(items=items, total=total, page=page, limit=limit)


def get_meeting(db: Session, owner: User, meeting_id: int) -> MeetingDetail:
    """Return one owned meeting as a detail DTO (404 if missing or not owned)."""
    return _to_detail(get_owned_or_404(db, owner, meeting_id))


# ── Create ──────────────────────────────────────────────────────────────────────────────────────


def _build_links(
    people: list[Participant], existing: dict[int, MeetingParticipant] | None = None
) -> list[MeetingParticipant]:
    """One link per distinct person, keeping existing links (and their roles) untouched.

    Args:
        people: participants in the order they were listed (first becomes host for new meetings).
        existing: links already on the meeting, keyed by participant id (used by updates).
    Returns:
        The final list of MeetingParticipant rows for the meeting.
    """
    existing = existing or {}
    links: dict[int, MeetingParticipant] = {}
    for index, person in enumerate(people):
        # The same person listed twice must produce one link (the composite PK forbids dupes).
        if person.id in links:
            continue
        role = ParticipantRole.HOST if index == 0 else ParticipantRole.ATTENDEE
        links[person.id] = existing.get(person.id) or MeetingParticipant(
            participant=person, role=role
        )
    return list(links.values())


def _resolve_speakers(
    db: Session, segments: list[ParsedSegment], people: list[Participant]
) -> dict[str, Participant | None]:
    """Map each speaker label to a participant (case-insensitive), creating missing ones.

    New speakers are appended to `people` so they also become meeting participants.

    Args:
        db: the request's session.
        segments: parsed transcript lines, each with a speaker label like "Alice".
        people: participants already on the meeting (mutated: new speakers are appended).
    Returns:
        A dict label -> Participant, or None for the "unknown speaker" label.
    """
    by_name = {person.name.lower(): person for person in people}
    resolved: dict[str, Participant | None] = {}
    for segment in segments:
        label = segment.speaker_label
        if label in resolved:
            continue
        if label == UNKNOWN_SPEAKER:
            resolved[label] = None  # no real person to attach; the label is still kept
            continue
        person = by_name.get(label.lower())
        if person is None:
            person = participants_service.find_or_create(db, label)
            by_name[label.lower()] = person
            people.append(person)
        resolved[label] = person
    return resolved


def _generate_summary(
    segments: list[TranscriptSegment], people: dict[str, Participant | None]
) -> tuple[Summary, list[Chapter], list[ActionItem]] | None:
    """Run the summary generator; a failure is logged and the meeting is created without one.

    Why it exists: AI is optional and flaky; it must never block saving the meeting itself.
    """
    try:
        return build_summary_graph(segments, people)
    # A broad `except` is deliberate here: any generator failure should only skip the summary.
    except Exception:
        logger.exception("Summary generation failed; creating the meeting without a summary")
        return None


def _build_meeting(
    db: Session,
    owner: User,
    data: MeetingCreate,
    parsed: list[ParsedSegment] | None,
    source: MeetingSource,
    platform: MeetingPlatform | None,
) -> Meeting:
    """Assemble the whole Meeting object graph in memory (no commit).

    Args:
        db: the request's session (used to find or create participants).
        owner: the current user.
        data: validated create payload.
        parsed: transcript segments, or None when there is no transcript.
        source: how the meeting entered the system (form, paste, upload).
        platform: display platform, or None.
    Returns:
        A new, not-yet-saved Meeting with segments, links and optional summary attached.
    """
    people = [participants_service.find_or_create(db, p.name, p.email) for p in data.participants]
    meeting = Meeting(
        owner_id=owner.id,
        title=data.title,
        meeting_date=data.meeting_date,
        duration_ms=data.duration_ms or 0,
        source=source,
        platform=platform,
    )
    if parsed:
        speakers = _resolve_speakers(db, parsed, people)
        # Assigning to the relationship list attaches the children; the ORM inserts them with the
        # meeting and fills in `meeting_id` for us.
        meeting.segments = [
            TranscriptSegment(
                participant=speakers[s.speaker_label],
                speaker_label=s.speaker_label,
                start_ms=s.start_ms,
                end_ms=s.end_ms,
                text=s.text,
                position=i,
            )
            for i, s in enumerate(parsed)
        ]
        if data.duration_ms is None:
            # No explicit length: use the end of the last (latest-ending) segment.
            meeting.duration_ms = max(s.end_ms for s in parsed)
        if data.generate_summary:
            generated = _generate_summary(meeting.segments, speakers)
            if generated:
                # Tuple unpacking assigns summary, chapters and action items in one line.
                meeting.summary, meeting.chapters, meeting.action_items = generated
    # Built last because `people` may have grown while resolving transcript speakers.
    meeting.participant_links = _build_links(people)
    return meeting


def _create(
    db: Session,
    owner: User,
    data: MeetingCreate,
    parsed: list[ParsedSegment] | None,
    source: MeetingSource,
    platform: MeetingPlatform | None,
) -> MeetingDetail:
    """The single create path: whole graph in one transaction, nothing written on failure."""
    # INTERVIEW: one transaction for meeting + segments + participants + summary. Either all of
    # it is saved or none (rollback), and only this service function commits.
    try:
        meeting = _build_meeting(db, owner, data, parsed, source, platform)
        repository.add(db, meeting)
        db.commit()
    except Exception:
        db.rollback()
        raise  # bare `raise` re-throws the same error so the global handler still renders it
    # Re-read through the normal path so the response uses the same loaded shape as GET.
    return get_meeting(db, owner, meeting.id)


def create_meeting(db: Session, owner: User, data: MeetingCreate) -> MeetingDetail:
    """Create a meeting from the JSON form, optionally with a pasted transcript.

    Args:
        db: the request's session.
        owner: the current user.
        data: validated body.
    Returns:
        The created meeting as a detail DTO.
    """
    parsed = None
    source = MeetingSource.FORM
    if data.transcript_text is not None:
        if not data.transcript_text.strip():
            raise EmptyTranscriptError()
        # No filename for pasted text, so the format is guessed from the content.
        fmt = data.transcript_format or detect_format("", data.transcript_text)
        parsed = parse_transcript(data.transcript_text, fmt)
        source = MeetingSource.PASTE
    return _create(db, owner, data, parsed, source, None)


def _parse_upload_payload(
    title: str, meeting_date: datetime, participants_json: str, generate_summary: bool
) -> MeetingCreate:
    """Validate the multipart form fields by reusing the JSON create schema.

    Why it exists: form fields arrive as loose strings, so we rebuild a `MeetingCreate` and turn
    any Pydantic failure into our own VALIDATION_ERROR envelope.
    """
    try:
        participants = _participants_adapter.validate_json(participants_json or "[]")
        return MeetingCreate(
            title=title,
            meeting_date=meeting_date,
            participants=participants,
            generate_summary=generate_summary,
        )
    except PydanticValidationError as exc:
        # Strip the noisy fields (docs URL, echoed input) so only loc/msg/type reach the client.
        details = [
            {"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]}
            for e in exc.errors(include_url=False, include_context=False, include_input=False)
        ]
        raise ValidationError("Invalid upload fields", details=details) from exc


def _decode_upload(filename: str, content: bytes) -> str:
    """Check the file type and size, then decode the bytes to text.

    Args:
        filename: original name; only its extension is trusted for the type check.
        content: raw file bytes (at most MAX_UPLOAD_BYTES + 1).
    Returns:
        The file's text.
    """
    if PurePath(filename).suffix.lower() not in ALLOWED_UPLOAD_EXTENSIONS:
        raise UnsupportedFileError("Only .txt, .vtt and .json transcript files are supported")
    if len(content) > MAX_UPLOAD_BYTES:
        raise FileTooLargeError(f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit")
    try:
        # "utf-8-sig" also strips the BOM that Windows editors add at the start of a file.
        return content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise TranscriptParseError("File is not valid UTF-8 text") from exc


def create_meeting_from_upload(
    db: Session,
    owner: User,
    *,
    title: str,
    meeting_date: datetime,
    participants_json: str,
    generate_summary: bool,
    filename: str,
    content: bytes,
) -> MeetingDetail:
    """`content` may be at most MAX_UPLOAD_BYTES + 1 bytes: one extra byte is enough to detect
    oversize without reading an unbounded body into memory.

    Creates a meeting from an uploaded transcript file, sharing `_create` with the JSON path.
    """
    data = _parse_upload_payload(title, meeting_date, participants_json, generate_summary)
    text = _decode_upload(filename, content)
    parsed = parse_transcript(text, detect_format(filename, text))
    return _create(db, owner, data, parsed, MeetingSource.UPLOAD, MeetingPlatform.UPLOAD)


# ── Update / delete ─────────────────────────────────────────────────────────────────────────────


def update_meeting(db: Session, owner: User, meeting_id: int, data: MeetingUpdate) -> MeetingDetail:
    """Apply a partial update (title, date, participants) and return the fresh meeting.

    Args:
        db: the request's session.
        owner: the current user.
        meeting_id: which meeting to change.
        data: PATCH body; fields left as None were not sent and stay unchanged.
    Returns:
        The updated meeting as a detail DTO.
    """
    meeting = get_owned_or_404(db, owner, meeting_id)
    try:
        # INTERVIEW: unit of work. Setting attributes on a loaded object marks it "dirty"; the
        # session writes the UPDATE when `commit()` runs. No explicit save() call is needed.
        if data.title is not None:
            meeting.title = data.title
        if data.meeting_date is not None:
            meeting.meeting_date = data.meeting_date
        if data.participants is not None:
            people = [
                participants_service.find_or_create(db, p.name, p.email) for p in data.participants
            ]
            existing = {link.participant_id: link for link in meeting.participant_links}
            # Replacing the list: dropped links are deleted (delete-orphan), kept ones are reused.
            meeting.participant_links = _build_links(people, existing)
        # Link-only edits don't touch the meetings row, so bump the timestamp by hand.
        meeting.updated_at = utcnow()
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_meeting(db, owner, meeting_id)


def delete_meeting(db: Session, owner: User, meeting_id: int) -> None:
    """Children are removed by the database's ON DELETE CASCADE (see Meeting relationships)."""
    meeting = get_owned_or_404(db, owner, meeting_id)
    repository.delete(db, meeting)
    db.commit()


# `__all__` lists the module's public API (what `from ... import *` would export).
__all__ = [
    "MAX_UPLOAD_BYTES",
    "create_meeting",
    "create_meeting_from_upload",
    "delete_meeting",
    "get_meeting",
    "list_meetings",
    "update_meeting",
]
