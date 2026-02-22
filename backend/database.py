"""Async SQLAlchemy database engine and session management."""
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from backend.config import config

# Ensure data directory exists
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

DATABASE_URL = config["database"]["url"]

engine = create_async_engine(
    DATABASE_URL,
    echo=config["database"].get("echo", False),
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables and run safe column migrations."""
    from backend.models import (
        User, DailyLog, Person, Interaction,
        Project, Task, LifeAreaScore, Goal, GoalCheckIn, Decision,
        KnowledgeFact,
    )
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe column additions for SQLite (no-op if already exists)
        for col_sql in [
            "ALTER TABLE people ADD COLUMN known_since DATE",
            "ALTER TABLE people ADD COLUMN birthday DATE",
            "ALTER TABLE daily_logs ADD COLUMN photo_urls JSON DEFAULT '[]'",
            "ALTER TABLE agent_insights ADD COLUMN insight_period VARCHAR(20)",
            "ALTER TABLE agent_insights ADD COLUMN parent_insight_id INTEGER REFERENCES agent_insights(id)",
        ]:
            try:
                await conn.execute(text(col_sql))
            except Exception:
                pass  # Column already exists


async def get_db():
    """Dependency that yields a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
