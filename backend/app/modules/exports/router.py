"""HTTP layer for /meetings/{id}/export: returns the file as a download.

WHAT: One endpoint that sends a meeting as a `.md` or `.txt` file.
LAYER: Router.
CALLED BY: main.py (under /api/v1); the frontend's "Download" menu.
CALLS: exports/service.py.
MERN EQUIVALENT: an Express route using `res.attachment(filename).send(text)`.
"""

from fastapi import APIRouter, Response

from app.core.deps import CurrentUser, DbSession
from app.modules.exports import service
from app.utils.export_formatter import ExportFormat

router = APIRouter(tags=["exports"])


@router.get("/meetings/{meeting_id}/export")
def export_meeting(
    meeting_id: int, db: DbSession, user: CurrentUser, format: ExportFormat
) -> Response:
    """GET /meetings/{id}/export?format=md|txt: the meeting as a downloadable file."""
    # `format` shadows a builtin but is the query param name docs/api.md defines.
    result = service.export_meeting(db, user, meeting_id, format)
    # We build the Response ourselves (no response_model) because the body is a file, not JSON.
    # `Content-Disposition: attachment` tells the browser to download it; the CORS middleware
    # exposes this header so the frontend can read the suggested filename.
    return Response(
        content=result.content,
        media_type=result.media_type,
        headers={"Content-Disposition": f'attachment; filename="{result.filename}"'},
    )
