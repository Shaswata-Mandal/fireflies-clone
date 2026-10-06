"""Unit tests for utils/transcript_parser.py — pure functions, no DB or HTTP."""

import dataclasses

import pytest

from app.core.exceptions import EmptyTranscriptError, TranscriptParseError, UnsupportedFileError
from app.utils.transcript_parser import (
    DEFAULT_LAST_SEGMENT_MS,
    ParsedSegment,
    TranscriptFormat,
    detect_format,
    parse_transcript,
)

TXT = "[00:05] Priya: Let's start.\n[00:12] Rahul: Sounds good."
VTT = (
    "WEBVTT\n\nNOTE internal comment\n\n"
    "1\n00:00:05.000 --> 00:00:11.800\n<v Priya Shah>Let's <b>start</b>.</v>\n\n"
    "00:00:12.000 --> 00:00:15.000\nRahul: Sounds good.\n"
)
JSON_OBJ = '{"segments": [{"speaker": "Priya", "start": 5.0, "end": 11.8, "text": "Hi"}]}'


# ---------------------------------------------------------------------------
# Happy paths
# ---------------------------------------------------------------------------


def test_txt_happy_path_defaults_end_to_next_start() -> None:
    result = parse_transcript(TXT, TranscriptFormat.TXT)
    assert result == [
        ParsedSegment("Priya", 5_000, 12_000, "Let's start."),
        ParsedSegment("Rahul", 12_000, 12_000 + DEFAULT_LAST_SEGMENT_MS, "Sounds good."),
    ]


def test_txt_accepts_hh_mm_ss_and_two_hour_timestamp() -> None:
    result = parse_transcript("[01:59:59] Priya: Wrapping up.", "txt")
    assert result[0].start_ms == 7_199_000


def test_txt_continuation_lines_and_blank_lines() -> None:
    text = "[00:01] Priya: First line\n\n  and more\n[00:09] Rahul: Next"
    result = parse_transcript(text, "txt")
    assert result[0].text == "First line and more"
    assert len(result) == 2


def test_txt_line_without_speaker_uses_unknown() -> None:
    assert parse_transcript("[00:01] just words", "txt")[0].speaker_label == "Unknown"


def test_vtt_happy_path_strips_tags_notes_and_reads_speakers() -> None:
    result = parse_transcript(VTT, "vtt")
    assert result == [
        ParsedSegment("Priya Shah", 5_000, 11_800, "Let's start."),
        ParsedSegment("Rahul", 12_000, 15_000, "Sounds good."),
    ]


def test_vtt_short_timestamps_without_hours() -> None:
    result = parse_transcript("WEBVTT\n\n00:05.500 --> 00:07.000\nA: hi", "vtt")
    assert (result[0].start_ms, result[0].end_ms) == (5_500, 7_000)


def test_json_object_converts_float_seconds_to_ms() -> None:
    assert parse_transcript(JSON_OBJ, "json") == [ParsedSegment("Priya", 5_000, 11_800, "Hi")]


def test_json_bare_list_without_end() -> None:
    result = parse_transcript('[{"speaker": "A", "start": 1, "text": "x"}]', "json")
    assert result == [ParsedSegment("A", 1_000, 1_000 + DEFAULT_LAST_SEGMENT_MS, "x")]


# ---------------------------------------------------------------------------
# Encoding, ordering, normalisation
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(("text", "fmt"), [(TXT, "txt"), (VTT, "vtt"), (JSON_OBJ, "json")])
def test_bom_and_crlf_give_the_same_result(text: str, fmt: str) -> None:
    windows = "﻿" + text.replace("\n", "\r\n")
    assert parse_transcript(windows, fmt) == parse_transcript(text, fmt)


def test_out_of_order_segments_are_sorted_and_ends_follow_new_order() -> None:
    result = parse_transcript("[00:30] B: later\n[00:10] A: earlier", "txt")
    assert [s.speaker_label for s in result] == ["A", "B"]
    assert result[0].end_ms == 30_000


def test_speaker_names_are_trimmed_and_collapsed() -> None:
    result = parse_transcript("[00:01]    Priya    Shah  : hello   there", "txt")
    assert (result[0].speaker_label, result[0].text) == ("Priya Shah", "hello there")


