"""Transcript parsing: .txt / .vtt / .json text → list[ParsedSegment].

Pure functions: no DB and no I/O. Errors are raised as the AppException subclasses so the service
layer can let them bubble up to the global handler.

WHAT: Reads an uploaded or pasted transcript in one of three formats (plain text with [mm:ss]
    stamps, WebVTT subtitles, or JSON) and returns a clean list of timed, speaker-labelled segments.
LAYER: Utility (pure functions; the easiest code in the repo to unit-test).
CALLED BY: meetings/service.py (create from paste or upload) and the schemas (`TranscriptFormat`).
CALLS: core/exceptions for errors; otherwise only the standard library.
MERN EQUIVALENT: a `parseTranscript.js` helper using regexes and `JSON.parse`.
"""

import html
import json
import math
import re
from dataclasses import dataclass
from enum import StrEnum
from pathlib import PurePath
from typing import Any

from app.core.exceptions import EmptyTranscriptError, TranscriptParseError, UnsupportedFileError

# ---------------------------------------------------------------------------
# Constants & types
# ---------------------------------------------------------------------------

MS_PER_SECOND = 1000
SECONDS_PER_MINUTE = 60
MINUTES_PER_HOUR = 60
# Nothing follows the last segment, so its end is a guess: roughly one short sentence.
DEFAULT_LAST_SEGMENT_MS = 5_000
UNKNOWN_SPEAKER = "Unknown"
BOM = "﻿"


class TranscriptFormat(StrEnum):
    """The supported input formats (values match the file extensions)."""

    TXT = "txt"
    VTT = "vtt"
    JSON = "json"


# `frozen=True` dataclass = an immutable record with an auto-generated constructor.
@dataclass(frozen=True)
class ParsedSegment:
    """The parser's output: one finished segment with all times filled in."""

    speaker_label: str
    start_ms: int
    end_ms: int
    text: str


@dataclass(frozen=True)
class _RawSegment:
    """A segment before `end_ms` defaults are applied."""

    speaker_label: str
    start_ms: int
    end_ms: int | None
    text: str


# "[HH:MM:SS]" or "[MM:SS]" — loose form detects "looks like a timestamp", strict form validates it.
# Regex notes: `(?:...)?` = optional non-capturing group; `(\d+)` etc. = capture groups read back
# with `match.group(n)`; `r"..."` = raw string so backslashes reach the regex engine unchanged.
_TXT_STAMP_LOOSE = re.compile(r"^\[[\d:]+\]")
# Groups: 1 = hours (optional), 2 = minutes, 3 = seconds, 4 = the rest of the line.
_TXT_LINE = re.compile(r"^\[(?:(\d+):)?(\d+):(\d{2})\]\s*(.*)$")
# "Speaker Name: words"; the `?` after `{1,60}` makes it lazy so it stops at the first colon.
_SPEAKER_PREFIX = re.compile(r"^([^:\[\]<>]{1,60}?):\s+(.*)$")

# VTT times look like 00:01:02.345 (hours optional); the timing line is `start --> end`.
_VTT_STAMP = r"(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})"
_VTT_TIMING = re.compile(rf"^{_VTT_STAMP}\s*-->\s*{_VTT_STAMP}(?:\s.*)?$")
# A VTT "voice tag" like `<v Alice>` carries the speaker's name.
_VTT_VOICE = re.compile(r"<v(?:\.[^\s>]+)*\s+([^>]+)>")
_VTT_TAG = re.compile(r"<[^>]+>")
_VTT_SKIPPED_BLOCKS = ("WEBVTT", "NOTE", "STYLE", "REGION")

