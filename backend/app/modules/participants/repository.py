"""Participant queries only: no business decisions.

WHAT: SQLAlchemy queries to find a participant by email or name, create one, search the owner's
    participants and check meeting membership.
LAYER: Repository.
CALLED BY: participants/service.py only.
CALLS: SQLAlchemy `select`, Participant and Meeting models, core/sql helpers.
MERN EQUIVALENT: Mongoose `Participant.findOne({ email })` style queries kept in a DAO file.
"""

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.sql import LIKE_ESCAPE_CHAR, escape_like
from app.modules.meetings.models import Meeting, MeetingParticipant
from app.modules.participants.models import Participant

MAX_SEARCH_RESULTS = 100


def get_by_email(db: Session, email: str) -> Participant | None:
    """Find a participant by email, ignoring case. Returns None if there is none."""
    # `db.scalar(...)` returns the first column of the first row, or None for no rows.
    return db.scalar(select(Participant).where(func.lower(Participant.email) == email.lower()))


def get_by_name_ci(db: Session, name: str) -> Participant | None:
    """Oldest participant whose name matches ignoring case (stable when names collide)."""
    return db.scalar(
        select(Participant)
        .where(func.lower(Participant.name) == name.lower())
        .order_by(Participant.id)
        .limit(1)
    )


def create(db: Session, name: str, email: str | None, avatar_color: str) -> Participant:
    """Add and flush (never commit): the caller owns the transaction.

    Args:
        db: the session.
        name, email, avatar_color: the new participant's fields.
    Returns:
        The new Participant, whose `id` is filled in because of the flush.
    """
    participant = Participant(name=name, email=email, avatar_color=avatar_color)
    db.add(participant)
    db.flush()
    return participant


def search_for_owner(db: Session, owner_id: int, q: str | None) -> list[Participant]:
    """Participants who attend at least one of the owner's meetings, filtered by name/email.

    Args:
        db: the session.
        owner_id: only people from this user's meetings are returned.
        q: optional text matched against name or email (case-insensitive, contains).
    Returns:
        Up to MAX_SEARCH_RESULTS participants sorted by name.
    """
    # EXISTS rather than JOIN: a person in many meetings must appear once.
    attends_owned_meeting = (
        select(MeetingParticipant.participant_id)
        .join(Meeting, Meeting.id == MeetingParticipant.meeting_id)
        .where(MeetingParticipant.participant_id == Participant.id, Meeting.owner_id == owner_id)
        .exists()
    )
    statement = select(Participant).where(attends_owned_meeting)
    if q:
        pattern = f"%{escape_like(q)}%"
        statement = statement.where(
            or_(
                Participant.name.ilike(pattern, escape=LIKE_ESCAPE_CHAR),
                Participant.email.ilike(pattern, escape=LIKE_ESCAPE_CHAR),
            )
        )
    # `db.scalars` yields model objects (not row tuples); `list(...)` runs the query.
    return list(
        db.scalars(
            statement.order_by(func.lower(Participant.name), Participant.id).limit(
                MAX_SEARCH_RESULTS
            )
        )
    )


def is_in_meeting(db: Session, meeting_id: int, participant_id: int) -> bool:
    """True if the participant has a link row for that meeting."""
    return (
        db.scalar(
            select(MeetingParticipant.meeting_id).where(
                MeetingParticipant.meeting_id == meeting_id,
                MeetingParticipant.participant_id == participant_id,
            )
        )
        is not None
    )
