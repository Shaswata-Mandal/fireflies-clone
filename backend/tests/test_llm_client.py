"""llm_client tests. The Groq client is always faked: no network, no real key."""

from types import SimpleNamespace
from typing import Any

import httpx
import pytest
from groq import APIStatusError, RateLimitError

from app.core.config import settings
from app.core.exceptions import LLMError, LLMNotConfiguredError, LLMRateLimitedError
from app.utils import llm_client


class FakeGroq:
    """Mimics `client.chat.completions.create(...)`; records the call for assertions."""

    def __init__(self, content: str | None = "hello", error: Exception | None = None) -> None:
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


def _status_error(cls: type[APIStatusError], status_code: int) -> APIStatusError:
    request = httpx.Request("POST", "https://api.groq.com/test")
    response = httpx.Response(status_code, request=request)
    return cls("provider said no", response=response, body=None)


@pytest.fixture
def fake_groq(monkeypatch: pytest.MonkeyPatch) -> FakeGroq:
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(settings, "LLM_MODEL", "test-model")
    fake = FakeGroq()
    monkeypatch.setattr(llm_client, "_create_client", lambda _key: fake)
    return fake


def test_missing_key_raises_not_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "GROQ_API_KEY", None)
    with pytest.raises(LLMNotConfiguredError) as caught:
        llm_client.generate_text("hi")
    assert caught.value.status_code == 503
    assert caught.value.code == "LLM_NOT_CONFIGURED"


def test_builds_messages_in_order(fake_groq: FakeGroq) -> None:
    result = llm_client.generate_text(
        "final question",
        context_messages=[
            {"role": "user", "content": "earlier question"},
            {"role": "assistant", "content": "earlier answer"},
        ],
        system_instruction="be brief",
    )
    assert result == "hello"
    call = fake_groq.calls[0]
    assert call["model"] == "test-model"
    assert call["temperature"] == llm_client.DEFAULT_TEMPERATURE
    assert [(m["role"], m["content"]) for m in call["messages"]] == [
        ("system", "be brief"),
        ("user", "earlier question"),
        ("assistant", "earlier answer"),
        ("user", "final question"),
    ]


def test_no_system_message_when_instruction_is_missing(fake_groq: FakeGroq) -> None:
    llm_client.generate_text("hi")
    assert [m["role"] for m in fake_groq.calls[0]["messages"]] == ["user"]


def test_http_429_maps_to_rate_limited(fake_groq: FakeGroq) -> None:
    fake_groq._error = _status_error(RateLimitError, 429)
    with pytest.raises(LLMRateLimitedError) as caught:
        llm_client.generate_text("hi")
    assert caught.value.status_code == 429
    assert caught.value.code == "LLM_RATE_LIMITED"
    assert caught.value.details == {"retry_after": llm_client.RATE_LIMIT_RETRY_AFTER_SECONDS}


@pytest.mark.parametrize(
    "error",
    [_status_error(APIStatusError, 500), TimeoutError("slow"), RuntimeError("boom")],
)
def test_other_failures_map_to_llm_error(fake_groq: FakeGroq, error: Exception) -> None:
    fake_groq._error = error
    with pytest.raises(LLMError) as caught:
        llm_client.generate_text("hi")
    assert caught.value.status_code == 502
    assert caught.value.code == "LLM_ERROR"


@pytest.mark.parametrize("content", [None, "", "   "])
def test_empty_reply_is_an_llm_error(fake_groq: FakeGroq, content: str | None) -> None:
    fake_groq._content = content
    with pytest.raises(LLMError):
        llm_client.generate_text("hi")


def test_logs_never_contain_the_key_or_prompt(
    fake_groq: FakeGroq, caplog: pytest.LogCaptureFixture
) -> None:
    fake_groq._error = _status_error(APIStatusError, 500)
    with pytest.raises(LLMError):
        llm_client.generate_text("secret transcript words")
    assert "test-key" not in caplog.text
    assert "secret transcript words" not in caplog.text
