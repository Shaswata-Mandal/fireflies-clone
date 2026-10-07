"""Meeting summary generation: one interface, a deterministic mock and an LLM implementation.

Pure module: no DB, no FastAPI. Callers pass plain `SegmentInput`s and get a `GeneratedSummary`
back; `source_segment_index` is the position in the input list, so the service layer can map it to
a real `transcript_segments.id`. The LLM generator never raises: on any failure it logs a warning
and returns the mock's result, so the app works the same with or without an API key.
"""

import logging
import re
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Protocol

from pydantic import BaseModel, Field, ValidationError

from app.utils.llm_client import generate_text

if TYPE_CHECKING:
    # Type-only: importing app.core.config would build Settings (and require env vars) on import.
    from app.core.config import Settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MS_PER_SECOND = 1000
SECONDS_PER_MINUTE = 60

MIN_KEYWORDS = 6
MAX_KEYWORDS = 8
MIN_CHAPTERS = 4
MAX_CHAPTERS = 6
SEGMENTS_PER_CHAPTER = 5  # aim for roughly this many segments per chapter before clamping
CHAPTER_TITLE_KEYWORDS = 3
MAX_ACTION_ITEMS = 10
ACTION_TEXT_MAX_CHARS = 500  # matches action_items.text limit in docs/schema.md
OPENING_QUOTE_MAX_CHARS = 120
BULLET_SNIPPET_MAX_CHARS = 140
MIN_WORD_LENGTH = 3

EMPTY_OVERVIEW = "No transcript content to summarize."

# Rough budget: ~4 chars per token, so this stays well inside typical context windows.
MAX_PROMPT_CHARS = 60_000
OMITTED_MARKER = "[... {count} segments omitted to fit the context window ...]"

# One space-separated blob is far easier to review and extend than a 150-item list literal.
STOPWORDS = frozenset("""
    a about above after again all also am an and any are aren't as at be because been before
    being below between both but by can can't cannot could couldn't did didn't do does doesn't
    doing don't down during each few for from further get gets getting go going got had hadn't
    has hasn't have haven't having he her here hers him his how i i'd i'll i'm i've if in into
    is isn't it it's its just let let's like me more most much my no nor not now of off okay on
    once one only or other our ours out over own really right same say she should shouldn't so
    some such than that that's the their theirs them then there there's these they they'd
    they'll they're they've think this those through to too under until up very want was wasn't
    we we'd we'll we're we've well were weren't what what's when where which while who whom why
    will with won't would wouldn't yeah yes you you'd you'll you're you've your yours thing
    things know mean actually sure thanks thank maybe kind sort bit lot guys gonna wanna need
    make
    """.split())  # noqa: SIM905

_WORD = re.compile(r"[a-z][a-z']*")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_CODE_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)
_WEEKDAYS = "monday|tuesday|wednesday|thursday|friday|saturday|sunday"
_ACTION_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\bI'll\b",
        r"\bI will\b",
        r"\bwe need to\b",
        r"\bcan you\b",
        r"\baction item\b",
        r"\blet'?s make sure\b",
        rf"\bby (?:{_WEEKDAYS}|end of (?:the )?(?:day|week))\b",
    )
)


# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SegmentInput:
    speaker_label: str
    start_ms: int
    end_ms: int
    text: str


@dataclass(frozen=True)
class GeneratedChapter:
    title: str
    start_ms: int


@dataclass(frozen=True)
class GeneratedActionItem:
    text: str
    assignee_label: str | None  # a speaker_label from the input, or None if unknown
    source_segment_index: int | None  # index into the input list; None if the model gave none


@dataclass(frozen=True)
class GeneratedSummary:
    overview: str
    bullet_points: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    chapters: list[GeneratedChapter] = field(default_factory=list)
    action_items: list[GeneratedActionItem] = field(default_factory=list)


class SummaryGenerator(Protocol):
    def generate(self, segments: Sequence[SegmentInput]) -> GeneratedSummary: ...


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _truncate(text: str, max_chars: int) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1].rstrip() + "…"


def _first_sentence(text: str) -> str:
    return _SENTENCE_SPLIT.split(text.strip(), maxsplit=1)[0]


def _format_clock(ms: int) -> str:
    total_seconds = ms // MS_PER_SECOND
    return f"{total_seconds // SECONDS_PER_MINUTE:02d}:{total_seconds % SECONDS_PER_MINUTE:02d}"


# ---------------------------------------------------------------------------
# Mock generator (deterministic, no network)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class _Window:
    """A contiguous run of segments that becomes one chapter."""

    first_index: int
    segments: list[SegmentInput]


