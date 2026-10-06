"""HTTP layer for action items."""

from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.core.deps import CurrentUser, DbSession
from app.modules.action_items import service
from app.modules.action_items.schemas import (
    ActionItemCreate,
    ActionItemList,
    ActionItemPage,
    ActionItemRead,
    ActionItemStatus,
    ActionItemUpdate,
)
from app.modules.meetings.schemas import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

router = APIRouter(tags=["action-items"])


@router.get("/meetings/{meeting_id}/action-items", response_model=ActionItemList)
def list_meeting_action_items(meeting_id: int, db: DbSession, user: CurrentUser) -> ActionItemList:
    items = service.list_for_meeting(db, user, meeting_id)
    return ActionItemList(items=[service.to_read(item) for item in items])


@router.post(
    "/meetings/{meeting_id}/action-items",
    response_model=ActionItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_action_item(
    meeting_id: int, body: ActionItemCreate, db: DbSession, user: CurrentUser
) -> ActionItemRead:
    return service.create_item(db, user, meeting_id, body)


@router.get("/action-items", response_model=ActionItemPage)
def list_action_items(
    db: DbSession,
    user: CurrentUser,
    status: ActionItemStatus | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> ActionItemPage:
    return service.list_all(db, user, status=status, page=page, limit=limit)


@router.patch("/action-items/{item_id}", response_model=ActionItemRead)
def update_action_item(
    item_id: int, body: ActionItemUpdate, db: DbSession, user: CurrentUser
) -> ActionItemRead:
    return service.update_item(db, user, item_id, body)


@router.delete("/action-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action_item(item_id: int, db: DbSession, user: CurrentUser) -> Response:
    service.delete_item(db, user, item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
