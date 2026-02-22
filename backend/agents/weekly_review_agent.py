"""Weekly Review Agent — generates a reflective weekly debrief from all user data."""
import logging
from datetime import date, timedelta
from typing import Any

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent
from backend.models import DailyLog, Goal, Decision, LifeAreaScore, Interaction, Person, WeeklyReview

logger = logging.getLogger(__name__)


class WeeklyReviewAgent(BaseAgent):
    name = "WeeklyReviewAgent"
    model = "openai/gpt-oss-20b"
    system_prompt = """You are a thoughtful life coach conducting a weekly review for a personal intelligence system.
Analyze the user's week data and generate a comprehensive weekly debrief.

Return a JSON object with these fields:
- "summary": A 3-5 sentence narrative summary of the week (personal, warm tone)
- "wins": Array of 2-5 specific wins/highlights from the week
- "struggles": Array of 1-4 challenges or struggles faced
- "reflections": Array of 3-5 objects with {"question": "...", "insight": "..."} — reflective questions with your observations
- "focus_next_week": Array of 2-4 suggested focus areas for next week
- "mood_assessment": A sentence about overall emotional trajectory
- "energy_assessment": A sentence about energy patterns

Return ONLY the JSON object, no explanation."""

    def _build_user_message(self, text: str, **ctx) -> str:
        return text

    def parse(self, raw: dict, **ctx) -> dict:
        if not isinstance(raw, dict):
            raise ValueError("Expected a JSON object")
        required = ["summary", "wins", "struggles", "reflections", "focus_next_week"]
        for key in required:
            if key not in raw:
                raw[key] = [] if key != "summary" else "No summary available."
        return raw

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        user_id = ctx["user_id"]
        week_start = ctx["week_start"]

        # Check for existing review
        result = await db.execute(
            select(WeeklyReview).where(
                and_(
                    WeeklyReview.user_id == user_id,
                    WeeklyReview.week_start_date == week_start
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.summary = parsed.get("summary")
            existing.reflections = parsed.get("reflections", [])
            existing.wins = parsed.get("wins", [])
            existing.struggles = parsed.get("struggles", [])
            existing.focus_next_week = parsed.get("focus_next_week", [])
            existing.mood_avg = ctx.get("mood_avg")
            existing.energy_avg = ctx.get("energy_avg")
            existing.raw_llm_output = str(parsed)
            await db.flush()
            await db.refresh(existing)
            review = existing
        else:
            review = WeeklyReview(
                user_id=user_id,
                week_start_date=week_start,
                summary=parsed.get("summary"),
                reflections=parsed.get("reflections", []),
                wins=parsed.get("wins", []),
                struggles=parsed.get("struggles", []),
                focus_next_week=parsed.get("focus_next_week", []),
                mood_avg=ctx.get("mood_avg"),
                energy_avg=ctx.get("energy_avg"),
                raw_llm_output=str(parsed),
            )
            db.add(review)
            await db.flush()
            await db.refresh(review)

        return {"review_id": review.id, "week": str(week_start)}


async def gather_week_context(db: AsyncSession, user_id: int, week_start: date) -> str:
    """Gather all relevant data for a week into a text summary for the LLM."""
    week_end = week_start + timedelta(days=6)
    parts = []

    # Daily logs
    logs_result = await db.execute(
        select(DailyLog).where(
            and_(DailyLog.user_id == user_id, DailyLog.date >= week_start, DailyLog.date <= week_end)
        ).order_by(DailyLog.date)
    )
    logs = logs_result.scalars().all()
    mood_scores = []
    energy_scores = []

    for log in logs:
        entry = f"[{log.date}]"
        if log.mood_score:
            entry += f" Mood:{log.mood_score}/10"
            mood_scores.append(log.mood_score)
        if log.energy_level:
            entry += f" Energy:{log.energy_level}/10"
            energy_scores.append(log.energy_level)
        if log.content:
            entry += f" — {log.content[:200]}"
        if log.emotions:
            entry += f" (emotions: {', '.join(log.emotions)})"
        if log.tags:
            entry += f" [tags: {', '.join(log.tags)}]"
        parts.append(entry)

    # Goals
    goals_result = await db.execute(
        select(Goal).where(and_(Goal.user_id == user_id, Goal.status == "active"))
    )
    goals = goals_result.scalars().all()
    if goals:
        parts.append("\n--- Active Goals ---")
        for g in goals:
            parts.append(f"Goal: {g.title} ({g.domain})")

    # Decisions this week
    dec_result = await db.execute(
        select(Decision).where(
            and_(Decision.user_id == user_id, Decision.date >= week_start, Decision.date <= week_end)
        )
    )
    decisions = dec_result.scalars().all()
    if decisions:
        parts.append("\n--- Decisions Made ---")
        for d in decisions:
            parts.append(f"[{d.date}] {d.title}: {d.description or ''}")

    # Interactions
    int_result = await db.execute(
        select(Interaction).where(
            and_(Interaction.user_id == user_id, Interaction.date >= week_start, Interaction.date <= week_end)
        )
    )
    interactions = int_result.scalars().all()
    if interactions:
        parts.append("\n--- Interactions ---")
        for i in interactions:
            parts.append(f"[{i.date}] {i.description or 'Interaction'} (tone: {i.emotional_tone or 'n/a'})")

    # Life area scores
    scores_result = await db.execute(
        select(LifeAreaScore).where(
            and_(LifeAreaScore.user_id == user_id, LifeAreaScore.week_start_date == week_start)
        )
    )
    scores = scores_result.scalars().all()
    if scores:
        parts.append("\n--- Life Area Scores ---")
        for s in scores:
            area_name = s.area.value if hasattr(s.area, 'value') else s.area
            parts.append(f"{area_name}: {s.score}/10")

    mood_avg = sum(mood_scores) / len(mood_scores) if mood_scores else None
    energy_avg = sum(energy_scores) / len(energy_scores) if energy_scores else None

    text = f"Week of {week_start} to {week_end}\n\n" + "\n".join(parts)
    return text, mood_avg, energy_avg
