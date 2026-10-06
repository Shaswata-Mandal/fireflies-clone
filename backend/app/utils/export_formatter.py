"""Meeting export formatting (.txt / .md).

Pure module: no DB, no FastAPI. The service flattens ORM rows into `ExportData` and these functions
turn it into text, so the output is unit-testable without a database.
"""

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from enum import StrEnum

MS_PER_SECOND = 1000
SECONDS_PER_MINUTE = 60
SECONDS_PER_HOUR = 3600
FALLBACK_FILENAME = "meeting"
DATE_FORMAT = "%Y-%m-%d %H:%M UTC"

_NON_SLUG_CHARS = re.compile(r"[^a-z0-9]+")


class ExportFormat(StrEnum):
    TXT = "txt"
    MD = "md"


MEDIA_TYPES = {
    ExportFormat.TXT: "text/plain; charset=utf-8",
    ExportFormat.MD: "text/markdown; charset=utf-8",
}


@dataclass(frozen=True)
class ExportChapter:
    title: str
    start_ms: int


@dataclass(frozen=True)
class ExportActionItem:
    text: str
    is_completed: bool
    assignee_name: str | None = None
    due_date: date | None = None


@dataclass(frozen=True)
class ExportSegment:
    speaker_label: str
    start_ms: int
    text: str


@dataclass(frozen=True)
class ExportData:
    title: str
    meeting_date: datetime
    participants: list[str] = field(default_factory=list)
    overview: str | None = None
    bullet_points: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    chapters: list[ExportChapter] = field(default_factory=list)
    action_items: list[ExportActionItem] = field(default_factory=list)
    segments: list[ExportSegment] = field(default_factory=list)


def slugify(title: str) -> str:
    """`Q4 Roadmap Sync!` -> `q4-roadmap-sync`; accents folded; never returns an empty string."""
    folded = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    slug = _NON_SLUG_CHARS.sub("-", folded.lower()).strip("-")
    return slug or FALLBACK_FILENAME


def format_timestamp(ms: int) -> str:
    """Milliseconds -> `HH:MM:SS` (hours are always shown, matching the transcript file format)."""
    total_seconds = max(ms, 0) // MS_PER_SECOND
    hours, remainder = divmod(total_seconds, SECONDS_PER_HOUR)
    minutes, seconds = divmod(remainder, SECONDS_PER_MINUTE)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def export_filename(title: str, fmt: ExportFormat) -> str:
    return f"{slugify(title)}.{fmt.value}"


def _format_date(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime(DATE_FORMAT)


def _transcript_lines(data: ExportData) -> list[str]:
    return [f"[{format_timestamp(s.start_ms)}] {s.speaker_label}: {s.text}" for s in data.segments]


def _action_item_line(item: ExportActionItem) -> str:
    box = "[x]" if item.is_completed else "[ ]"
    details = []
    if item.assignee_name:
        details.append(f"@{item.assignee_name}")
    if item.due_date:
        details.append(f"due {item.due_date.isoformat()}")
    suffix = f" ({', '.join(details)})" if details else ""
    return f"- {box} {item.text}{suffix}"


def format_txt(data: ExportData) -> str:
    lines = [data.title, f"Date: {_format_date(data.meeting_date)}"]
    if data.participants:
        lines.append(f"Participants: {', '.join(data.participants)}")
    if data.segments:
        lines += ["", "Transcript", "", *_transcript_lines(data)]
    return "\n".join(lines) + "\n"


def format_markdown(data: ExportData) -> str:
    lines = [f"# {data.title}", "", f"**Date:** {_format_date(data.meeting_date)}"]
    if data.participants:
        lines.append(f"**Participants:** {', '.join(data.participants)}")

    # Empty sections are omitted instead of rendered as bare headings.
    if data.overview or data.bullet_points or data.keywords:
        lines += ["", "## Summary"]
        if data.overview:
            lines += ["", data.overview]
        if data.bullet_points:
            lines += ["", *(f"- {point}" for point in data.bullet_points)]
        if data.keywords:
            lines += ["", f"**Keywords:** {', '.join(data.keywords)}"]
    if data.chapters:
        lines += ["", "## Chapters", ""]
        lines += [f"- [{format_timestamp(c.start_ms)}] {c.title}" for c in data.chapters]
    if data.action_items:
        lines += ["", "## Action Items", ""]
        lines += [_action_item_line(item) for item in data.action_items]
    if data.segments:
        # Two trailing spaces force a Markdown line break without turning lines into a paragraph.
        lines += ["", "## Transcript", ""]
        lines += [f"{line}  " for line in _transcript_lines(data)]
    return "\n".join(lines) + "\n"


def format_export(data: ExportData, fmt: ExportFormat) -> str:
    if fmt is ExportFormat.MD:
        return format_markdown(data)
    return format_txt(data)
