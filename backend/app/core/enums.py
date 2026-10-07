"""Enumerations stored in the database. Values are the strings persisted and sent over the API.

WHAT: Fixed sets of allowed values (meeting source, platform, participant role, summary author).
LAYER: Core; shared by models (columns), schemas (validation) and services (logic).
CALLED BY: models.py files via `str_enum(...)`, Pydantic schemas, services and the seed script.
CALLS: nothing.
MERN EQUIVALENT: a TypeScript string-literal union or a frozen constants object like
    `const Source = { SEED: 'seed', ... }`, except it also validates at runtime.
"""

from enum import StrEnum


# INTERVIEW: `StrEnum` members ARE strings (`MeetingSource.SEED == "seed"`), so they serialise to
# JSON with no extra code, and CLAUDE.md asks for enums instead of magic strings.
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
    """A participant's role in one meeting: the organiser or an invited attendee."""

    HOST = "host"
    ATTENDEE = "attendee"


class GeneratedBy(StrEnum):
    """Who produced a summary: shipped seed data, the deterministic mock, or the LLM."""

    SEED = "seed"
    MOCK = "mock"
    LLM = "llm"
