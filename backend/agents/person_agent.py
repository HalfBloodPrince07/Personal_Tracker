"""PersonAgent — extracts a structured person profile from a free-text description."""
import logging
from datetime import date as date_type
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.agents.base_agent import BaseAgent
from backend.models import Person
from backend.schemas import PersonResponse

logger = logging.getLogger(__name__)

_REL_TYPES = {"family", "friend", "close friend", "colleague", "mentor", "acquaintance", "partner", "other"}
_ENERGY_TYPES = {"energizing", "neutral", "draining"}

_SYSTEM_PROMPT = """You are a personal relationship assistant.
Extract structured information about a person from the user's description.

Output ONLY valid JSON (no markdown fences) in this exact format — omit fields you cannot determine:
{
  "name": "John Smith",
  "relationship_type": "friend",
  "trust_level": 8,
  "energy_exchange": "energizing",
  "notes": "Met at university, loves hiking.",
  "known_since": "2019-06-01",
  "birthday": "1990-03-15"
}

Field rules:
- name: required.
- relationship_type: one of: family, friend, close friend, colleague, mentor, acquaintance, partner, other
- trust_level: integer 1-10. Infer from tone ("trust completely"→9, "barely know"→3).
- energy_exchange: one of: energizing, neutral, draining. Infer from tone.
- known_since: ISO date YYYY-MM-DD. "since 2019" → "2019-01-01". Only year given → YYYY-01-01.
- birthday: ISO date YYYY-MM-DD. Month+day only → use current year.
- notes: brief summary of anything notable.
- All fields except name are optional; omit rather than guess."""


def _safe_date(val) -> Optional[date_type]:
    if not val:
        return None
    try:
        return date_type.fromisoformat(str(val))
    except Exception:
        return None


def _clamp_int(val, lo, hi, default):
    try:
        return max(lo, min(hi, int(val)))
    except Exception:
        return default


class PersonAgent(BaseAgent):
    name = "PersonAgent"
    system_prompt = _SYSTEM_PROMPT

    def _build_user_message(self, text: str, **ctx) -> str:
        today = date_type.today().isoformat()
        return f"Today's date: {today}\n\n{text}"

    def parse(self, raw: dict, **ctx) -> dict:
        if "name" not in raw or not raw["name"]:
            raise ValueError("LLM response is missing required field: 'name'")

        rel = raw.get("relationship_type")
        if rel and rel not in _REL_TYPES:
            rel = "other"

        energy = raw.get("energy_exchange")
        if energy and energy not in _ENERGY_TYPES:
            energy = None

        return {
            "name":              str(raw["name"]).strip(),
            "relationship_type": rel,
            "trust_level":       _clamp_int(raw.get("trust_level", 5), 1, 10, 5),
            "energy_exchange":   energy,
            "notes":             raw.get("notes"),
            "known_since":       _safe_date(raw.get("known_since")),
            "birthday":          _safe_date(raw.get("birthday")),
        }

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        import datetime
        user_id   = ctx["user_id"]
        person_id = ctx.get("person_id")

        if person_id:
            result = await db.execute(
                select(Person)
                .where(Person.id == person_id, Person.user_id == user_id)
                .options(selectinload(Person.interactions))
            )
            person = result.scalar_one_or_none()
            if not person:
                raise LookupError(f"Person {person_id} not found.")

            for field, val in parsed.items():
                if val is not None:
                    setattr(person, field, val)
            person.updated_at = datetime.datetime.utcnow()
            await db.flush()
            await db.refresh(person)
            pr = PersonResponse.model_validate(person)
            pr.interaction_count = len(person.interactions)
            return {"person": pr.model_dump(), "action": "updated"}
        else:
            person = Person(user_id=user_id, **parsed)
            db.add(person)
            await db.flush()
            await db.refresh(person)
            pr = PersonResponse.model_validate(person)
            pr.interaction_count = 0
            return {"person": pr.model_dump(), "action": "created"}
