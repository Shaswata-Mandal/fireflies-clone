"""POST /ask (across all of the user's meetings). `generate_text` is faked: no network."""

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.models import TranscriptSegment
from app.modules.ask import service
from tests.helpers import OTHER_USER_ID, MakeMeeting

URL = "/api/v1/ask"
MakeSegments = Callable[..., list[TranscriptSegment]]


class FakeLLM:
    def __init__(self) -> None:
        self.reply = "ok"
        self.calls: list[dict[str, Any]] = []

    def __call__(self, user_prompt: str, **kwargs: Any) -> str:
        self.calls.append({"prompt": user_prompt, **kwargs})
        return self.reply


@pytest.fixture
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> FakeLLM:
    fake = FakeLLM()
    monkeypatch.setattr(service, "generate_text", fake)
    return fake


def test_citations_name_the_meeting_and_exclude_other_users(
    api: TestClient, fake_llm: FakeLLM, make_meeting: MakeMeeting, make_segments: MakeSegments
) -> None:
    mine = make_meeting("Roadmap sync", meeting_date=datetime(2026, 10, 2, tzinfo=UTC))
    older = make_meeting("Budget review", meeting_date=datetime(2026, 9, 1, tzinfo=UTC))
    theirs = make_meeting("Secret", owner_id=OTHER_USER_ID)
    mine_segments = make_segments(mine, [("Priya", "We ship in March.")])
    older_segments = make_segments(older, [("Rahul", "Budget is approved.")])
    foreign = make_segments(theirs, [("Eve", "Confidential plan.")])[0]
    fake_llm.reply = (
        f"Ship in March [s:{mine_segments[0].id}], budget approved [s:{older_segments[0].id}] "
        f"[s:{foreign.id}]."
    )

    response = api.post(URL, json={"question": "What did we decide?"})

    assert response.status_code == 200
    body = response.json()
    assert [(c["meeting_id"], c["meeting_title"]) for c in body["citations"]] == [
        (mine.id, "Roadmap sync"),
        (older.id, "Budget review"),
    ]
    assert "[s:" not in body["answer"]
    prompt_text = fake_llm.calls[0]["prompt"]
    assert "Roadmap sync, 00:00" in prompt_text
    assert "Confidential plan" not in prompt_text
    assert prompt_text.index("Roadmap sync") < prompt_text.index("Budget review")  # newest first


def test_no_transcripts_is_400(api: TestClient, fake_llm: FakeLLM) -> None:
    response = api.post(URL, json={"question": "What's my day looking like?"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "EMPTY_TRANSCRIPT"
    assert fake_llm.calls == []


def test_not_configured_is_503(
    api: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    make_meeting: MakeMeeting,
    make_segments: MakeSegments,
) -> None:
    monkeypatch.setattr(settings, "GROQ_API_KEY", None)
    make_segments(make_meeting("Any"), [("A", "hello")])
    response = api.post(URL, json={"question": "Hi?"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "LLM_NOT_CONFIGURED"


@pytest.mark.parametrize("question", ["", "x" * 501])
def test_question_length_is_validated(api: TestClient, fake_llm: FakeLLM, question: str) -> None:
    assert api.post(URL, json={"question": question}).status_code == 422
