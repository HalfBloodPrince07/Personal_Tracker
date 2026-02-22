"""DailyLogAgent — parses a day description, saves the log, and auto-logs interactions."""
import json
import logging
import datetime as dt
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent
from backend.models import DailyLog, Interaction, Person
from backend.schemas import DailyLogCreate, DailyLogResponse

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a personal life journal assistant.
Parse the user's day description and extract structured data.

Output ONLY valid JSON (no markdown fences) in this exact format:
{{
  "mood_score": 7,
  "energy_level": 6,
  "emotions": ["grateful", "focused", "tired"],
  "highlights": "Had a productive meeting. Finished a project milestone.",
  "content": "A reflective 2-3 sentence summary of the day.",
  "people_mentioned": [1, 3],
  "tags": ["work", "exercise"]
}}

Field rules:
- mood_score: 1-10. Very negative→1-3, neutral→4-6, very positive→7-10.
- energy_level: 1-10. "exhausted"/"drained"→low; "energized"/"pumped"→high.
- emotions: up to 6 lowercase emotion words.
- highlights: key moments or achievements (1-2 sentences).
- content: reflective 2-3 sentence summary.
- people_mentioned: IDs from the known people list only — include someone only if their name is clearly stated.
- tags: 2-5 lowercase topic tags."""


def _clamp(val, default=5):
    try:
        return max(1, min(10, int(val)))
    except Exception:
        return default


class DailyLogAgent(BaseAgent):
    name = "DailyLogAgent"
    system_prompt = _SYSTEM_PROMPT

    def _build_user_message(self, text: str, **ctx) -> str:
        log_date     = ctx.get("log_date", dt.date.today())
        people_names = ctx.get("people_names", [])
        header = (
            f"Today's date: {log_date}\n"
            f"Known people in network: {json.dumps(people_names)}\n\n"
        )
        return header + text

    def parse(self, raw: dict, **ctx) -> dict:
        return {
            "mood_score":    _clamp(raw.get("mood_score"))   if raw.get("mood_score")    else None,
            "energy_level":  _clamp(raw.get("energy_level")) if raw.get("energy_level")  else None,
            "emotions":      [str(e).lower() for e in (raw.get("emotions") or [])],
            "highlights":    raw.get("highlights"),
            "content":       raw.get("content") or "",
            "tags":          [str(t).lower() for t in (raw.get("tags") or [])],
            "people_mentioned": [
                int(pid) for pid in (raw.get("people_mentioned") or [])
                if isinstance(pid, (int, float))
            ],
        }

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        user_id  = ctx["user_id"]
        log_date = ctx.get("log_date", dt.date.today())
        original_text = ctx.get("original_text", "")

        # Upsert the daily log
        existing_result = await db.execute(
            select(DailyLog).where(
                DailyLog.user_id == user_id,
                DailyLog.date    == log_date,
            )
        )
        existing = existing_result.scalar_one_or_none()

        log_data = DailyLogCreate(
            date             = log_date,
            content          = parsed["content"] or original_text,
            mood_score       = parsed["mood_score"],
            energy_level     = parsed["energy_level"],
            emotions         = parsed["emotions"],
            highlights       = parsed["highlights"],
            tags             = parsed["tags"],
            people_mentioned = parsed["people_mentioned"],
            decisions_made   = [],
        )

        if existing:
            for key, value in log_data.model_dump(exclude={"date"}).items():
                if value is not None:
                    setattr(existing, key, value)
            existing.updated_at = dt.datetime.utcnow()
            await db.flush()
            await db.refresh(existing)
            saved_log = DailyLogResponse.model_validate(existing)
            action = "updated"
        else:
            log = DailyLog(user_id=user_id, **log_data.model_dump())
            db.add(log)
            await db.flush()
            await db.refresh(log)
            saved_log = DailyLogResponse.model_validate(log)
            action = "created"

        # Auto-log interactions for people mentioned
        auto_logged = []
        for person_id in parsed["people_mentioned"]:
            # Check person belongs to user
            person_result = await db.execute(
                select(Person).where(Person.id == person_id, Person.user_id == user_id)
            )
            person = person_result.scalar_one_or_none()
            if not person:
                continue

            # Avoid duplicate interaction for the same person on the same day
            dup = await db.execute(
                select(Interaction).where(
                    Interaction.user_id   == user_id,
                    Interaction.person_id == person_id,
                    Interaction.date      == log_date,
                    Interaction.context   == "daily_log",
                )
            )
            if dup.scalar_one_or_none():
                continue

            interaction = Interaction(
                user_id       = user_id,
                person_id     = person_id,
                date          = log_date,
                description   = f"Mentioned in daily log: {log_date}",
                emotional_tone = "positive",
                context       = "daily_log",
            )
            db.add(interaction)
            auto_logged.append(person_id)

        if auto_logged:
            await db.flush()
            logger.info("[DailyLogAgent] Auto-logged interactions for people: %s", auto_logged)

        return {
            "log":          saved_log.model_dump(),
            "action":       action,
            "auto_logged_interactions": auto_logged,
        }
