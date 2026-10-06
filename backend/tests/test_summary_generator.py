"""Summary generator tests. The LLM client is always a fake: no network."""

import json
import logging
from types import SimpleNamespace
from typing import Any

import pytest

from app.core.config import Settings
from app.utils.summary_generator import (
    MAX_PROMPT_CHARS,
    GeneratedActionItem,
    GeneratedChapter,
    LLMSummaryGenerator,
    MockSummaryGenerator,
    SegmentInput,
    build_transcript_prompt,
    get_summary_generator,
)

_LINES = [
    ("Priya", "Welcome everyone. Today we review the roadmap and the launch timeline."),
    ("Rahul", "The roadmap looks solid. The launch timeline depends on the billing migration."),
    ("Priya", "Let's start with the billing migration. Is it on track?"),
    ("Rahul", "Mostly. I'll send the revised budget by Friday."),
    ("Dana", "Budget is a concern. We need to confirm the vendor contract before the launch."),
    ("Priya", "Agreed. Dana, can you check the vendor contract status?"),
    ("Dana", "Yes. I will follow up with legal tomorrow."),
    ("Sam", "On hiring, we have two open engineering roles and the pipeline is thin."),
    ("Priya", "Let's make sure recruiting shares the pipeline numbers. Hiring is the top risk."),
    ("Sam", "Understood. The pipeline review is next week."),
    ("Rahul", "Customer feedback on the beta was positive. Onboarding is the main complaint."),
    ("Priya", "Great. Action item: improve the onboarding flow before launch."),
]
SEGMENTS = [
    SegmentInput(speaker, i * 60_000, i * 60_000 + 55_000, text)
    for i, (speaker, text) in enumerate(_LINES)
]


# ---------------------------------------------------------------------------
# Mock generator
# ---------------------------------------------------------------------------


def test_mock_keywords_are_top_title_cased_words() -> None:
    summary = MockSummaryGenerator().generate(SEGMENTS)
    assert summary.keywords == [
        "Launch",
        "Pipeline",
        "Billing",
        "Budget",
        "Contract",
        "Hiring",
        "Migration",
        "Onboarding",
    ]


def test_mock_chapters_split_time_into_windows() -> None:
    summary = MockSummaryGenerator().generate(SEGMENTS)
    assert summary.chapters == [
        GeneratedChapter("Billing, Migration, Roadmap", 0),
        GeneratedChapter("Budget, Contract, Vendor", 180_000),
        GeneratedChapter("Hiring, Pipeline, Engineering", 360_000),
        GeneratedChapter("Onboarding, Action, Beta", 540_000),
    ]
    assert len(summary.bullet_points) == len(summary.chapters)


def test_mock_extracts_action_items_with_speaker_and_segment() -> None:
    items = MockSummaryGenerator().generate(SEGMENTS).action_items
    assert items[0] == GeneratedActionItem("I'll send the revised budget by Friday.", "Rahul", 3)
    assert [item.source_segment_index for item in items] == [3, 4, 5, 6, 8, 11]
    assert items[2].assignee_label == "Priya"  # whoever said "can you", not the person asked


def test_mock_overview_mentions_speakers_keywords_and_opening() -> None:
    overview = MockSummaryGenerator().generate(SEGMENTS).overview
    assert "4 speakers" in overview
    assert "Launch, Pipeline, Billing" in overview
    assert "Priya opened with" in overview
    assert "6 action items" in overview


def test_mock_is_deterministic() -> None:
    generator = MockSummaryGenerator()
    assert generator.generate(SEGMENTS) == generator.generate(list(SEGMENTS))


def test_mock_empty_transcript() -> None:
    summary = MockSummaryGenerator().generate([])
    assert summary.overview == "No transcript content to summarize."
    assert not (summary.keywords or summary.chapters or summary.bullet_points)
    assert summary.action_items == []


def test_mock_single_segment_has_one_chapter_and_no_crash() -> None:
    summary = MockSummaryGenerator().generate([SegmentInput("Ann", 0, 4_000, "Hello team.")])
    assert len(summary.chapters) == 1
    assert summary.chapters[0].start_ms == 0
    assert "1 speaker " in summary.overview


def test_mock_short_transcript_does_not_pad_chapters() -> None:
    summary = MockSummaryGenerator().generate(SEGMENTS[:3])
    assert 1 <= len(summary.chapters) <= 3
    assert len(summary.bullet_points) == len(summary.chapters)


