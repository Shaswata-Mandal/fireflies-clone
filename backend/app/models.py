"""Model registry: importing this module registers every table on `Base.metadata`.

Alembic, the test fixtures and the seed import it so they always see the complete schema, and string
relationship targets ("Participant") resolve. Add new modules' models here.
"""

from app.modules.action_items.models import ActionItem
from app.modules.meetings.models import Meeting, MeetingParticipant, Tag, meeting_tags
from app.modules.participants.models import Participant
from app.modules.summaries.models import Chapter, Summary
from app.modules.transcripts.models import TranscriptSegment
from app.modules.users.models import User

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
