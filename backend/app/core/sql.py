"""Small SQL helpers shared by repositories."""

LIKE_ESCAPE_CHAR = "\\"


def escape_like(value: str) -> str:
    """Make user text literal inside LIKE: `%` and `_` must not act as wildcards.

    Pair with `.ilike(pattern, escape=LIKE_ESCAPE_CHAR)`.
    """
    return (
        value.replace(LIKE_ESCAPE_CHAR, LIKE_ESCAPE_CHAR * 2)
        .replace("%", f"{LIKE_ESCAPE_CHAR}%")
        .replace("_", f"{LIKE_ESCAPE_CHAR}_")
    )
