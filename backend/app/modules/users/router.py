"""HTTP layer for /me."""

from fastapi import APIRouter

from app.core.deps import CurrentUser
from app.modules.users.schemas import UserRead

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(user: CurrentUser) -> UserRead:
    # The CurrentUser dependency already resolved the user, so there is nothing for a service to do.
    return UserRead.model_validate(user)
