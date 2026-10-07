"""HTTP layer for /participants.

WHAT: One endpoint that lists (and searches) the people from the current user's meetings.
LAYER: Router.
CALLED BY: main.py (under /api/v1); the frontend's participant filter and assignee picker.
CALLS: participants/service.py.
MERN EQUIVALENT: an Express route `GET /participants?q=` returning a JSON list.
"""

from typing import Annotated

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.modules.participants import service
from app.modules.participants.schemas import ParticipantItem, ParticipantList

router = APIRouter(prefix="/participants", tags=["participants"])


@router.get("", response_model=ParticipantList)
def list_participants(
    db: DbSession, user: CurrentUser, q: Annotated[str | None, Query(max_length=200)] = None
) -> ParticipantList:
    """GET /participants?q=: people in the user's meetings, optionally filtered by text."""
    people = service.list_participants(db, user, q)
    # ORM objects -> DTOs (`from_attributes=True` on ParticipantItem makes this conversion legal).
    return ParticipantList(items=[ParticipantItem.model_validate(p) for p in people])
