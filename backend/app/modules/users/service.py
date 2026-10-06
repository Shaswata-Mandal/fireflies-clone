from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.modules.users import repository
from app.modules.users.models import User


def get_user(db: Session, user_id: int) -> User:
    """Return the user or raise USER_NOT_FOUND (for the default user: the DB was never seeded)."""
    user = repository.get_by_id(db, user_id)
    if user is None:
        raise NotFoundError("USER_NOT_FOUND", f"User {user_id} not found")
    return user
