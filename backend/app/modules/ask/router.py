"""HTTP layer for POST /meetings/{id}/ask."""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.ask import service
from app.modules.ask.schemas import AskRequest, AskResponse, WorkspaceAskResponse

router = APIRouter(tags=["ask"])


@router.post("/meetings/{meeting_id}/ask", response_model=AskResponse)
def ask_meeting(meeting_id: int, body: AskRequest, db: DbSession, user: CurrentUser) -> AskResponse:
    return service.ask_meeting(db, user, meeting_id, body)


@router.post("/ask", response_model=WorkspaceAskResponse)
def ask_workspace(body: AskRequest, db: DbSession, user: CurrentUser) -> WorkspaceAskResponse:
    return service.ask_workspace(db, user, body)
