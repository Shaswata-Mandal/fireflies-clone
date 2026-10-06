"""Transcript parsing: .txt / .vtt / .json text → list[ParsedSegment].

Pure functions: no DB and no I/O. Errors are raised as the AppException subclasses so the service
layer can let them bubble up to the global handler.
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
    TXT = "txt"
    VTT = "vtt"
    JSON = "json"


@dataclass(frozen=True)
class ParsedSegment:
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
_TXT_STAMP_LOOSE = re.compile(r"^\[[\d:]+\]")
_TXT_LINE = re.compile(r"^\[(?:(\d+):)?(\d+):(\d{2})\]\s*(.*)$")
_SPEAKER_PREFIX = re.compile(r"^([^:\[\]<>]{1,60}?):\s+(.*)$")

_VTT_STAMP = r"(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})"
_VTT_TIMING = re.compile(rf"^{_VTT_STAMP}\s*-->\s*{_VTT_STAMP}(?:\s.*)?$")
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
    """Pick the format from the file extension, falling back to sniffing when there is none."""
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
    """Parse transcript text into segments sorted by start with every `end_ms` filled in."""
    try:
        fmt = TranscriptFormat(format)
    except ValueError:
        raise UnsupportedFileError(f"Unsupported transcript format '{format}'") from None

    # Normalise once so each parser can assume "\n" endings and no BOM.
    normalised = text.removeprefix(BOM).replace("\r\n", "\n").replace("\r", "\n")
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
    return TranscriptParseError(f"Line {line}: {message}", {"line": line})


def _clean(value: str) -> str:
    """Trim and collapse internal whitespace (speaker names and text)."""
    return " ".join(value.split())


def _speaker(name: str | None) -> str:
    return _clean(name or "") or UNKNOWN_SPEAKER


def _split_speaker(text: str) -> tuple[str, str]:
    match = _SPEAKER_PREFIX.match(text)
    if not match:
        return UNKNOWN_SPEAKER, text
    return _speaker(match.group(1)), match.group(2)


def _to_ms(hours: str | None, minutes: str, seconds: str, millis: str = "0") -> int | None:
    """Convert clock parts to ms; None when a field is out of range (e.g. 00:75)."""
    h, m, s = int(hours or 0), int(minutes), int(seconds)
    if s >= SECONDS_PER_MINUTE or (hours is not None and m >= MINUTES_PER_HOUR):
        return None
    total_seconds = (h * MINUTES_PER_HOUR + m) * SECONDS_PER_MINUTE + s
    return total_seconds * MS_PER_SECOND + int(millis)


def _finalize(raw: list[_RawSegment]) -> list[ParsedSegment]:
    """Sort, drop empty text, and fill missing end times."""
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
        segments.append(
            ParsedSegment(seg.speaker_label, seg.start_ms, max(end_ms, seg.start_ms), seg.text)
        )
    return segments


# ---------------------------------------------------------------------------
# TXT
# ---------------------------------------------------------------------------


def _parse_txt(text: str) -> list[_RawSegment]:
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
        voice = _VTT_VOICE.search(payload)
        body = _clean(html.unescape(_VTT_TAG.sub("", payload)))
        speaker, body = (_speaker(voice.group(1)), body) if voice else _split_speaker(body)
        segments.append(_RawSegment(speaker, start_ms, end_ms, body))
    return segments


# ---------------------------------------------------------------------------
# JSON
# ---------------------------------------------------------------------------


def _segment_error(number: int, message: str) -> TranscriptParseError:
    # JSON has no meaningful line numbers, so errors point at the 1-based array position.
    return TranscriptParseError(f"Segment {number}: {message}", {"segment": number})


def _seconds_to_ms(value: Any, field: str, number: int) -> int:
    # bool is an int subclass in Python; "true" is not a time.
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise _segment_error(number, f"'{field}' must be a number of seconds")
    if not math.isfinite(value) or value < 0:
        raise _segment_error(number, f"'{field}' must be a non-negative finite number")
    return round(value * MS_PER_SECOND)


def _parse_json(text: str) -> list[_RawSegment]:
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
