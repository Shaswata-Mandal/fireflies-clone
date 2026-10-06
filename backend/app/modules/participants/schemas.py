"""Response models for /participants (filter dropdown, assignee picker)."""

from pydantic import BaseModel, ConfigDict


class ParticipantItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    avatar_color: str | None


class ParticipantList(BaseModel):
    items: list[ParticipantItem]
