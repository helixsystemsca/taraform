import os
import re
from collections.abc import AsyncIterator
from urllib.parse import urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def redact_database_url(url: str) -> str:
    """Print-safe DATABASE_URL: same host/port/path/query, password replaced with ***."""
    try:
        parts = urlsplit(url)
        host = parts.hostname or ""
        port = f":{parts.port}" if parts.port else ""
        user = parts.username or ""
        if user:
            netloc = f"{user}:***@{host}{port}"
        else:
            netloc = f"{host}{port}" if host else parts.netloc
        return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))
    except Exception:
        return "<unparseable>"


def _normalize_database_url(raw: str) -> str:
    """Collapse accidental whitespace from pasting (common cause of invalid host DNS errors)."""
    s = raw.strip()
    # Remove all whitespace so broken pastes like "postgres . vtt...@..." become one token.
    # (Passwords should not contain spaces; URL-encode if they ever do.)
    s = "".join(s.split())
    return s


def _is_valid_postgres_async_url(url: str) -> bool:
    try:
        parts = urlsplit(url)
        if not parts.scheme or not parts.netloc:
            return False
        # Async driver + Postgres (Supabase URI uses postgres:// or postgresql://)
        if parts.scheme not in {"postgres", "postgresql", "postgresql+asyncpg"}:
            return False
        if not parts.hostname:
            return False
        return True
    except Exception:
        return False


def get_database_url() -> str:
    """Resolve DB URL from DATABASE_URL only. Local dev: unset → SQLite."""
    raw = os.getenv("DATABASE_URL")
    if raw is None or not str(raw).strip():
        os.makedirs("data", exist_ok=True)
        return "sqlite+aiosqlite:///./data/study.db"

    url = _normalize_database_url(str(raw))

    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://") :]
    elif url.startswith("postgresql://") and "+asyncpg" not in url.split("://", 1)[0]:
        url = "postgresql+asyncpg://" + url.split("://", 1)[1]

    if not _is_valid_postgres_async_url(url):
        raise ValueError(
            "DATABASE_URL must be a single-line Postgres URI, e.g. "
            "postgresql+asyncpg://postgres:PASSWORD@aws-0-....pooler.supabase.com:6543/postgres "
            f"(got redacted shape: {redact_database_url(url)})"
        )

    return url


def _supabase_direct_db_host(url: str) -> bool:
    u = url.lower()
    return "db." in u and "supabase.co" in u and "pooler.supabase.com" not in u


def _asyncpg_engine_kwargs(url: str) -> dict:
    """PgBouncer (Supabase transaction pooler :6543) needs statement cache disabled for asyncpg."""
    if "+asyncpg" not in url:
        return {}
    if "pooler.supabase.com" in url.lower() or ":6543" in url:
        return {"connect_args": {"statement_cache_size": 0}}
    return {}


def get_engine():
    global _engine, _session_factory
    if _engine is None:
        url = get_database_url()
        if url.startswith("sqlite"):
            # TEMPORARY: verify which backend is used without exposing secrets
            print("DATABASE_URL: <not set or empty> → using sqlite+aiosqlite (local dev)")
        else:
            # TEMPORARY: verify Postgres host/port/path (password redacted)
            print(f"DATABASE_URL (password redacted): {redact_database_url(url)}")
            try:
                p = urlsplit(url)
                h, po = p.hostname or "", p.port
                print(
                    f"DATABASE target (TEMP DEBUG): {h}:{po if po is not None else '<default port>'}"
                )
                if h and "pooler.supabase.com" in h.lower():
                    print(
                        "DATABASE pooler (TEMP DEBUG): host matches *.pooler.supabase.com — "
                        "asyncpg will use connect_args statement_cache_size=0"
                    )
            except Exception:
                pass
            if _supabase_direct_db_host(url):
                print(
                    "NOTE: Using Supabase direct host db.*.supabase.co; some hosts need the pooler URL instead."
                )
        kwargs = _asyncpg_engine_kwargs(url)
        # TEMPORARY: confirm PgBouncer / pooler asyncpg settings (no secrets)
        if not url.startswith("sqlite"):
            print(f"create_async_engine connect_args (TEMP DEBUG): {kwargs.get('connect_args', {})}")
        _engine = create_async_engine(url, echo=False, pool_pre_ping=True, **kwargs)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)
    return _engine


def session_factory() -> async_sessionmaker[AsyncSession]:
    get_engine()
    assert _session_factory is not None
    return _session_factory


async def init_db() -> None:
    from ..models import sticky_note as _sticky_note_model  # noqa: F401
    from ..models import summary as _summary_model  # noqa: F401
    from ..models import unit as _unit_model  # noqa: F401
    from ..models import unit_pdf_markup as _unit_pdf_markup_model  # noqa: F401

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_db() -> AsyncIterator[AsyncSession]:
    factory = session_factory()
    async with factory() as session:
        yield session
