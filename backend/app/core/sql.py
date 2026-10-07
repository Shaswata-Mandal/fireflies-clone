"""Small SQL helpers shared by repositories.

WHAT: Utilities for building safe SQL conditions (currently just LIKE escaping).
LAYER: Core helper used by the repository layer.
CALLED BY: repositories that implement text search with `ilike`.
CALLS: nothing.
MERN EQUIVALENT: escaping user text before building a Mongo `$regex` query.
"""

LIKE_ESCAPE_CHAR = "\\"


def escape_like(value: str) -> str:
    """Make user text literal inside LIKE: `%` and `_` must not act as wildcards.

    Pair with `.ilike(pattern, escape=LIKE_ESCAPE_CHAR)`.

    Args:
        value: raw text typed by the user.
    Returns:
        The text with backslash, `%` and `_` each prefixed by the escape character.
    Why it exists: otherwise searching "100%" or "a_b" would match far more rows than intended.
    """
    # Order matters: escape the escape character first, or we would double-escape our own output.
    return (
        value.replace(LIKE_ESCAPE_CHAR, LIKE_ESCAPE_CHAR * 2)
        .replace("%", f"{LIKE_ESCAPE_CHAR}%")
        .replace("_", f"{LIKE_ESCAPE_CHAR}_")
    )
