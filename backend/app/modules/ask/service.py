"""Ask-a-question business rules: ownership, prompt budget, LLM call, citation validation.

WHAT: Loads the right transcript lines, builds the prompt, calls the LLM and returns the answer
    with validated citations.
LAYER: Service. There is no repository: segments are read through `transcripts.service`
    (service -> service), see docs decision 112.
CALLED BY: ask/router.py.
CALLS: transcripts/service.py, ask/prompt.py, utils/llm_client.py (`generate_text`).
MERN EQUIVALENT: a `chatService.js` that fetches context, calls OpenAI and post-processes the reply.
INTERVIEW: nothing is saved. Chat history is sent by the client on each request, so the server
stays stateless and no chat table is needed.
"""

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

    # Steps: pick lines that fit -> render them -> call the model -> clean and verify the answer.
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

    # `prefer_start=True`: segments arrive newest meeting first, so keep the start of that list.
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
    """The last few chat turns as plain dicts for the LLM client (older ones are dropped)."""
    # `[-n:]` takes the last n items (like JS `slice(-n)`).
    return [{"role": m.role, "content": m.content} for m in data.history[-HISTORY_MAX_MESSAGES:]]