_EXTENSION_FORMATS = {
    ".txt": TranscriptFormat.TXT,
    ".vtt": TranscriptFormat.VTT,
    ".json": TranscriptFormat.JSON,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def detect_format(filename: str, content: str) -> TranscriptFormat:
    """Pick the format from the file extension, falling back to sniffing when there is none.

    Args:
        filename: original file name, or "" for pasted text.
        content: the file text (only inspected when there is no extension).
    Returns:
        The detected TranscriptFormat.
    Raises:
        UnsupportedFileError if the extension is unknown or the content looks like nothing known.
    """
    extension = PurePath(filename).suffix.lower()
    if extension:
        if extension not in _EXTENSION_FORMATS:
            raise UnsupportedFileError(f"Unsupported transcript file type '{extension}'")
        return _EXTENSION_FORMATS[extension]

    head = content.removeprefix(BOM).lstrip()
    if head.startswith("WEBVTT"):
        return TranscriptFormat.VTT
    if _TXT_STAMP_LOOSE.match(head):  # checked before JSON: both can start with "["
        return TranscriptFormat.TXT
    if head.startswith(("{", "[")):
        return TranscriptFormat.JSON
    raise UnsupportedFileError("Could not detect the transcript format")


def parse_transcript(
    text: str, format: TranscriptFormat | str
) -> list[ParsedSegment]:  # noqa: A002
    """Parse transcript text into segments sorted by start with every `end_ms` filled in.

    Args:
        text: the whole transcript as one string.
        format: a TranscriptFormat or its string value ("txt", "vtt", "json").
    Returns:
        Parsed segments, sorted by start time.
    Why it exists: the single public entry point; callers never touch the per-format parsers.
    """
    try:
        fmt = TranscriptFormat(format)
    except ValueError:
        raise UnsupportedFileError(f"Unsupported transcript format '{format}'") from None

    # Normalise once so each parser can assume "\n" endings and no BOM.
    normalised = text.removeprefix(BOM).replace("\r\n", "\n").replace("\r", "\n")
    # INTERVIEW: a dict of functions replaces an if/elif chain (dispatch table); adding a format
    # means adding one entry.
    parsers = {
        TranscriptFormat.TXT: _parse_txt,
        TranscriptFormat.VTT: _parse_vtt,
        TranscriptFormat.JSON: _parse_json,
    }
    return _finalize(parsers[fmt](normalised))


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _line_error(line: int, message: str) -> TranscriptParseError:
    """Build (not raise) a parse error that says which line is wrong; callers `raise` it."""
    return TranscriptParseError(f"Line {line}: {message}", {"line": line})


def _clean(value: str) -> str:
    """Trim and collapse internal whitespace (speaker names and text)."""
    return " ".join(value.split())


def _speaker(name: str | None) -> str:
    """Clean a speaker name; missing or blank becomes UNKNOWN_SPEAKER."""
    return _clean(name or "") or UNKNOWN_SPEAKER


def _split_speaker(text: str) -> tuple[str, str]:
    """Split "Alice: hello" into ("Alice", "hello"); no prefix means the Unknown speaker."""
    match = _SPEAKER_PREFIX.match(text)
    if not match:
        return UNKNOWN_SPEAKER, text
    return _speaker(match.group(1)), match.group(2)


def _to_ms(hours: str | None, minutes: str, seconds: str, millis: str = "0") -> int | None:
    """Convert clock parts to ms; None when a field is out of range (e.g. 00:75).

    Args:
        hours: optional hours digits (None when the stamp is MM:SS).
        minutes, seconds, millis: digit strings captured by the regexes.
    Returns:
        Milliseconds from the start, or None if minutes/seconds exceed 59.
    """
    # Regex groups arrive as strings (or None), so convert; `hours or 0` handles a missing group.
    h, m, s = int(hours or 0), int(minutes), int(seconds)
    if s >= SECONDS_PER_MINUTE or (hours is not None and m >= MINUTES_PER_HOUR):
        return None
    total_seconds = (h * MINUTES_PER_HOUR + m) * SECONDS_PER_MINUTE + s
    return total_seconds * MS_PER_SECOND + int(millis)


def _finalize(raw: list[_RawSegment]) -> list[ParsedSegment]:
    """Sort, drop empty text, and fill missing end times.

    Why it exists: all three formats end here, so the "end time defaults" rule lives once:
    a segment ends where the next begins; the last one gets a short fixed length.
    """
    # sorted() is stable, so segments with equal starts keep file order.
    ordered = [seg for seg in sorted(raw, key=lambda s: s.start_ms) if seg.text]
    if not ordered:
        raise EmptyTranscriptError()

    segments: list[ParsedSegment] = []
    for index, seg in enumerate(ordered):
        is_last = index == len(ordered) - 1
        if seg.end_ms is not None:
            end_ms = seg.end_ms
        elif is_last:
            end_ms = seg.start_ms + DEFAULT_LAST_SEGMENT_MS
        else:
            end_ms = ordered[index + 1].start_ms
        # `max(...)` guarantees end >= start even if the file's timestamps are out of order,
        # which the DB CHECK constraint (end_ms >= start_ms) would otherwise reject.
        segments.append(
            ParsedSegment(seg.speaker_label, seg.start_ms, max(end_ms, seg.start_ms), seg.text)
        )
    return segments


# ---------------------------------------------------------------------------
# TXT
# ---------------------------------------------------------------------------


def _parse_txt(text: str) -> list[_RawSegment]:
    """Parse `[mm:ss] Speaker: text` lines; lines without a stamp continue the previous text."""
    # Segments are built as mutable lists so continuation lines can extend the last one.
    entries: list[list[Any]] = []  # [speaker, start_ms, text]
    for line_no, line in enumerate(text.split("\n"), start=1):
        line = line.strip()
        if not line:
            continue
        if not _TXT_STAMP_LOOSE.match(line):
            if not entries:
                raise _line_error(line_no, "text found before the first [timestamp]")
            entries[-1][2] += " " + line
            continue

        # `match` is None when the line starts with "[" but is not a valid timestamp.
        match = _TXT_LINE.match(line)
        start_ms = _to_ms(match.group(1), match.group(2), match.group(3)) if match else None
        if match is None or start_ms is None:
            raise _line_error(line_no, f"invalid timestamp in '{line[:40]}'")
        speaker, body = _split_speaker(match.group(4))
        entries.append([speaker, start_ms, body])

    return [_RawSegment(speaker, start, None, _clean(body)) for speaker, start, body in entries]


# ---------------------------------------------------------------------------
# VTT
# ---------------------------------------------------------------------------


def _vtt_blocks(text: str) -> list[list[tuple[int, str]]]:
    """Group lines into blank-line-separated blocks, keeping 1-based line numbers."""
    blocks: list[list[tuple[int, str]]] = []
    current: list[tuple[int, str]] = []
    for line_no, line in enumerate(text.split("\n"), start=1):
        if line.strip():
            current.append((line_no, line.strip()))
        elif current:
            blocks.append(current)
            current = []
    if current:
        blocks.append(current)
    return blocks


def _parse_vtt(text: str) -> list[_RawSegment]:
    """Parse WebVTT cues: optional id line, a `start --> end` line, then the spoken text."""
    segments: list[_RawSegment] = []
    for block in _vtt_blocks(text):
        if block[0][1].startswith(_VTT_SKIPPED_BLOCKS):
            continue

        timing_idx = next((i for i, (_, line) in enumerate(block) if "-->" in line), None)
        if timing_idx is None or timing_idx > 1:  # at most one cue-identifier line before timing
            raise _line_error(block[0][0], "cue has no timing line")
        timing_no, timing_line = block[timing_idx]
        match = _VTT_TIMING.match(timing_line)
        if not match:
            raise _line_error(timing_no, f"invalid cue timing '{timing_line[:40]}'")
        start_ms = _to_ms(match.group(1), match.group(2), match.group(3), match.group(4))
        end_ms = _to_ms(match.group(5), match.group(6), match.group(7), match.group(8))
        if start_ms is None or end_ms is None:
            raise _line_error(timing_no, "timestamp field out of range")

        payload = " ".join(line for _, line in block[timing_idx + 1 :])
        # Prefer an explicit <v Name> tag; otherwise fall back to a "Name:" prefix in the text.
        voice = _VTT_VOICE.search(payload)
        body = _clean(html.unescape(_VTT_TAG.sub("", payload)))
        speaker, body = (_speaker(voice.group(1)), body) if voice else _split_speaker(body)
        segments.append(_RawSegment(speaker, start_ms, end_ms, body))
    return segments


# ---------------------------------------------------------------------------
# JSON
# ---------------------------------------------------------------------------


def _segment_error(number: int, message: str) -> TranscriptParseError:
    """Build (not raise) a JSON parse error that names the offending array element."""
    # JSON has no meaningful line numbers, so errors point at the 1-based array position.
    return TranscriptParseError(f"Segment {number}: {message}", {"segment": number})


def _seconds_to_ms(value: Any, field: str, number: int) -> int:
    """Validate a JSON seconds value (e.g. 12.5) and convert it to integer milliseconds."""
    # bool is an int subclass in Python; "true" is not a time.
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise _segment_error(number, f"'{field}' must be a number of seconds")
    if not math.isfinite(value) or value < 0:
        raise _segment_error(number, f"'{field}' must be a non-negative finite number")
    return round(value * MS_PER_SECOND)


def _parse_json(text: str) -> list[_RawSegment]:
    """Parse JSON shaped as `{"segments": [...]}` or a bare list of {speaker,start,end,text}.

    Times in the file are seconds; they are converted to integer milliseconds.
    """
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise _line_error(exc.lineno, f"invalid JSON ({exc.msg})") from exc

    items = data.get("segments") if isinstance(data, dict) else data
    if not isinstance(items, list):
        raise TranscriptParseError("Expected a 'segments' list or a top-level list")

    segments: list[_RawSegment] = []
    for number, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            raise _segment_error(number, "must be an object")
        body = item.get("text")
        if not isinstance(body, str):
            raise _segment_error(number, "'text' must be a string")
        if "start" not in item:
            raise _segment_error(number, "missing 'start'")
        speaker = item.get("speaker")
        if speaker is not None and not isinstance(speaker, str):
            raise _segment_error(number, "'speaker' must be a string")
        start_ms = _seconds_to_ms(item["start"], "start", number)
        end = item.get("end")
        end_ms = None if end is None else _seconds_to_ms(end, "end", number)
        segments.append(_RawSegment(_speaker(speaker), start_ms, end_ms, _clean(body)))
    return segments
