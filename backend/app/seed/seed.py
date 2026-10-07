"""Idempotent database seed: `python -m app.seed.seed`, also called on startup (see main.py).

This is a script, not an HTTP module, so it talks to the session directly instead of going through
router → service → repository. Files are all validated *before* the first insert, then each meeting
is written in its own transaction.

WHAT: Loads the demo meetings from `seed/data/*.json` into the database when it is empty.
LAYER: Script (deliberate exception to the layering rule, see docs decision 35).
CALLED BY: main.py's `lifespan` at startup, and the CLI `python -m app.seed.seed`.
CALLS: seed/schemas.py (validation of the JSON), the ORM models, users repository.
MERN EQUIVALENT: a `seed.js` that runs `Model.insertMany(...)` if the collection is empty.
"""

import logging
import sys
from pathlib import Path

from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.deps import DEFAULT_USER_ID
from app.models import (
    ActionItem,
    Chapter,
    Meeting,
    MeetingParticipant,
    Participant,
    Summary,
    Tag,
    TranscriptSegment,
    User,
)
from app.modules.users import repository as users_repository
from app.seed.schemas import SeedMeeting, SeedParticipant

logger = logging.getLogger(__name__)

# `__file__` is this file's path, so the data folder is found whatever the working directory is.
SEED_DATA_DIR = Path(__file__).parent / "data"
DEFAULT_USER_NAME = "Alex Morgan"
DEFAULT_USER_EMAIL = "alex.morgan@northwind.example"
DEFAULT_TAG_COLOR = "#7c3aed"
TAG_COLORS = {
    "Roadmap": "#7c3aed",
    "Product": "#2563eb",
    "Sales": "#059669",
    "Hiring": "#d97706",
    "Retro": "#db2777",
    "Onboarding": "#0891b2",
    "Investors": "#4f46e5",
}


class SeedDataError(Exception):
    """A seed file is malformed. The message always names the file."""


# ── Loading & validation ────────────────────────────────────────────────────────────────────────


def _parse_file(path: Path) -> SeedMeeting:
    """Read one JSON file and validate it against the `SeedMeeting` schema.

    Raises:
        SeedDataError naming the file, so a typo in seed data is easy to find.
    """
    try:
        return SeedMeeting.model_validate_json(path.read_text(encoding="utf-8"))
    except ValidationError as exc:
        details = "; ".join(error["msg"] for error in exc.errors())
        raise SeedDataError(f"{path.name}: {details}") from exc


def _check_shared_participants(files: list[tuple[str, SeedMeeting]]) -> None:
    """The same email in two files must describe the same person, since it becomes one DB row."""
    seen: dict[str, tuple[str, SeedParticipant]] = {}
    for filename, meeting in files:
        for person in meeting.participants:
            # `setdefault` returns the stored value if the key exists, else stores and returns ours.
            first_file, first = seen.setdefault(person.email, (filename, person))
            if (first.name, first.avatar_color) != (person.name, person.avatar_color):
                raise SeedDataError(
                    f"{filename}: participant {person.email} differs from {first_file} "
                    "(name or avatar_color)"
                )


def load_seed_files(directory: Path = SEED_DATA_DIR) -> list[SeedMeeting]:
    """Parse and validate every `*.json` in `directory` (sorted by name) without touching the DB.

    Args:
        directory: folder with the seed files (a parameter so tests can use their own).
    Returns:
        The validated meetings, in file-name order.
    """
    paths = sorted(directory.glob("*.json"))
    if not paths:
        raise SeedDataError(f"{directory}: no seed files found")
    files = [(path.name, _parse_file(path)) for path in paths]
    _check_shared_participants(files)
    return [meeting for _, meeting in files]


# ── Inserting ───────────────────────────────────────────────────────────────────────────────────


def _ensure_default_user(db: Session) -> None:
    """`get_current_user` depends on user id=1, so it must exist even if meetings already do."""
    if users_repository.get_by_id(db, DEFAULT_USER_ID) is None:
        db.add(User(id=DEFAULT_USER_ID, name=DEFAULT_USER_NAME, email=DEFAULT_USER_EMAIL))
        db.commit()


