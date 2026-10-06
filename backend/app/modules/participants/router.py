"""HTTP layer for /participants."""

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
    people = service.list_participants(db, user, q)
    return ParticipantList(items=[ParticipantItem.model_validate(p) for p in people])
