"""User queries only.

WHAT: Look a user up by id.
LAYER: Repository.
CALLED BY: users/service.py and the seed script.
CALLS: SQLAlchemy.
MERN EQUIVALENT: `User.findById(id)`.
"""

from sqlalchemy.orm import Session

from app.modules.users.models import User


def get_by_id(db: Session, user_id: int) -> User | None:
    """The user with this id, or None."""
    # `db.get(Model, pk)` is the fast primary-key lookup (it may answer from the session cache).
    return db.get(User, user_id)
