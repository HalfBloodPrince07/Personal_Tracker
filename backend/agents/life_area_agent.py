"""LifeAreaAgent — extracts 7 life-area scores + notes from a free-text week description."""
import logging
from datetime import date as date_type
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent
from backend.models import LifeAreaScore
from backend.schemas import LifeAreaScoreResponse

logger = logging.getLogger(__name__)

VALID_AREAS = {"health", "career", "finances", "relationships", "learning", "creativity", "spirituality"}

_SYSTEM_PROMPT = """You are a personal life analytics assistant.
The user will describe their week in natural language. Extract scores (1-10) for each of these 7 life areas:
health, career, finances, relationships, learning, creativity, spirituality

Rules:
- Always provide a score for EVERY area, even if not mentioned — infer from context and sentiment.
- If an area is clearly going well (e.g. "crushed workouts", "just got promoted") → high score (8-10).
- If an area sounds bad (e.g. "totally burned out", "broke", "no time for friends") → low score (1-4).
- If there is no signal for an area, use 5 as a neutral default.
- Also write a short note (1 sentence) per area explaining your score.
- Do NOT wrap the JSON in markdown code fences. Output ONLY valid JSON.

Output format (strict):
{
  "health":        {"score": 7, "note": "Exercised 3 times this week."},
  "career":        {"score": 5, "note": "Normal week, no major events."},
  "finances":      {"score": 6, "note": "No mention — assumed stable."},
  "relationships": {"score": 8, "note": "Spent quality time with family."},
  "learning":      {"score": 4, "note": "No studying mentioned."},
  "creativity":    {"score": 5, "note": "No signal — neutral default."},
  "spirituality":  {"score": 5, "note": "No signal — neutral default."}
}"""


def _clamp(val, default=5):
    try:
        return max(1, min(10, int(val)))
    except Exception:
        return default


class LifeAreaAgent(BaseAgent):
    name = "LifeAreaAgent"
    system_prompt = _SYSTEM_PROMPT

    def parse(self, raw: dict, **ctx) -> dict:
        scores = {}
        notes  = {}
        for area, val in raw.items():
            if area not in VALID_AREAS:
                continue
            if isinstance(val, dict):
                scores[area] = _clamp(val.get("score", 5))
                notes[area]  = str(val.get("note", ""))
            elif isinstance(val, (int, float)):
                scores[area] = _clamp(val)
            else:
                continue
        if not scores:
            raise ValueError("No valid area scores found in LLM response.")
        return {"scores": scores, "notes": notes}

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        user_id   = ctx["user_id"]
        week_date = ctx.get("week_date") or _current_week_start()
        scores    = parsed["scores"]
        notes     = parsed["notes"]
        saved     = []

        for area_name, score in scores.items():
            result = await db.execute(
                select(LifeAreaScore).where(
                    LifeAreaScore.user_id        == user_id,
                    LifeAreaScore.area           == area_name,
                    LifeAreaScore.week_start_date == week_date,
                )
            )
            existing = result.scalar_one_or_none()
            note_text = notes.get(area_name)
            if existing:
                existing.score = score
                existing.notes = note_text
                await db.flush()
                await db.refresh(existing)
                saved.append(LifeAreaScoreResponse.model_validate(existing))
            else:
                new_score = LifeAreaScore(
                    user_id        = user_id,
                    area           = area_name,
                    score          = score,
                    week_start_date = week_date,
                    notes          = note_text,
                )
                db.add(new_score)
                await db.flush()
                await db.refresh(new_score)
                saved.append(LifeAreaScoreResponse.model_validate(new_score))

        return {
            "week_start_date": str(week_date),
            "saved": [s.model_dump() for s in saved],
        }


def _current_week_start() -> date_type:
    d = date_type.today()
    return d - __import__("datetime").timedelta(days=d.weekday())
