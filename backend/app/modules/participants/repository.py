from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.participants.models import Participant


def get_by_email(db: Session, email: str) -> Participant | None:
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
    """Add and flush (never commit): the caller owns the transaction."""
    participant = Participant(name=name, email=email, avatar_color=avatar_color)
    db.add(participant)
    db.flush()
    return participant