def test_parsed_segment_is_frozen() -> None:
    segment = ParsedSegment("A", 0, 1, "x")
    with pytest.raises(dataclasses.FrozenInstanceError):
        segment.text = "y"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "line"),
    [
        ("[00:05] A: ok\n[00:99] B: bad seconds", 2),
        ("[0a:05] A: nope", 1),
        ("orphan text\n[00:05] A: ok", 1),
    ],
)
def test_txt_malformed_lines_report_line_number(text: str, line: int) -> None:
    with pytest.raises(TranscriptParseError) as exc:
        parse_transcript(text, "txt")
    assert exc.value.code == "TRANSCRIPT_PARSE_ERROR"
    assert exc.value.details == {"line": line}
    assert f"Line {line}" in exc.value.message


def test_vtt_bad_timing_reports_line_number() -> None:
    with pytest.raises(TranscriptParseError) as exc:
        parse_transcript("WEBVTT\n\n00:05 --> nope\nhello", "vtt")
    assert exc.value.details == {"line": 3}


def test_vtt_cue_without_timing_is_an_error() -> None:
    with pytest.raises(TranscriptParseError):
        parse_transcript("WEBVTT\n\njust text", "vtt")


@pytest.mark.parametrize(
    "segment",
    [
        '{"speaker": "A", "start": -1, "text": "x"}',
        '{"speaker": "A", "start": "5", "text": "x"}',
        '{"speaker": "A", "start": true, "text": "x"}',
        '{"speaker": "A", "start": NaN, "text": "x"}',
        '{"speaker": "A", "start": 1, "end": -2, "text": "x"}',
        '{"speaker": "A", "text": "x"}',
        '{"speaker": "A", "start": 1}',
        '"not an object"',
    ],
)
def test_json_bad_segments_are_rejected(segment: str) -> None:
    with pytest.raises(TranscriptParseError) as exc:
        parse_transcript(f'{{"segments": [{segment}]}}', "json")
    assert exc.value.details == {"segment": 1}


def test_json_invalid_syntax_and_wrong_shape() -> None:
    with pytest.raises(TranscriptParseError) as syntax:
        parse_transcript('{\n"segments": [\n', "json")
    assert "line" in syntax.value.details
    with pytest.raises(TranscriptParseError):
        parse_transcript('{"foo": 1}', "json")


@pytest.mark.parametrize("fmt", ["txt", "vtt", "json"])
@pytest.mark.parametrize("text", ["", "   \n\n  ", "﻿"])
def test_empty_input_raises_empty_transcript(text: str, fmt: str) -> None:
    # Blank JSON is invalid syntax rather than an empty transcript; use an empty list instead.
    payload = "[]" if fmt == "json" else text
    with pytest.raises(EmptyTranscriptError) as exc:
        parse_transcript(payload, fmt)
    assert exc.value.code == "EMPTY_TRANSCRIPT"


def test_unknown_format_raises_unsupported_file() -> None:
    with pytest.raises(UnsupportedFileError) as exc:
        parse_transcript("x", "pdf")
    assert exc.value.code == "UNSUPPORTED_FILE"


# ---------------------------------------------------------------------------
# detect_format
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("filename", "expected"),
    [("a.txt", "txt"), ("A.VTT", "vtt"), ("meeting.final.json", "json")],
)
def test_detect_format_by_extension(filename: str, expected: str) -> None:
    assert detect_format(filename, "") == expected


@pytest.mark.parametrize(
    ("content", "expected"),
    [
        ("﻿WEBVTT\n\n", "vtt"),
        ("[00:05] A: hi", "txt"),
        ('  {"segments": []}', "json"),
        ('[{"start": 1}]', "json"),
    ],
)
def test_detect_format_sniffs_content_when_no_extension(content: str, expected: str) -> None:
    assert detect_format("upload", content) == expected


@pytest.mark.parametrize(("filename", "content"), [("notes.pdf", "[00:05] A: hi"), ("x", "hello")])
def test_detect_format_rejects_unknown(filename: str, content: str) -> None:
    with pytest.raises(UnsupportedFileError):
        detect_format(filename, content)
