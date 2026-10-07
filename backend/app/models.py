"""Model registry: importing this module registers every table on `Base.metadata`.

Alembic, the test fixtures and the seed import it so they always see the complete schema, and string
relationship targets ("Participant") resolve. Add new modules' models here.

WHAT: A list of imports whose only job is a side effect: loading every model class.
LAYER: Core wiring (no logic).
CALLED BY: main.py, alembic/env.py, the seed script and tests/conftest.py.
CALLS: every module's models.py.
MERN EQUIVALENT: a `models/index.js` that `require`s every Mongoose model so they are all
    registered before `populate()` is used.
INTERVIEW: SQLAlchemy only knows about a table once its model class has been imported. Relationships
between modules refer to each other by name ("Participant"), so ALL models must be loaded before
the first query, or those names cannot be resolved.
"""

from app.modules.action_items.models import ActionItem
from app.modules.meetings.models import Meeting, MeetingParticipant, Tag, meeting_tags
from app.modules.participants.models import Participant
from app.modules.summaries.models import Chapter, Summary
from app.modules.transcripts.models import TranscriptSegment
from app.modules.users.models import User

# `__all__` marks these names as intentional re-exports (it also stops linters reporting the
# imports above as unused).
__all__ = [
    "ActionItem",
    "Chapter",
    "Meeting",
    "MeetingParticipant",
    "Participant",
    "Summary",
    "Tag",
    "TranscriptSegment",
    "User",
    "meeting_tags",
]
