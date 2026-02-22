"""Conversation Memory Agent — generates pre-meeting briefs from relationship data."""
import logging
from typing import Any

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.agents.base_agent import BaseAgent
from backend.models import Person, Interaction, DailyLog, ConversationBrief

logger = logging.getLogger(__name__)


class ConversationBriefAgent(BaseAgent):
    name = "ConversationBriefAgent"
    model = "openai/gpt-oss-20b"
    system_prompt = """You are a relationship intelligence AI preparing a pre-meeting brief.
Based on the user's interaction history with a specific person, generate a comprehensive brief
that helps the user prepare for their next interaction.

Return a JSON object:
- "brief": A 3-5 paragraph summary of the relationship, recent interactions, and topics to discuss
- "key_topics": Array of 3-6 topics/things to remember about this person
- "last_interaction_summary": One sentence summarizing the most recent interaction
- "relationship_health": "thriving" | "stable" | "needs_attention" | "strained"
- "conversation_starters": Array of 2-3 suggested conversation starters based on history

Return ONLY JSON."""

    def _build_user_message(self, text: str, **ctx) -> str:
        return text

    def parse(self, raw: dict, **ctx) -> dict:
        if not isinstance(raw, dict):
            raise ValueError("Expected JSON object")
        if "brief" not in raw:
            raw["brief"] = "No sufficient data to generate a brief."
        return raw

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        user_id = ctx["user_id"]
        person_id = ctx["person_id"]

        brief = ConversationBrief(
            user_id=user_id,
            person_id=person_id,
            brief=parsed.get("brief", ""),
            key_topics=parsed.get("key_topics", []),
            last_interaction_summary=parsed.get("last_interaction_summary"),
            relationship_health=parsed.get("relationship_health", "stable"),
        )
        db.add(brief)
        await db.flush()
        await db.refresh(brief)
        return {"brief_id": brief.id}


async def gather_person_context(db: AsyncSession, user_id: int, person_id: int) -> str:
    """Gather all data about a specific person for the LLM."""
    # Get person
    result = await db.execute(
        select(Person).where(
            and_(Person.id == person_id, Person.user_id == user_id)
        )
    )
    person = result.scalar_one_or_none()
    if not person:
        raise LookupError(f"Person {person_id} not found")

    parts = [
        f"Person: {person.name}",
        f"Relationship: {person.relationship_type or 'unknown'}",
        f"Trust Level: {person.trust_level}/10",
        f"Energy Exchange: {person.energy_exchange or 'unknown'}",
    ]
    if person.notes:
        parts.append(f"Notes: {person.notes}")
    if person.known_since:
        parts.append(f"Known since: {person.known_since}")
    if person.birthday:
        parts.append(f"Birthday: {person.birthday}")

    # Get interactions (last 20)
    int_result = await db.execute(
        select(Interaction).where(
            and_(Interaction.person_id == person_id, Interaction.user_id == user_id)
        ).order_by(desc(Interaction.date)).limit(20)
    )
    interactions = int_result.scalars().all()
    if interactions:
        parts.append(f"\n--- Last {len(interactions)} Interactions ---")
        for i in interactions:
            parts.append(f"[{i.date}] {i.description or 'No details'} (tone: {i.emotional_tone or 'n/a'}, context: {i.context or 'n/a'})")

    # Get daily logs that mention this person
    logs_result = await db.execute(
        select(DailyLog).where(DailyLog.user_id == user_id).order_by(desc(DailyLog.date)).limit(30)
    )
    logs = logs_result.scalars().all()
    mentions = []
    for log in logs:
        people_mentioned = log.people_mentioned or []
        if person_id in people_mentioned and log.content:
            mentions.append(f"[{log.date}] {log.content[:150]}")
    if mentions:
        parts.append(f"\n--- Mentions in Daily Logs ---")
        parts.extend(mentions[:10])

    return "\n".join(parts)
