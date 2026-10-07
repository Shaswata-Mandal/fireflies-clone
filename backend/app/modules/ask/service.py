"""Ask-a-question business rules: ownership, prompt budget, LLM call, citation validation."""

from sqlalchemy.orm import Session

from app.core.exceptions import EmptyTranscriptError
from app.modules.ask import prompt
from app.modules.ask.schemas import AskRequest, AskResponse, WorkspaceAskResponse
from app.modules.transcripts import service as transcripts_service
from app.modules.users.models import User
from app.utils.llm_client import ChatMessage, generate_text

# Bounds the rows loaded for a workspace-wide question; the prompt budget trims further.
WORKSPACE_MAX_MEETINGS = 20
HISTORY_MAX_MESSAGES = 6  # enough for follow-ups, small enough to leave room for the transcript


def ask_meeting(db: Session, owner: User, meeting_id: int, data: AskRequest) -> AskResponse:
    """Answer `data.question` from this meeting's transcript.

    Raises MEETING_NOT_FOUND (also for another user's meeting), EMPTY_TRANSCRIPT, and the
    LLM_* errors from the client (not configured / rate limited / provider failure).
    """
    segments = transcripts_service.list_segments(db, owner, meeting_id)  # also checks ownership
    if not segments:
        raise EmptyTranscriptError()

    indices = prompt.select_segment_indices(segments, data.question)
    user_prompt = prompt.build_prompt(
        prompt.build_transcript_text(segments, indices), data.question
    )
    raw_answer = generate_text(
        user_prompt,
        context_messages=_trim_history(data),
        system_instruction=prompt.ASK_SYSTEM_INSTRUCTION,
    )
    answer, citations = prompt.parse_answer(raw_answer, segments)
    return AskResponse(answer=answer, citations=citations)


def ask_workspace(db: Session, owner: User, data: AskRequest) -> WorkspaceAskResponse:
    """Answer from the owner's most recent meetings, citing the meeting each line came from.

    Raises EMPTY_TRANSCRIPT when there is nothing to search, plus the LLM_* errors.
    """
    segments = transcripts_service.list_recent_segments(db, owner, WORKSPACE_MAX_MEETINGS)
    if not segments:
        raise EmptyTranscriptError("You have no meeting transcripts to ask about yet")

    indices = prompt.select_segment_indices(
        segments, data.question, with_meeting=True, prefer_start=True
    )
    user_prompt = prompt.build_prompt(
        prompt.build_transcript_text(segments, indices, with_meeting=True), data.question
    )
    raw_answer = generate_text(
        user_prompt,
        context_messages=_trim_history(data),
        system_instruction=prompt.ASK_WORKSPACE_SYSTEM_INSTRUCTION,
    )
    answer, citations = prompt.parse_workspace_answer(raw_answer, segments)
    return WorkspaceAskResponse(answer=answer, citations=citations)


def _trim_history(data: AskRequest) -> list[ChatMessage]:
    return [{"role": m.role, "content": m.content} for m in data.history[-HISTORY_MAX_MESSAGES:]]
