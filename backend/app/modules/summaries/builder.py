"""Turns generator output into ORM objects. DB-free, so both meetings (create) and summaries
(regenerate) can use it without importing each other's services.

WHAT: Runs the summary generator (LLM or mock) and converts its plain result into unsaved
    Summary, Chapter and ActionItem ORM objects.
LAYER: Helper between service and utils (no DB access).
CALLED BY: meetings/service.py (summary on create) and summaries/service.py (regenerate).
CALLS: utils/summary_generator.py and the ORM model classes.
MERN EQUIVALENT: a mapper function that turns an OpenAI response into Mongoose documents.
"""

from app.core.config import settings
from app.core.enums import GeneratedBy
from app.modules.action_items.models import ActionItem
from app.modules.participants.models import Participant
from app.modules.summaries.models import Chapter, Summary
from app.modules.transcripts.models import TranscriptSegment
from app.utils.summary_generator import SegmentInput, get_summary_generator


def current_generated_by() -> GeneratedBy:
    """Label new summaries as LLM when a Groq key is configured, otherwise MOCK."""
    return GeneratedBy.LLM if settings.GROQ_API_KEY else GeneratedBy.MOCK


def build_summary_graph(
    segments: list[TranscriptSegment], people: dict[str, Participant | None]
) -> tuple[Summary, list[Chapter], list[ActionItem]]:
    """Run the generator and map its output to unsaved ORM objects.

    `people` maps a speaker label to a participant so extracted action items get an assignee.
    Raises whatever the generator raises: callers decide whether that is fatal.

    Args:
        segments: the transcript lines to summarise, in order.
        people: speaker label -> Participant (or None when unknown).
    Returns:
        (summary, chapters, action_items), none of them added to a session yet.
    """
    # Convert ORM rows to a plain input type so the generator knows nothing about the database.
    inputs = [SegmentInput(s.speaker_label, s.start_ms, s.end_ms, s.text) for s in segments]
    # INTERVIEW: the factory returns the LLM generator or the mock with the same interface
    # (strategy pattern), so this code doesn't care which one runs.
    generated = get_summary_generator(settings).generate(inputs)

    summary = Summary(
        overview=generated.overview,
        bullet_points=generated.bullet_points,
        keywords=generated.keywords,
        generated_by=current_generated_by(),
    )
    chapters = [
        Chapter(title=c.title, start_ms=c.start_ms, position=i)
        for i, c in enumerate(generated.chapters)
    ]
    action_items = []
    for position, item in enumerate(generated.action_items):
        index = item.source_segment_index
        source_segment = None
        # Guard against a bad index (the LLM could return one out of range).
        if index is not None and 0 <= index < len(segments):
            source_segment = segments[index]
        action_items.append(
            ActionItem(
                text=item.text,
                assignee=people.get(item.assignee_label) if item.assignee_label else None,
                source_segment=source_segment,
                position=position,
            )
        )
    return summary, chapters, action_items
