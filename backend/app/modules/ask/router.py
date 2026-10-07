"""HTTP layer for POST /meetings/{id}/ask.

WHAT: Two endpoints: ask about one meeting, or ask across all of the user's meetings.
LAYER: Router.
CALLED BY: main.py (under /api/v1); the frontend's AskFred chat.
CALLS: ask/service.py.
MERN EQUIVALENT: Express routes `POST /meetings/:id/ask` and `POST /ask` calling a chatbot service.
"""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.ask import service
from app.modules.ask.schemas import AskRequest, AskResponse, WorkspaceAskResponse

router = APIRouter(tags=["ask"])


@router.post("/meetings/{meeting_id}/ask", response_model=AskResponse)
def ask_meeting(meeting_id: int, body: AskRequest, db: DbSession, user: CurrentUser) -> AskResponse:
    """Ask a question answered from one meeting's transcript."""
    return service.ask_meeting(db, user, meeting_id, body)


@router.post("/ask", response_model=WorkspaceAskResponse)
def ask_workspace(body: AskRequest, db: DbSession, user: CurrentUser) -> WorkspaceAskResponse:
    """Ask a question answered from the user's most recent meetings."""
    return service.ask_workspace(db, user, body)
