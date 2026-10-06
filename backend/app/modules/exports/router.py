"""HTTP layer for /meetings/{id}/export: returns the file as a download."""

from fastapi import APIRouter, Response

from app.core.deps import CurrentUser, DbSession
from app.modules.exports import service
from app.utils.export_formatter import ExportFormat

router = APIRouter(tags=["exports"])


@router.get("/meetings/{meeting_id}/export")
def export_meeting(
    meeting_id: int, db: DbSession, user: CurrentUser, format: ExportFormat
) -> Response:
    # `format` shadows a builtin but is the query param name docs/api.md defines.
    result = service.export_meeting(db, user, meeting_id, format)
    return Response(
        content=result.content,
        media_type=result.media_type,
        headers={"Content-Disposition": f'attachment; filename="{result.filename}"'},
    )