def _ranked_words(texts: Sequence[str]) -> list[str]:
    """Words ordered by frequency; ties break alphabetically so the output is stable."""
    counts: Counter[str] = Counter()
    for text in texts:
        for word in _WORD.findall(text.lower().replace("’", "'")):
            word = word.removesuffix("'s")
            if len(word) >= MIN_WORD_LENGTH and word not in STOPWORDS:
                counts[word] += 1
    return [word for word, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0]))]


def _split_into_windows(segments: Sequence[SegmentInput]) -> list[_Window]:
    """Cut the meeting into equal time windows (4–6), dropping any that contain no segment."""
    window_count = min(
        len(segments), max(MIN_CHAPTERS, min(MAX_CHAPTERS, len(segments) // SEGMENTS_PER_CHAPTER))
    )
    start = segments[0].start_ms
    span = max(1, segments[-1].end_ms - start)
    windows: dict[int, _Window] = {}
    for index, segment in enumerate(segments):
        slot = min(window_count - 1, max(0, (segment.start_ms - start) * window_count // span))
        window = windows.setdefault(slot, _Window(first_index=index, segments=[]))
        window.segments.append(segment)
    return [windows[slot] for slot in sorted(windows)]


class MockSummaryGenerator:
    """Heuristic summary: word frequency, time-window chapters and regex action items."""

    def generate(self, segments: Sequence[SegmentInput]) -> GeneratedSummary:
        if not segments:
            return GeneratedSummary(overview=EMPTY_OVERVIEW)

        ranked = _ranked_words([segment.text for segment in segments])
        keywords = [word.title() for word in ranked[:MAX_KEYWORDS]]
        chapters, bullets = self._build_chapters(segments, ranked[:1])
        action_items = self._extract_action_items(segments)
        return GeneratedSummary(
            overview=self._build_overview(segments, keywords, len(action_items)),
            bullet_points=bullets,
            keywords=keywords,
            chapters=chapters,
            action_items=action_items,
        )

    def _build_chapters(
        self, segments: Sequence[SegmentInput], global_top: list[str]
    ) -> tuple[list[GeneratedChapter], list[str]]:
        chapters: list[GeneratedChapter] = []
        bullets: list[str] = []
        for number, window in enumerate(_split_into_windows(segments), start=1):
            # The meeting-wide top word would title every chapter the same, so skip it when
            # the window offers alternatives.
            words = _ranked_words([segment.text for segment in window.segments])
            distinct = [word for word in words if word not in global_top] or words
            title = ", ".join(w.title() for w in distinct[:CHAPTER_TITLE_KEYWORDS]) or (
                f"Part {number}"
            )
            chapters.append(GeneratedChapter(title=title, start_ms=window.segments[0].start_ms))
            # Short replies ("Yes.") make poor bullets, so quote the most substantial sentence.
            sentences = [_first_sentence(segment.text) for segment in window.segments]
            snippet = _truncate(max(sentences, key=len), BULLET_SNIPPET_MAX_CHARS)
            bullets.append(f"{title}: {snippet}")
        return chapters, bullets

    def _extract_action_items(self, segments: Sequence[SegmentInput]) -> list[GeneratedActionItem]:
        items: list[GeneratedActionItem] = []
        for index, segment in enumerate(segments):
            sentence = self._matching_sentence(segment.text)
            if sentence is None:
                continue
            items.append(
                GeneratedActionItem(
                    text=_truncate(sentence, ACTION_TEXT_MAX_CHARS),
                    assignee_label=segment.speaker_label,
                    source_segment_index=index,
                )
            )
            if len(items) == MAX_ACTION_ITEMS:
                break
        return items

    @staticmethod
    def _matching_sentence(text: str) -> str | None:
        for sentence in _SENTENCE_SPLIT.split(text.replace("’", "'").strip()):
            if any(pattern.search(sentence) for pattern in _ACTION_PATTERNS):
                return sentence.strip()
        return None

    @staticmethod
    def _build_overview(
        segments: Sequence[SegmentInput], keywords: list[str], action_count: int
    ) -> str:
        speakers = {segment.speaker_label for segment in segments}
        speaker_word = "speaker" if len(speakers) == 1 else "speakers"
        topics = ", ".join(keywords[:3]) if keywords else "general discussion"
        sentences = [
            f"This meeting had {len(speakers)} {speaker_word} and focused on {topics}.",
            f"{segments[0].speaker_label} opened with: "
            f"“{_truncate(_first_sentence(segments[0].text), OPENING_QUOTE_MAX_CHARS)}”",
        ]
        if action_count:
            noun = "action item was" if action_count == 1 else "action items were"
            sentences.append(f"{action_count} {noun} identified.")
        return " ".join(sentences)


# ---------------------------------------------------------------------------
# LLM generator (Groq) with mock fallback
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You summarize meeting transcripts. Reply with a single strict JSON object and nothing else "
    "(no prose, no code fences), using "
    'exactly these keys: "overview" (string, 2-3 sentences), "bullet_points" (array of 4-6 '
    'strings), "keywords" (array of 6-8 short topic strings), "chapters" (array of 4-6 objects '
    'with "title" and "start_ms" in integer milliseconds), "action_items" (array of objects with '
    '"text", "assignee" (a speaker name from the transcript, or null) and '
    '"source_segment_index" (the [number] of the transcript line it came from, or null)).'
)


class _LLMChapter(BaseModel):
    title: str = Field(min_length=1)
    start_ms: int = Field(ge=0)


class _LLMActionItem(BaseModel):
    text: str = Field(min_length=1)
    assignee: str | None = None
    source_segment_index: int | None = None


class _LLMResponse(BaseModel):
    overview: str = Field(min_length=1)
    bullet_points: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    chapters: list[_LLMChapter] = Field(default_factory=list)
    action_items: list[_LLMActionItem] = Field(default_factory=list)


def build_transcript_prompt(segments: Sequence[SegmentInput]) -> str:
    """Render `[index] [mm:ss] Speaker: text` lines, dropping the middle if it is too long.

    Head and tail are kept because meetings open with context and close with decisions/next steps.
    Original indices are preserved so action-item links still point at the right segment.
    """
    lines = [
        f"[{index}] [{_format_clock(s.start_ms)}] {s.speaker_label}: {s.text.strip()}"
        for index, s in enumerate(segments)
    ]
    if sum(len(line) + 1 for line in lines) <= MAX_PROMPT_CHARS:
        return "\n".join(lines)

    half_budget = MAX_PROMPT_CHARS // 2
    head: list[str] = []
    used = 0
    for line in lines:
        if used + len(line) > half_budget:
            break
        head.append(line)
        used += len(line) + 1
    tail: list[str] = []
    used = 0
    for line in reversed(lines[len(head) :]):
        if used + len(line) > half_budget:
            break
        tail.append(line)
        used += len(line) + 1
    tail.reverse()
    omitted = len(lines) - len(head) - len(tail)
    return "\n".join([*head, OMITTED_MARKER.format(count=omitted), *tail])


class LLMSummaryGenerator:
    """Asks the model for strict JSON, validates it, and falls back to `fallback` on any failure."""

    def __init__(self, fallback: SummaryGenerator) -> None:
        self._fallback = fallback

    def generate(self, segments: Sequence[SegmentInput]) -> GeneratedSummary:
        if not segments:
            return self._fallback.generate(segments)
        try:
            return self._generate_with_llm(segments)
        except Exception as exc:  # noqa: BLE001 - every failure mode must degrade to the mock
            logger.warning(
                "LLM summary failed (%s: %s); using mock generator", type(exc).__name__, exc
            )
            return self._fallback.generate(segments)

    def _generate_with_llm(self, segments: Sequence[SegmentInput]) -> GeneratedSummary:
        content = generate_text(
            build_transcript_prompt(segments), system_instruction=_SYSTEM_PROMPT
        )
        try:
            parsed = _LLMResponse.model_validate_json(_CODE_FENCE.sub("", content.strip()))
        except ValidationError as exc:
            raise ValueError(f"model returned invalid JSON: {exc.error_count()} errors") from exc
        return self._to_generated(parsed, segments)

    @staticmethod
    def _to_generated(parsed: _LLMResponse, segments: Sequence[SegmentInput]) -> GeneratedSummary:
        known_speakers = {segment.speaker_label for segment in segments}
        action_items = [
            GeneratedActionItem(
                text=_truncate(item.text, ACTION_TEXT_MAX_CHARS),
                assignee_label=item.assignee if item.assignee in known_speakers else None,
                source_segment_index=(
                    item.source_segment_index
                    if item.source_segment_index is not None
                    and 0 <= item.source_segment_index < len(segments)
                    else None
                ),
            )
            for item in parsed.action_items
        ]
        return GeneratedSummary(
            overview=parsed.overview,
            bullet_points=parsed.bullet_points,
            keywords=parsed.keywords,
            chapters=[GeneratedChapter(c.title, c.start_ms) for c in parsed.chapters],
            action_items=action_items,
        )


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def get_summary_generator(settings: "Settings") -> SummaryGenerator:
    """LLM generator when an API key is configured, otherwise the deterministic mock."""
    mock = MockSummaryGenerator()
    if not settings.GROQ_API_KEY:
        return mock
    return LLMSummaryGenerator(fallback=mock)
