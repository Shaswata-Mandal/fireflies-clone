"""Prompt building and answer parsing for "ask a question about this meeting". Pure: no DB, no LLM.

The model sees transcript lines tagged `[s:<segment id>]` and is told to cite those tags. We then
parse the tags back out ourselves and only trust ids that really belong to the meeting.

WHAT: Chooses which transcript lines fit in the prompt, renders them with citation tags, and turns
    the model's answer back into clean text plus validated citations.
LAYER: Utility inside the ask module (pure functions, easy to unit-test).
CALLED BY: modules/ask/service.py.
CALLS: ask/schemas.py (citation models), transcripts models (types), summary_generator (stopwords).
MERN EQUIVALENT: the "prompt engineering" helper of a RAG-style chatbot, with citation parsing.
INTERVIEW: this is a simple retrieval step. A whole transcript may not fit the model's token limit,
so we keep the lines that share the most words with the question (plus their neighbours).
"""

import re
from collections.abc import Sequence

from app.modules.ask.schemas import Citation, WorkspaceCitation
from app.modules.transcripts.models import TranscriptSegment
from app.utils.summary_generator import MIN_WORD_LENGTH, STOPWORDS

# Rough budget (~4 chars per token) that keeps a request inside Groq's per-minute token limits.
ASK_MAX_TRANSCRIPT_CHARS = 24_000
NEIGHBOUR_RADIUS = 1  # context kept on each side of a keyword hit
GAP_MARKER = "[...]"

# The "system" messages: they fix the model's behaviour. The rule "ONLY the transcript" plus the
# tag format is what makes the answers checkable.
ASK_SYSTEM_INSTRUCTION = (
    "You answer questions about one meeting using ONLY the transcript provided by the user. "
    "If the answer is not in the transcript, say that the transcript does not contain it; never "
    "guess or use outside knowledge. Be concise. Each transcript line starts with a tag like "
    "[s:12]. After every claim, cite the supporting line(s) with their tag, e.g. [s:12]."
)

ASK_WORKSPACE_SYSTEM_INSTRUCTION = (
    "You answer questions about the user's meetings using ONLY the transcript excerpts provided "
    "by the user. Each line starts with a tag like [s:12] and shows the meeting title and time. "
    "If the answer is not in the excerpts, say so; never guess or use outside knowledge. Mention "
    "the meeting title when it helps. Be concise. After every claim, cite the supporting line(s) "
    "with their tag, e.g. [s:12]. You cannot see calendars, emails or anything outside the "
    "excerpts."
)

# Pre-compiled regexes: words (lower-case letters, digits, apostrophes), a citation tag like
# "[s:12]" (group 1 = the id), and a tag together with the spaces before it.
_WORD = re.compile(r"[a-z0-9']+")
_CITATION_TAG = re.compile(r"\[s:(\d+)\]")
_TAG_WITH_SPACE = re.compile(r"[ \t]*\[s:\d+\]")


