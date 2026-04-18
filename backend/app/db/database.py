import os
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_database_url() -> str:
    url = (os.getenv("DATABASE_URL") or "").strip()
    if not url:
        os.makedirs("data", exist_ok=True)
        return "sqlite+aiosqlite:///./data/study.db"
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://") :]
    elif url.startswith("postgresql://") and "+asyncpg" not in url.split("://", 1)[0]:
        url = "postgresql+asyncpg://" + url.split("://", 1)[1]
    return url


def _supabase_direct_db_host(url: str) -> bool:
    u = url.lower()
    return "db." in u and "supabase.co" in u and "pooler.supabase.com" not in u


def _asyncpg_engine_kwargs(url: str) -> dict:
    """PgBouncer (e.g. Supabase transaction pooler :6543) needs statement cache disabled for asyncpg."""
    if "+asyncpg" not in url:
        return {}
    if "pooler.supabase.com" in url.lower() or ":6543" in url:
        return {"connect_args": {"statement_cache_size": 0}}
    return {}


def get_engine():
    global _engine, _session_factory
    if _engine is None:
        url = get_database_url()
        if "+asyncpg" in url and _supabase_direct_db_host(url):
            print(
                "WARN: DATABASE_URL uses Supabase direct host (db.*.supabase.co). "
                "Render often fails with [Errno 101] Network is unreachable (IPv6). "
                "Switch to the Pooler connection string in Supabase → Project Settings → Database "
                "(Transaction pooler, port 6543, or Session pooler)."
            )
        kwargs = _asyncpg_engine_kwargs(url)
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
