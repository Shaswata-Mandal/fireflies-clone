"""POST /meetings/{id}/ask. `generate_text` is faked: no network."""

from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.exceptions import LLMNotConfiguredError, LLMRateLimitedError
from app.models import TranscriptSegment
from app.modules.ask import prompt, service
from tests.helpers import OTHER_USER_ID, MakeMeeting

API = "/api/v1"
MakeSegments = Callable[..., list[TranscriptSegment]]

LINES = [
    ("Priya", "Let's start with the roadmap."),
    ("Rahul", "I'll send the revised budget by Friday."),
    ("Priya", "Great, we decided to launch in March."),
]


def ask_url(meeting_id: int) -> str:
    return f"{API}/meetings/{meeting_id}/ask"


class FakeLLM:
    def __init__(self, reply: str = "ok", error: Exception | None = None) -> None:
        self.reply = reply
        self.error = error
        self.calls: list[dict[str, Any]] = []

    def __call__(self, user_prompt: str, **kwargs: Any) -> str:
        self.calls.append({"prompt": user_prompt, **kwargs})
        if self.error:
            raise self.error
        return self.reply


@pytest.fixture
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> FakeLLM:
    fake = FakeLLM()
    monkeypatch.setattr(service, "generate_text", fake)
    return fake


@pytest.fixture
def meeting_with_segments(
    make_meeting: MakeMeeting, make_segments: MakeSegments
) -> tuple[int, list[TranscriptSegment]]:
    meeting = make_meeting("Roadmap sync")
    return meeting.id, make_segments(meeting, LINES)


# ── endpoint ────────────────────────────────────────────────────────────────────────────────────


def test_answer_with_valid_citations(
    api: TestClient, fake_llm: FakeLLM, meeting_with_segments: tuple[int, list[TranscriptSegment]]
) -> None:
    meeting_id, segments = meeting_with_segments
    fake_llm.reply = (
        f"Launch is in March [s:{segments[2].id}]. Budget by Friday [s:{segments[1].id}]."
    )

    response = api.post(ask_url(meeting_id), json={"question": "When do we launch?"})

    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == "Launch is in March. Budget by Friday."
    assert body["citations"] == [
        {"segment_id": segments[2].id, "start_ms": 20_000, "speaker_label": "Priya"},
        {"segment_id": segments[1].id, "start_ms": 10_000, "speaker_label": "Rahul"},
    ]
    call = fake_llm.calls[0]
    assert f"[s:{segments[0].id}] [00:00] Priya:" in call["prompt"]
    assert "ONLY the transcript" in call["system_instruction"]


def test_invalid_citation_ids_are_dropped(
    api: TestClient,
    fake_llm: FakeLLM,
    make_meeting: MakeMeeting,
    make_segments: MakeSegments,
    meeting_with_segments: tuple[int, list[TranscriptSegment]],
) -> None:
    meeting_id, segments = meeting_with_segments
    foreign = make_segments(make_meeting("Other meeting", owner_id=OTHER_USER_ID), LINES)[0]
    fake_llm.reply = (
        f"A [s:{segments[0].id}] B [s:999999] C [s:{foreign.id}] D [s:{segments[0].id}]"
    )

    body = api.post(ask_url(meeting_id), json={"question": "What happened?"}).json()

    assert [c["segment_id"] for c in body["citations"]] == [segments[0].id]
    assert "[s:" not in body["answer"]


def test_history_is_trimmed_to_last_six(
    api: TestClient, fake_llm: FakeLLM, meeting_with_segments: tuple[int, list[TranscriptSegment]]
) -> None:
    meeting_id, _ = meeting_with_segments
    history = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"m{i}"} for i in range(10)
    ]

    response = api.post(ask_url(meeting_id), json={"question": "And then?", "history": history})

    assert response.status_code == 200
    sent = fake_llm.calls[0]["context_messages"]
    assert [m["content"] for m in sent] == ["m4", "m5", "m6", "m7", "m8", "m9"]


