"""Shared test constants/types (importable from test modules, unlike conftest.py)."""

from collections.abc import Callable

from app.models import Meeting

OTHER_USER_ID = 2

MakeMeeting = Callable[..., Meeting]
