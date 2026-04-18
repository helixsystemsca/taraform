"""Wall-clock UTC as naive datetime for PostgreSQL TIMESTAMP WITHOUT TIME ZONE (asyncpg)."""

from datetime import datetime, timezone


def utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