def _format_clock(ms: int) -> str:
    """Milliseconds -> "MM:SS", or "H:MM:SS" from one hour on."""
    # divmod(a, b) returns (a // b, a % b) in one call.
    minutes, seconds = divmod(ms // 1000, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes:02d}:{seconds:02d}"


def format_line(segment: TranscriptSegment, with_meeting: bool = False) -> str:
    """One prompt line: `[s:12] [04:10] Speaker: text`.

    Args:
        segment: the transcript line (its `.meeting` must be loaded when `with_meeting` is True).
        with_meeting: include the meeting title (used when lines come from several meetings).
    Returns:
        The tagged line the model will see and cite.
    """
    clock = _format_clock(segment.start_ms)
    where = f"{segment.meeting.title}, {clock}" if with_meeting else clock
    return f"[s:{segment.id}] [{where}] {segment.speaker_label}: {segment.text.strip()}"


def _keywords(question: str) -> set[str]:
    """The meaningful words of the question: no short words, no stopwords like "the" or "and"."""
    words = _WORD.findall(question.lower())
    return {w for w in words if len(w) >= MIN_WORD_LENGTH and w not in STOPWORDS}


def select_segment_indices(
    segments: Sequence[TranscriptSegment],
    question: str,
    budget: int = ASK_MAX_TRANSCRIPT_CHARS,
    with_meeting: bool = False,
    prefer_start: bool = False,
) -> list[int]:
    """Indices (ascending) of the segments to put in the prompt, within `budget` characters.

    Everything fits → everything is kept. Otherwise: segments sharing the most words with the
    question first, then their neighbours (a hit is rarely understandable alone). A question with
    no keyword hits ("summarize this meeting") falls back to alternating start/end so both the
    opening context and the closing decisions survive.
    `prefer_start` keeps the first segments instead (for a list already ordered by importance,
    like newest meeting first).
    """
    # Cost of a line = its length + 1 for the newline between lines.
    costs = [len(format_line(s, with_meeting)) + 1 for s in segments]
    if sum(costs) <= budget:
        return list(range(len(segments)))

    keywords = _keywords(question)
    # Score of a segment = how many question keywords appear in it (set intersection).
    scores = [len(keywords & set(_WORD.findall(s.text.lower()))) for s in segments]
    # Best-scoring first; ties broken by position so the result is deterministic.
    hits = sorted((i for i, score in enumerate(scores) if score > 0), key=lambda i: (-scores[i], i))

    last = len(segments) - 1
    if hits:
        neighbours = [
            n for i in hits for step in range(1, NEIGHBOUR_RADIUS + 1) for n in (i - step, i + step)
        ]
        priority = [*hits, *neighbours]
    elif prefer_start:
        priority = list(range(len(segments)))
    else:
        # zip pairs index 0 with the last, 1 with second-last...; flattening gives
        # first, last, second, second-last, ... so both ends survive a cut.
        priority = [
            i for pair in zip(range(len(segments)), range(last, -1, -1), strict=True) for i in pair
        ]

    # Greedy fill: walk the priority list and take what still fits in the budget.
    chosen: set[int] = set()
    used = 0
    for index in priority:
        # Skip (don't stop) when a segment doesn't fit: a shorter one later still might.
        if not 0 <= index <= last or index in chosen or used + costs[index] > budget:
            continue
        chosen.add(index)
        used += costs[index]
    return sorted(chosen)


def build_transcript_text(
    segments: Sequence[TranscriptSegment], indices: Sequence[int], with_meeting: bool = False
) -> str:
    """Selected lines in order, with a marker wherever skipped segments sit between two of them."""
    lines: list[str] = []
    previous: int | None = None
    for index in indices:
        if previous is not None and index != previous + 1:
            lines.append(GAP_MARKER)
        lines.append(format_line(segments[index], with_meeting))
        previous = index
    return "\n".join(lines)


def build_prompt(transcript_text: str, question: str) -> str:
    """The user message: the transcript block followed by the question."""
    return f"Transcript:\n{transcript_text}\n\nQuestion: {question}"


def extract_cited_segments(
    raw_answer: str, segments: Sequence[TranscriptSegment]
) -> tuple[str, list[TranscriptSegment]]:
    """Strip `[s:<id>]` tags from the answer; return the segments it cites, first mention first.

    Only ids present in `segments` count: a model can invent ids or cite another user's, and
    trusting them would leak a link target. Repeats are collapsed.
    """
    # INTERVIEW: never trust model output. A citation is only kept if its id is in the list of
    # segments we ourselves put in the prompt (a dict lookup), so the model cannot point the UI
    # at another user's data.
    by_id = {s.id: s for s in segments}
    cited: dict[int, TranscriptSegment] = {}
    for match in _CITATION_TAG.finditer(raw_answer):
        segment = by_id.get(int(match.group(1)))
        if segment is not None:
            # `setdefault` keeps the first mention and ignores repeats.
            cited.setdefault(segment.id, segment)
    return _TAG_WITH_SPACE.sub("", raw_answer).strip(), list(cited.values())


def parse_answer(
    raw_answer: str, segments: Sequence[TranscriptSegment]
) -> tuple[str, list[Citation]]:
    """Clean answer text plus citations for a single-meeting question."""
    answer, cited = extract_cited_segments(raw_answer, segments)
    return answer, [
        Citation(segment_id=s.id, start_ms=s.start_ms, speaker_label=s.speaker_label) for s in cited
    ]


def parse_workspace_answer(
    raw_answer: str, segments: Sequence[TranscriptSegment]
) -> tuple[str, list[WorkspaceCitation]]:
    """Clean answer text plus citations that also name the meeting (for cross-meeting questions)."""
    answer, cited = extract_cited_segments(raw_answer, segments)
    return answer, [
        WorkspaceCitation(
            segment_id=s.id,
            start_ms=s.start_ms,
            speaker_label=s.speaker_label,
            meeting_id=s.meeting_id,
            meeting_title=s.meeting.title,
        )
        for s in cited
    ]