@pytest.mark.parametrize("question", ["", "   ", "x" * 501])
def test_question_length_is_validated(
    api: TestClient,
    fake_llm: FakeLLM,
    meeting_with_segments: tuple[int, list[TranscriptSegment]],
    question: str,
) -> None:
    response = api.post(ask_url(meeting_with_segments[0]), json={"question": question})
    assert response.status_code == 422
    assert fake_llm.calls == []


def test_other_users_meeting_is_404(
    api: TestClient, fake_llm: FakeLLM, make_meeting: MakeMeeting, make_segments: MakeSegments
) -> None:
    meeting = make_meeting("Private", owner_id=OTHER_USER_ID)
    make_segments(meeting, LINES)

    response = api.post(ask_url(meeting.id), json={"question": "What was said?"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MEETING_NOT_FOUND"
    assert fake_llm.calls == []


def test_empty_transcript_is_400(
    api: TestClient, fake_llm: FakeLLM, make_meeting: MakeMeeting
) -> None:
    response = api.post(ask_url(make_meeting("Empty").id), json={"question": "Anything?"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "EMPTY_TRANSCRIPT"


def test_not_configured_is_503(
    api: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    meeting_with_segments: tuple[int, list[TranscriptSegment]],
) -> None:
    monkeypatch.setattr(settings, "GROQ_API_KEY", None)  # real generate_text, no key

    response = api.post(ask_url(meeting_with_segments[0]), json={"question": "Hi?"})

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "LLM_NOT_CONFIGURED"


def test_rate_limit_is_429_with_retry_after(
    api: TestClient, fake_llm: FakeLLM, meeting_with_segments: tuple[int, list[TranscriptSegment]]
) -> None:
    fake_llm.error = LLMRateLimitedError(60)

    response = api.post(ask_url(meeting_with_segments[0]), json={"question": "Hi?"})

    assert response.status_code == 429
    error = response.json()["error"]
    assert error["code"] == "LLM_RATE_LIMITED"
    assert error["details"] == {"retry_after": 60}


def test_not_configured_error_type_is_an_app_exception() -> None:
    assert LLMNotConfiguredError().status_code == 503


# ── prompt selection ────────────────────────────────────────────────────────────────────────────


def _segment(i: int, text: str) -> TranscriptSegment:
    return TranscriptSegment(
        id=i + 1, meeting_id=1, speaker_label="A", start_ms=i * 1000, end_ms=i * 1000 + 900,
        text=text, position=i,
    )  # fmt: skip


def test_short_transcript_is_kept_whole() -> None:
    segments = [_segment(i, f"line {i}") for i in range(5)]
    assert prompt.select_segment_indices(segments, "anything") == [0, 1, 2, 3, 4]


def test_truncation_keeps_relevant_segments_and_neighbours() -> None:
    filler = "lorem ipsum dolor sit amet " * 4
    segments = [_segment(i, filler) for i in range(200)]
    segments[120] = _segment(120, "The pricing decision was to keep the annual plan.")
    budget = 1_000  # far smaller than the ~25k chars of transcript

    indices = prompt.select_segment_indices(segments, "What was decided about pricing?", budget)

    assert {119, 120, 121} <= set(indices)
    assert indices == sorted(indices)
    assert sum(len(prompt.format_line(segments[i])) + 1 for i in indices) <= budget
    assert len(indices) < len(segments)


def test_truncation_without_keyword_hits_keeps_start_and_end() -> None:
    segments = [_segment(i, "lorem ipsum dolor sit amet " * 4) for i in range(200)]

    indices = prompt.select_segment_indices(segments, "Summarize this meeting", 1_000)

    assert indices[0] == 0
    assert indices[-1] == 199


def test_gap_marker_sits_between_non_adjacent_segments() -> None:
    segments = [_segment(i, f"line {i}") for i in range(6)]
    text = prompt.build_transcript_text(segments, [0, 1, 4])
    assert text.splitlines()[2] == prompt.GAP_MARKER
    assert len(text.splitlines()) == 4
