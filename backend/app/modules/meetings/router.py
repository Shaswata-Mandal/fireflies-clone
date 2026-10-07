"""HTTP layer for /meetings: parse the request, call one service function, return the response.

WHAT: The REST endpoints for meetings: list, create (JSON), create (file upload), read, patch,
    delete.
LAYER: Router (HTTP only; no queries or business rules).
CALLED BY: main.py includes this router under /api/v1; the frontend's meetings/api.ts calls it.
CALLS: meetings/service.py (exactly one service function per endpoint).
MERN EQUIVALENT: an Express `Router` file (`router.get('/', controller.list)`), where FastAPI
    parses and validates `req.query`, `req.params` and `req.body` for you from the signature.
"""

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

# `prefix` is prepended to every route here (so "" below means "/api/v1/meetings").
router = APIRouter(prefix="/meetings", tags=["meetings"])


# `response_model` makes FastAPI validate and filter the returned object into MeetingList's shape.
@router.get("", response_model=MeetingList)
def list_meetings(
    db: DbSession,
    user: CurrentUser,
    # Function parameters that are not path params become QUERY params (?q=...&page=2).
    # `Annotated[type, Query(...)]` adds validation rules; the `= None` makes it optional.
    q: Annotated[str | None, Query(max_length=200)] = None,
    participant_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    tag_id: int | None = None,
    sort: MeetingSort = MeetingSort.DATE_DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> MeetingList:
    """GET /meetings: the library list with optional search, filters, sort and pagination."""
    filters = MeetingFilters(q, participant_id, date_from, date_to, tag_id)
    return service.list_meetings(db, user, filters=filters, sort=sort, page=page, limit=limit)


@router.post("", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED)
def create_meeting(body: MeetingCreate, db: DbSession, user: CurrentUser) -> MeetingDetail:
    """POST /meetings: create a meeting from a JSON body (a Pydantic model param = request body)."""
    return service.create_meeting(db, user, body)


@router.post("/upload", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED)
def upload_meeting(
    db: DbSession,
    user: CurrentUser,
    # `Form()` / `File()` read multipart/form-data fields (what a browser FormData sends), the
    # equivalent of using `multer` in Express.
    title: Annotated[str, Form()],
    meeting_date: Annotated[AwareDatetime, Form()],
    file: Annotated[UploadFile, File()],
    # Form fields are always strings, so the participant list arrives as JSON text and the
    # service parses it.
    participants: Annotated[str, Form()] = "[]",
    generate_summary: Annotated[bool, Form()] = False,
) -> MeetingDetail:
    """POST /meetings/upload: create a meeting from an uploaded transcript file."""
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


# `{meeting_id}` in the path + `meeting_id: int` in the signature = a typed path param; a
# non-integer gets an automatic 422 before this function runs.
@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: DbSession, user: CurrentUser) -> MeetingDetail:
    """GET /meetings/{id}: one meeting with participants, summary, chapters and tags."""
    return service.get_meeting(db, user, meeting_id)


@router.patch("/{meeting_id}", response_model=MeetingDetail)
def update_meeting(
    meeting_id: int, body: MeetingUpdate, db: DbSession, user: CurrentUser
) -> MeetingDetail:
    """PATCH /meetings/{id}: partial update (only the fields sent are changed)."""
    return service.update_meeting(db, user, meeting_id, body)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(meeting_id: int, db: DbSession, user: CurrentUser) -> Response:
    """DELETE /meetings/{id}: remove a meeting and, via cascade, everything under it."""
    service.delete_meeting(db, user, meeting_id)
    # 204 means "no content", so we return an empty Response instead of a JSON body.
    return Response(status_code=status.HTTP_204_NO_CONTENT)
