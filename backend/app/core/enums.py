"""Enumerations stored in the database. Values are the strings persisted and sent over the API."""

from enum import StrEnum


class MeetingSource(StrEnum):
    """How the meeting entered the system."""

    SEED = "seed"
    UPLOAD = "upload"
    PASTE = "paste"
    FORM = "form"


class MeetingPlatform(StrEnum):
    """Display-only: where the meeting took place (drives the platform icon)."""

    ZOOM = "zoom"
    GOOGLE_MEET = "google_meet"
    TEAMS = "teams"
    UPLOAD = "upload"


class ParticipantRole(StrEnum):
    HOST = "host"
    ATTENDEE = "attendee"


class GeneratedBy(StrEnum):
    """Who produced a summary: shipped seed data, the deterministic mock, or the LLM."""

    SEED = "seed"
    MOCK = "mock"
    LLM = "llm"
