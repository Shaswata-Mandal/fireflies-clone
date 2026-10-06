import pytest
from sqlalchemy.orm import Session

from app.core.deps import DEFAULT_USER_ID, get_current_user
from app.core.exceptions import NotFoundError
from app.models import User


def test_get_current_user_returns_default_user(db_session: Session) -> None:
    db_session.add(User(id=DEFAULT_USER_ID, name="Default User", email="me@example.com"))
    db_session.commit()

    user = get_current_user(db_session)

    assert user.id == DEFAULT_USER_ID


def test_get_current_user_raises_when_db_not_seeded(db_session: Session) -> None:
    with pytest.raises(NotFoundError) as exc_info:
        get_current_user(db_session)

    assert exc_info.value.code == "USER_NOT_FOUND"
    assert exc_info.value.status_code == 404