# ---------------------------------------------------------------------------
# LLM generator (fake client)
# ---------------------------------------------------------------------------


class FakeClient:
    """Mimics `client.chat.completions.create(...)`; records the call for assertions."""

    def __init__(self, content: str | None = None, error: Exception | None = None) -> None:
        self._content = content
        self._error = error
        self.calls: list[dict[str, Any]] = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if self._error:
            raise self._error
        message = SimpleNamespace(content=self._content)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def _llm(client: FakeClient) -> LLMSummaryGenerator:
    return LLMSummaryGenerator(
        api_key="test-key",
        model="test-model",
        base_url="http://unused",
        fallback=MockSummaryGenerator(),
        client=client,
    )


VALID_PAYLOAD = {
    "overview": "The team reviewed the roadmap.",
    "bullet_points": ["Roadmap agreed"],
    "keywords": ["Roadmap"],
    "chapters": [{"title": "Intro", "start_ms": 0}],
    "action_items": [
        {"text": "Send budget", "assignee": "Rahul", "source_segment_index": 3},
        {"text": "Ghost task", "assignee": "Nobody", "source_segment_index": 999},
    ],
}


def test_llm_valid_json_is_parsed_and_sanitised() -> None:
    client = FakeClient(json.dumps(VALID_PAYLOAD))
    summary = _llm(client).generate(SEGMENTS)

    assert summary.overview == "The team reviewed the roadmap."
    assert summary.chapters == [GeneratedChapter("Intro", 0)]
    assert summary.action_items == [
        GeneratedActionItem("Send budget", "Rahul", 3),
        GeneratedActionItem("Ghost task", None, None),  # unknown speaker / bad index are cleared
    ]
    assert client.calls[0]["model"] == "test-model"
    assert client.calls[0]["response_format"] == {"type": "json_object"}


def test_llm_accepts_json_wrapped_in_code_fence() -> None:
    client = FakeClient("```json\n" + json.dumps(VALID_PAYLOAD) + "\n```")
    assert _llm(client).generate(SEGMENTS).overview == "The team reviewed the roadmap."


@pytest.mark.parametrize("content", ["not json at all", '{"overview": ""}', None])
def test_llm_invalid_json_falls_back_to_mock(content: str | None, caplog) -> None:
    with caplog.at_level(logging.WARNING):
        summary = _llm(FakeClient(content)).generate(SEGMENTS)
    assert summary == MockSummaryGenerator().generate(SEGMENTS)
    assert "using mock generator" in caplog.text


def test_llm_client_exception_falls_back_to_mock(caplog) -> None:
    with caplog.at_level(logging.WARNING):
        summary = _llm(FakeClient(error=TimeoutError("timed out"))).generate(SEGMENTS)
    assert summary == MockSummaryGenerator().generate(SEGMENTS)
    assert "TimeoutError" in caplog.text


def test_llm_empty_transcript_skips_the_call() -> None:
    client = FakeClient(json.dumps(VALID_PAYLOAD))
    summary = _llm(client).generate([])
    assert client.calls == []
    assert summary.overview == "No transcript content to summarize."


def test_long_transcript_is_truncated_but_keeps_original_indices() -> None:
    long_segments = [
        SegmentInput("Ann", i * 1000, i * 1000 + 900, "word " * 50) for i in range(2000)
    ]
    prompt = build_transcript_prompt(long_segments)
    assert len(prompt) <= MAX_PROMPT_CHARS + 200  # budget plus the omitted-segments marker
    assert prompt.startswith("[0] [00:00] Ann:")
    assert "segments omitted" in prompt
    assert prompt.splitlines()[-1].startswith("[1999] ")


def test_short_transcript_is_not_truncated() -> None:
    assert "omitted" not in build_transcript_prompt(SEGMENTS)


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def _settings(api_key: str | None) -> Settings:
    return Settings(
        _env_file=None,
        DATABASE_URL="sqlite://",
        CORS_ORIGINS=["http://testserver"],
        LLM_API_KEY=api_key,
        LLM_MODEL="grok-test",
    )


def test_factory_returns_mock_without_key() -> None:
    assert isinstance(get_summary_generator(_settings(None)), MockSummaryGenerator)


def test_factory_returns_llm_with_key() -> None:
    assert isinstance(get_summary_generator(_settings("fake-key")), LLMSummaryGenerator)
