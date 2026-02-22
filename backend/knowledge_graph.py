"""Knowledge Graph — extract and query structured facts from user logs.

Uses the local LLM to extract subject-predicate-object facts from daily logs,
storing them as KnowledgeFact records. Agents can then query these facts
instantly without re-reading raw logs.
"""
import json
import logging
from datetime import date
from typing import Optional

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import DailyLog, KnowledgeFact
from backend import llm_client

logger = logging.getLogger(__name__)

# System prompt for fact extraction
_EXTRACT_SYSTEM = """You are a knowledge extraction AI. Given a daily journal entry,
extract factual statements about the user as subject-predicate-object triples.

Focus on extractable facts like:
- Preferences: "User dislikes working late on Fridays"
- Habits: "User runs every morning"
- Beliefs/Values: "User values family time over work"
- Relationships: "User has close relationship with Sarah"
- Health: "User sleeps 6 hours on average"
- Goals: "User wants to learn Spanish by December"
- Work patterns: "User is most productive in the morning"

Return a JSON array of objects:
[
  {
    "subject": "User",
    "predicate": "dislikes",
    "object": "working late on Fridays",
    "category": "preference",
    "confidence": 0.9
  }
]

Categories: preference, habit, belief, relationship, goal, health, work, emotion, skill
Confidence: 0.5-1.0 (how certain the fact is based on the text)

If no facts can be extracted, return an empty array: []
Return ONLY the JSON array, nothing else."""


async def extract_facts_from_log(
    db: AsyncSession, log: DailyLog
) -> int:
    """Extract knowledge facts from a single daily log entry.

    Returns the number of new facts created.
    """
    if not log.content or len(log.content.strip()) < 20:
        return 0

    # Build context from log
    parts = [log.content]
    if log.highlights:
        parts.append(f"Highlights: {log.highlights}")
    if log.emotions:
        parts.append(f"Emotions: {', '.join(log.emotions)}")
    text = "\n".join(parts)

    user_msg = f"Journal entry from {log.date}:\n\n{text}"

    try:
        raw = await llm_client.chat(
            _EXTRACT_SYSTEM, user_msg,
            enable_thinking=True,
            max_tokens=20000,
        )
        facts_data = llm_client.extract_json(raw)
    except Exception as e:
        logger.warning("[knowledge_graph] LLM extraction failed for log %d: %s", log.id, e)
        return 0

    if not isinstance(facts_data, list):
        return 0

    count = 0
    for fact in facts_data:
        if not isinstance(fact, dict):
            continue
        subject = fact.get("subject", "").strip()
        predicate = fact.get("predicate", "").strip()
        obj = fact.get("object", "").strip()
        if not (subject and predicate and obj):
            continue

        # Check for duplicate facts (same subject+predicate+object)
        existing = await db.execute(
            select(KnowledgeFact).where(
                and_(
                    KnowledgeFact.user_id == log.user_id,
                    KnowledgeFact.subject == subject,
                    KnowledgeFact.predicate == predicate,
                    KnowledgeFact.object_value == obj,
                )
            )
        )
        if existing.scalar_one_or_none():
            continue

        kf = KnowledgeFact(
            user_id=log.user_id,
            subject=subject,
            predicate=predicate,
            object_value=obj,
            category=fact.get("category", "general"),
            confidence=min(max(float(fact.get("confidence", 0.7)), 0.0), 1.0),
            source_log_id=log.id,
            source_date=log.date,
        )
        db.add(kf)
        count += 1

    if count > 0:
        await db.flush()

    return count


async def extract_facts_from_all_logs(
    db: AsyncSession, user_id: int
) -> int:
    """Extract facts from all user logs that haven't been processed yet.

    Checks which logs already have facts extracted (via source_log_id)
    and only processes new ones.
    """
    # Find log IDs that already have facts
    processed_result = await db.execute(
        select(KnowledgeFact.source_log_id).where(
            and_(
                KnowledgeFact.user_id == user_id,
                KnowledgeFact.source_log_id.is_not(None),
            )
        ).distinct()
    )
    processed_ids = {r[0] for r in processed_result.all()}

    # Get all logs not yet processed
    logs_result = await db.execute(
        select(DailyLog).where(
            DailyLog.user_id == user_id
        ).order_by(DailyLog.date)
    )
    all_logs = logs_result.scalars().all()

    total_facts = 0
    for log in all_logs:
        if log.id in processed_ids:
            continue
        count = await extract_facts_from_log(db, log)
        total_facts += count
        logger.info("[knowledge_graph] Log %d (%s): extracted %d facts", log.id, log.date, count)

    logger.info("[knowledge_graph] Total facts extracted for user %d: %d", user_id, total_facts)
    return total_facts


async def query_facts(
    db: AsyncSession,
    user_id: int,
    query: str,
    limit: int = 20,
) -> list[dict]:
    """Query knowledge facts using keyword matching.

    Searches subject, predicate, and object_value fields for matching terms.
    """
    terms = [t.strip().lower() for t in query.split() if len(t.strip()) > 2]
    if not terms:
        return []

    # Build OR conditions for each term across all text fields
    conditions = []
    for term in terms:
        pattern = f"%{term}%"
        conditions.append(
            or_(
                func.lower(KnowledgeFact.subject).like(pattern),
                func.lower(KnowledgeFact.predicate).like(pattern),
                func.lower(KnowledgeFact.object_value).like(pattern),
                func.lower(KnowledgeFact.category).like(pattern),
            )
        )

    result = await db.execute(
        select(KnowledgeFact).where(
            and_(
                KnowledgeFact.user_id == user_id,
                or_(*conditions),
            )
        ).order_by(KnowledgeFact.confidence.desc()).limit(limit)
    )
    facts = result.scalars().all()

    return [
        {
            "id": f.id,
            "subject": f.subject,
            "predicate": f.predicate,
            "object": f.object_value,
            "category": f.category,
            "confidence": f.confidence,
            "source_date": str(f.source_date) if f.source_date else None,
        }
        for f in facts
    ]
