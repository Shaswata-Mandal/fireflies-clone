"""Meeting business rules: create (JSON + upload share one path), list, read, patch, delete.

Transaction rule: helpers only `flush`; the public functions that write own the single `commit` and
roll back on any error, so a failed create leaves nothing behind (no orphan participants either).
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

_participants_adapter = TypeAdapter(list[ParticipantInput])


# ── Read ────────────────────────────────────────────────────────────────────────────────────────


def _preview(overview: str) -> str:
    if len(overview) <= SUMMARY_PREVIEW_MAX_CHARS:
        return overview
    return overview[: SUMMARY_PREVIEW_MAX_CHARS - 1].rstrip() + "…"


def _ordered_links(meeting: Meeting) -> list[MeetingParticipant]:
    """Host first, then by participant id, so the avatar stack is stable between requests."""
    return sorted(
        meeting.participant_links,
        key=lambda link: (link.role != ParticipantRole.HOST, link.participant_id),
    )


def _to_list_item(meeting: Meeting, open_items: int) -> MeetingListItem:
    summary = meeting.summary
    return MeetingListItem(
        id=meeting.id,
        title=meeting.title,
        meeting_date=meeting.meeting_date,
        duration_ms=meeting.duration_ms,
        platform=meeting.platform,
        participants=[
            ParticipantBrief.model_validate(link.participant) for link in _ordered_links(meeting)
        ],
        summary_preview=_preview(summary.overview) if summary else None,
        action_items_open=open_items,
        tags=[TagRead.model_validate(tag) for tag in meeting.tags],
    )


def _to_detail(meeting: Meeting) -> MeetingDetail:
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
    # Someone else's meeting looks exactly like a missing one, so ids can't be probed.
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
    rows, total = repository.list_filtered(db, owner.id, filters, sort, page, limit)
    items = [_to_list_item(meeting, open_items) for meeting, open_items in rows]
    return MeetingList(items=items, total=total, page=page, limit=limit)


def get_meeting(db: Session, owner: User, meeting_id: int) -> MeetingDetail:
    return _to_detail(get_owned_or_404(db, owner, meeting_id))


# ── Create ──────────────────────────────────────────────────────────────────────────────────────


def _build_links(
    people: list[Participant], existing: dict[int, MeetingParticipant] | None = None
) -> list[MeetingParticipant]:
    """One link per distinct person, keeping existing links (and their roles) untouched."""
    existing = existing or {}
    links: dict[int, MeetingParticipant] = {}
    for index, person in enumerate(people):
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
    """Run the summary generator; a failure is logged and the meeting is created without one."""
    try:
        return build_summary_graph(segments, people)
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
            meeting.duration_ms = max(s.end_ms for s in parsed)
        if data.generate_summary:
            generated = _generate_summary(meeting.segments, speakers)
            if generated:
                meeting.summary, meeting.chapters, meeting.action_items = generated
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
    try:
        meeting = _build_meeting(db, owner, data, parsed, source, platform)
        repository.add(db, meeting)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_meeting(db, owner, meeting.id)


def create_meeting(db: Session, owner: User, data: MeetingCreate) -> MeetingDetail:
    parsed = None
    source = MeetingSource.FORM
    if data.transcript_text is not None:
        if not data.transcript_text.strip():
            raise EmptyTranscriptError()
        fmt = data.transcript_format or detect_format("", data.transcript_text)
        parsed = parse_transcript(data.transcript_text, fmt)
        source = MeetingSource.PASTE
    return _create(db, owner, data, parsed, source, None)


def _parse_upload_payload(
    title: str, meeting_date: datetime, participants_json: str, generate_summary: bool
) -> MeetingCreate:
    try:
        participants = _participants_adapter.validate_json(participants_json or "[]")
        return MeetingCreate(
            title=title,
            meeting_date=meeting_date,
            participants=participants,
            generate_summary=generate_summary,
        )
    except PydanticValidationError as exc:
        details = [
            {"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]}
            for e in exc.errors(include_url=False, include_context=False, include_input=False)
        ]
        raise ValidationError("Invalid upload fields", details=details) from exc


def _decode_upload(filename: str, content: bytes) -> str:
    if PurePath(filename).suffix.lower() not in ALLOWED_UPLOAD_EXTENSIONS:
        raise UnsupportedFileError("Only .txt, .vtt and .json transcript files are supported")
    if len(content) > MAX_UPLOAD_BYTES:
        raise FileTooLargeError(f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit")
    try:
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
    oversize without reading an unbounded body into memory."""
    data = _parse_upload_payload(title, meeting_date, participants_json, generate_summary)
    text = _decode_upload(filename, content)
    parsed = parse_transcript(text, detect_format(filename, text))
    return _create(db, owner, data, parsed, MeetingSource.UPLOAD, MeetingPlatform.UPLOAD)


# ── Update / delete ─────────────────────────────────────────────────────────────────────────────


def update_meeting(db: Session, owner: User, meeting_id: int, data: MeetingUpdate) -> MeetingDetail:
    meeting = get_owned_or_404(db, owner, meeting_id)
    try:
        if data.title is not None:
            meeting.title = data.title
        if data.meeting_date is not None:
            meeting.meeting_date = data.meeting_date
        if data.participants is not None:
            people = [
                participants_service.find_or_create(db, p.name, p.email) for p in data.participants
            ]
            existing = {link.participant_id: link for link in meeting.participant_links}
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


__all__ = [
    "MAX_UPLOAD_BYTES",
    "create_meeting",
    "create_meeting_from_upload",
    "delete_meeting",
    "get_meeting",
    "list_meetings",
    "update_meeting",
]