def _get_or_create_participant(db: Session, data: SeedParticipant) -> Participant:
    """Reuse a participant with the same email (shared across seed files) or add a new one."""
    participant = db.scalar(select(Participant).where(Participant.email == data.email))
    if participant is None:
        participant = Participant(name=data.name, email=data.email, avatar_color=data.avatar_color)
        db.add(participant)
    return participant


def _get_or_create_tag(db: Session, name: str) -> Tag:
    """Reuse a tag by name or add it with its themed colour."""
    tag = db.scalar(select(Tag).where(Tag.name == name))
    if tag is None:
        tag = Tag(name=name, color=TAG_COLORS.get(name, DEFAULT_TAG_COLOR))
        db.add(tag)
    return tag


def _insert_meeting(db: Session, data: SeedMeeting) -> None:
    """Build the whole object graph; relationships let SQLAlchemy order the INSERTs and fill FKs.

    INTERVIEW: we never set `meeting_id` by hand. Putting child objects in the parent's
    relationship lists lets the ORM insert the parent first and fill each foreign key.
    """
    # Local key (e.g. "alex") -> Participant, so segments and action items can refer to people.
    people = {p.key: _get_or_create_participant(db, p) for p in data.participants}
    segments = [
        TranscriptSegment(
            participant=people[s.speaker],
            # Label is the display name, as a parsed transcript file would have it.
            speaker_label=people[s.speaker].name,
            start_ms=s.start_ms,
            end_ms=s.end_ms,
            text=s.text,
            position=i,
        )
        for i, s in enumerate(data.segments)
    ]
    action_items = [
        ActionItem(
            text=item.text,
            assignee=people[item.assignee] if item.assignee else None,
            due_date=item.due_date,
            is_completed=item.is_completed,
            # Seed data has no real completion time; the meeting date keeps it deterministic.
            completed_at=data.meeting_date if item.is_completed else None,
            # Index into the `segments` list built above, not a database id (none exists yet).
            source_segment=(
                segments[item.source_segment] if item.source_segment is not None else None
            ),
            position=i,
        )
        for i, item in enumerate(data.action_items)
    ]
    db.add(
        Meeting(
            owner_id=DEFAULT_USER_ID,
            title=data.title,
            meeting_date=data.meeting_date,
            duration_ms=data.duration_ms,
            media_url=data.media_url,
            source=data.source,
            platform=data.platform,
            tags=[_get_or_create_tag(db, name) for name in data.tags],
            participant_links=[
                MeetingParticipant(participant=people[p.key], role=p.role)
                for p in data.participants
            ],
            # `**dict` unpacks the validated summary fields into keyword arguments.
            summary=Summary(**data.summary.model_dump()),
            chapters=[
                Chapter(title=c.title, start_ms=c.start_ms, position=i)
                for i, c in enumerate(data.chapters)
            ],
            segments=segments,
            action_items=action_items,
        )
    )


def seed_if_empty(db: Session, directory: Path = SEED_DATA_DIR) -> bool:
    """Seed when there are no meetings. Returns True if anything was inserted.

    Args:
        db: a session (the caller opens and closes it).
        directory: where to read seed files from.
    Returns:
        True if meetings were inserted, False if the DB already had some.
    Why idempotent: it runs on every startup, so running it twice must change nothing.
    """
    _ensure_default_user(db)
    if db.scalar(select(func.count()).select_from(Meeting)):
        return False

    meetings = load_seed_files(directory)  # all files validated before the first insert
    for data in meetings:
        try:
            _insert_meeting(db, data)
            db.commit()  # one transaction per meeting
        except Exception:
            db.rollback()
            raise
    return True


def main() -> int:
    """CLI entry point. Returns the process exit code (0 = ok, 1 = bad seed data)."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    with SessionLocal() as db:
        try:
            seeded = seed_if_empty(db)
        except SeedDataError as exc:
            logger.error("Seed failed: %s", exc)
            return 1
    logger.info("Seeded meetings" if seeded else "Skipped: database already has meetings")
    return 0


# True only when run as `python -m app.seed.seed`, not when main.py imports this module.
if __name__ == "__main__":
    sys.exit(main())
