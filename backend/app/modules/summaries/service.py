"""Summary business rules: regenerate (replace, never duplicate) and manual edit."""

from sqlalchemy.orm import Session

from app.core.db_types import utcnow
from app.core.exceptions import EmptyTranscriptError, NotFoundError
from app.modules.action_items import service as action_items_service
from app.modules.meetings import service as meetings_service
from app.modules.meetings.schemas import ChapterRead, SummaryRead
from app.modules.participants.models import Participant
from app.modules.summaries import repository
from app.modules.summaries.builder import build_summary_graph
from app.modules.summaries.schemas import (
    SummaryGenerateRequest,
    SummaryGenerateResponse,
    SummaryUpdate,
)
from app.modules.transcripts import service as transcripts_service
from app.modules.users.models import User


def generate_summary(
    db: Session, owner: User, meeting_id: int, data: SummaryGenerateRequest
) -> SummaryGenerateResponse:
    """Regenerate summary + chapters (and optionally append action items) in ONE transaction.

    The summary row is updated in place (UNIQUE meeting_id → at most one row ever) and chapters are
    deleted then re-inserted, so regenerating twice never leaves duplicates. Any failure rolls back
    and the previous summary is kept.
    """
    segments = transcripts_service.list_segments(db, owner, meeting_id)  # also checks ownership
    if not segments:
        raise EmptyTranscriptError()

    people: dict[str, Participant | None] = {s.speaker_label: s.participant for s in segments}
    try:
        generated, chapters, action_items = build_summary_graph(segments, people)
        summary = repository.get_by_meeting(db, meeting_id)
        if summary is None:
            summary = generated
            summary.meeting_id = meeting_id
            repository.add(db, summary)
        else:
            summary.overview = generated.overview
            summary.bullet_points = generated.bullet_points
            summary.keywords = generated.keywords
            summary.generated_by = generated.generated_by
            summary.updated_at = utcnow()

        repository.delete_chapters(db, meeting_id)
        for chapter in chapters:
            chapter.meeting_id = meeting_id
        repository.add(db, *chapters)

        if data.include_action_items:
            action_items_service.append_generated(db, meeting_id, action_items)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return SummaryGenerateResponse(
        summary=SummaryRead.model_validate(summary),
        chapters=[ChapterRead.model_validate(c) for c in repository.list_chapters(db, meeting_id)],
    )


def update_summary(db: Session, owner: User, meeting_id: int, data: SummaryUpdate) -> SummaryRead:
    """Manual edit of overview / bullet_points / keywords.

    `generated_by` is left unchanged on purpose: the enum (and its DB CHECK constraint) only has
    seed | mock | llm, and a "manual" value would need a migration.
    """
    meetings_service.get_owned_or_404(db, owner, meeting_id)
    summary = repository.get_by_meeting(db, meeting_id)
    if summary is None:
        raise NotFoundError("SUMMARY_NOT_FOUND", f"Meeting {meeting_id} has no summary")
    for name in data.model_fields_set:
        setattr(summary, name, getattr(data, name))
    summary.updated_at = utcnow()
    db.commit()
    return SummaryRead.model_validate(summary)
