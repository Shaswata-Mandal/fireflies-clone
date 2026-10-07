"""Export: gather a meeting's data through the owning services, then format it (pure function).

WHAT: Collects the meeting, transcript and action items (each through its own service, so
    ownership is checked) and converts them into the plain data the formatter needs.
LAYER: Service.
CALLED BY: exports/router.py.
CALLS: meetings, transcripts and action_items services, utils/export_formatter.py.
MERN EQUIVALENT: a function that assembles data from several models, then calls a template.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.action_items import service as action_items_service
from app.modules.meetings import service as meetings_service
from app.modules.transcripts import service as transcripts_service
from app.modules.users.models import User
from app.utils.export_formatter import (
    MEDIA_TYPES,
    ExportActionItem,
    ExportChapter,
    ExportData,
    ExportFormat,
    ExportSegment,
    export_filename,
    format_export,
)


@dataclass(frozen=True)
class ExportFile:
    """What the router needs to send: name, content type and text."""

    filename: str
    media_type: str
    content: str


def export_meeting(db: Session, owner: User, meeting_id: int, fmt: ExportFormat) -> ExportFile:
    """Build the export file for a meeting the user owns.

    Args:
        db: the request's session.
        owner: the current user.
        meeting_id: the meeting to export (404 if missing or not owned).
        fmt: markdown or plain text.
    Returns:
        The file name, media type and content.
    """
    meeting = meetings_service.get_owned_or_404(db, owner, meeting_id)
    segments = transcripts_service.list_segments(db, owner, meeting_id)
    items = action_items_service.list_for_meeting(db, owner, meeting_id)
    summary = meeting.summary

    # Flatten ORM objects into the formatter's own plain dataclasses, so the formatter stays pure.
    data = ExportData(
        title=meeting.title,
        meeting_date=meeting.meeting_date,
        participants=[
            link.participant.name
            for link in sorted(meeting.participant_links, key=lambda link: link.participant_id)
        ],
        overview=summary.overview if summary else None,
        bullet_points=list(summary.bullet_points) if summary else [],
        keywords=list(summary.keywords) if summary else [],
        chapters=[ExportChapter(c.title, c.start_ms) for c in meeting.chapters],
        action_items=[
            ExportActionItem(
                text=item.text,
                is_completed=item.is_completed,
                assignee_name=item.assignee.name if item.assignee else None,
                due_date=item.due_date,
            )
            for item in items
        ],
        segments=[ExportSegment(s.speaker_label, s.start_ms, s.text) for s in segments],
    )
    return ExportFile(
        filename=export_filename(meeting.title, fmt),
        media_type=MEDIA_TYPES[fmt],
        content=format_export(data, fmt),
    )
