"""Participant lookup/search; shared by the meetings and action-items services."""

import zlib

from sqlalchemy.orm import Session

from app.modules.participants import repository
from app.modules.participants.models import Participant
from app.modules.users.models import User

# Same palette family as the seed data, so generated avatars match the theme.
AVATAR_COLORS = (
    "#7c3aed",
    "#2563eb",
    "#059669",
    "#d97706",
    "#db2777",
    "#0891b2",
    "#4f46e5",
    "#dc2626",
)


def _avatar_color(name: str) -> str:
    # crc32 (not hash()) because str hashing is randomised per process; the colour must be stable.
    return AVATAR_COLORS[zlib.crc32(name.lower().encode()) % len(AVATAR_COLORS)]


def find_or_create(db: Session, name: str, email: str | None = None) -> Participant:
    """Reuse an existing person or create one; does not commit.

    With an email the email is the identity (names collide, emails don't). Without one we fall back
    to a case-insensitive name match, since transcript speakers are known only by label.
    """
    name = name.strip()
    email = email.strip().lower() if email and email.strip() else None
    existing = repository.get_by_email(db, email) if email else repository.get_by_name_ci(db, name)
    if existing is not None:
        return existing
    return repository.create(db, name, email, _avatar_color(name))


def list_participants(db: Session, owner: User, q: str | None) -> list[Participant]:
    """People from the owner's own meetings only; never leaks participants of other users."""
    return repository.search_for_owner(db, owner.id, q.strip() if q else None)


def is_in_meeting(db: Session, meeting_id: int, participant_id: int) -> bool:
    return repository.is_in_meeting(db, meeting_id, participant_id)
