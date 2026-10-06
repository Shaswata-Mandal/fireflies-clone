from datetime import UTC, date, datetime, timedelta, timezone

import pytest

from app.utils.export_formatter import (
    ExportActionItem,
    ExportChapter,
    ExportData,
    ExportFormat,
    ExportSegment,
    export_filename,
    format_export,
    format_timestamp,
    slugify,
)

DATE = datetime(2026, 10, 1, 9, 30, tzinfo=UTC)


def full_data() -> ExportData:
    return ExportData(
        title="Q4 Roadmap Sync",
        meeting_date=DATE,
        participants=["Priya Shah", "Rahul"],
        overview="The team aligned on the roadmap.",
        bullet_points=["Launch moves to November"],
        keywords=["roadmap", "launch"],
        chapters=[ExportChapter("Intro", 0), ExportChapter("Budget", 3_725_000)],
        action_items=[
            ExportActionItem("Send budget", False, "Rahul", date(2026, 10, 10)),
            ExportActionItem("Book room", True),
        ],
        segments=[
            ExportSegment("Priya Shah", 5_000, "Let's start."),
            ExportSegment("Rahul", 3_725_999, "Budget time."),
        ],
    )


@pytest.mark.parametrize(
    ("ms", "expected"),
    [(0, "00:00:00"), (999, "00:00:00"), (5_000, "00:00:05"), (65_000, "00:01:05"),
     (3_725_000, "01:02:05"), (-5, "00:00:00")],
)  # fmt: skip
def test_format_timestamp(ms: int, expected: str) -> None:
    assert format_timestamp(ms) == expected


@pytest.mark.parametrize(
    ("title", "slug"),
    [
        ("Q4 Roadmap Sync", "q4-roadmap-sync"),
        ("  Weekly -- Stand-up!!  ", "weekly-stand-up"),
        ("Café résumé", "cafe-resume"),
        ("../../etc/passwd", "etc-passwd"),
        ("会議", "meeting"),
        ("!!!", "meeting"),
    ],
)
def test_slugify(title: str, slug: str) -> None:
    assert slugify(title) == slug


def test_export_filename_uses_format_extension() -> None:
    assert export_filename("Q4 Roadmap", ExportFormat.MD) == "q4-roadmap.md"
    assert export_filename("Q4 Roadmap", ExportFormat.TXT) == "q4-roadmap.txt"


def test_markdown_contains_every_section_in_order() -> None:
    text = format_export(full_data(), ExportFormat.MD)

    expected_in_order = [
        "# Q4 Roadmap Sync",
        "**Date:** 2026-10-01 09:30 UTC",
        "**Participants:** Priya Shah, Rahul",
        "## Summary",
        "The team aligned on the roadmap.",
        "- Launch moves to November",
        "**Keywords:** roadmap, launch",
        "## Chapters",
        "- [00:00:00] Intro",
        "- [01:02:05] Budget",
        "## Action Items",
        "- [ ] Send budget (@Rahul, due 2026-10-10)",
        "- [x] Book room",
        "## Transcript",
        "[00:00:05] Priya Shah: Let's start.",
        "[01:02:05] Rahul: Budget time.",
    ]
    positions = [text.index(fragment) for fragment in expected_in_order]
    assert positions == sorted(positions)
    assert text.endswith("\n")


def test_markdown_omits_empty_sections() -> None:
    text = format_export(ExportData(title="Bare", meeting_date=DATE), ExportFormat.MD)

    assert text == "# Bare\n\n**Date:** 2026-10-01 09:30 UTC\n"


def test_txt_has_header_and_transcript_only() -> None:
    text = format_export(full_data(), ExportFormat.TXT)

    assert text == (
        "Q4 Roadmap Sync\n"
        "Date: 2026-10-01 09:30 UTC\n"
        "Participants: Priya Shah, Rahul\n"
        "\n"
        "Transcript\n"
        "\n"
        "[00:00:05] Priya Shah: Let's start.\n"
        "[01:02:05] Rahul: Budget time.\n"
    )


def test_date_is_rendered_in_utc_whatever_the_input_offset() -> None:
    plus_two = datetime(2026, 10, 1, 11, 30, tzinfo=timezone(timedelta(hours=2)))

    text = format_export(ExportData(title="T", meeting_date=plus_two), ExportFormat.TXT)

    assert "Date: 2026-10-01 09:30 UTC" in text
