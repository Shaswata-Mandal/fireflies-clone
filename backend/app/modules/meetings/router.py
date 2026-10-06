"""HTTP layer for /meetings: parse the request, call one service function, return the response."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, File, Form, Query, Response, UploadFile, status
from pydantic import AwareDatetime

from app.core.deps import CurrentUser, DbSession
from app.modules.meetings import service
from app.modules.meetings.repository import MeetingFilters
from app.modules.meetings.schemas import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    MeetingCreate,
    MeetingDetail,
    MeetingList,
    MeetingSort,
    MeetingUpdate,
)

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("", response_model=MeetingList)
def list_meetings(
    db: DbSession,
    user: CurrentUser,
    q: Annotated[str | None, Query(max_length=200)] = None,
    participant_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    tag_id: int | None = None,
    sort: MeetingSort = MeetingSort.DATE_DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> MeetingList:
    filters = MeetingFilters(q, participant_id, date_from, date_to, tag_id)
    return service.list_meetings(db, user, filters=filters, sort=sort, page=page, limit=limit)


@router.post("", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED)
def create_meeting(body: MeetingCreate, db: DbSession, user: CurrentUser) -> MeetingDetail:
    return service.create_meeting(db, user, body)


@router.post("/upload", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED)
def upload_meeting(
    db: DbSession,
    user: CurrentUser,
    title: Annotated[str, Form()],
    meeting_date: Annotated[AwareDatetime, Form()],
    file: Annotated[UploadFile, File()],
    participants: Annotated[str, Form()] = "[]",
    generate_summary: Annotated[bool, Form()] = False,
) -> MeetingDetail:
    # One byte past the limit is enough for the service to reject it, without buffering a huge body.
    content = file.file.read(service.MAX_UPLOAD_BYTES + 1)
    return service.create_meeting_from_upload(
        db,
        user,
        title=title,
        meeting_date=meeting_date,
        participants_json=participants,
        generate_summary=generate_summary,
        filename=file.filename or "",
        content=content,
    )


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: DbSession, user: CurrentUser) -> MeetingDetail:
    return service.get_meeting(db, user, meeting_id)


@router.patch("/{meeting_id}", response_model=MeetingDetail)
def update_meeting(
    meeting_id: int, body: MeetingUpdate, db: DbSession, user: CurrentUser
) -> MeetingDetail:
    return service.update_meeting(db, user, meeting_id, body)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(meeting_id: int, db: DbSession, user: CurrentUser) -> Response:
    service.delete_meeting(db, user, meeting_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
