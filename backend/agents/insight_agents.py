"""AI Agent Suite — 8 specialized insight agents (Module 10).

Each agent analyzes user data from a specific perspective and produces
structured insights stored as AgentInsight records.

Uses RAG (ChromaDB) for semantic retrieval when data volume is large,
falling back to brute-force date-range queries for small datasets.
"""
import logging
from datetime import date, timedelta
from typing import Any

from sqlalchemy import select, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent
from backend.models import (
    DailyLog, Goal, Decision, LifeAreaScore, Interaction, Person,
    Project, Task, AgentInsight, AgentType, InsightPeriod, KnowledgeFact
)
from backend import vector_store

logger = logging.getLogger(__name__)

# If a user has more than this many logs in the requested range,
# switch from brute-force to RAG semantic retrieval.
RAG_THRESHOLD = 60


# ── Shared helper to gather all user data for a date range ────────────

async def _gather_data(db: AsyncSession, user_id: int, start: date, end: date) -> dict:
    """Fetch all relevant data within a date range."""
    data = {}

    # Logs
    r = await db.execute(
        select(DailyLog).where(
            and_(DailyLog.user_id == user_id, DailyLog.date >= start, DailyLog.date <= end)
        ).order_by(DailyLog.date)
    )
    data["logs"] = r.scalars().all()

    # People
    r = await db.execute(select(Person).where(Person.user_id == user_id))
    data["people"] = r.scalars().all()

    # Interactions
    r = await db.execute(
        select(Interaction).where(
            and_(Interaction.user_id == user_id, Interaction.date >= start, Interaction.date <= end)
        )
    )
    data["interactions"] = r.scalars().all()

    # Goals
    r = await db.execute(select(Goal).where(Goal.user_id == user_id))
    data["goals"] = r.scalars().all()

    # Decisions
    r = await db.execute(
        select(Decision).where(
            and_(Decision.user_id == user_id, Decision.date >= start, Decision.date <= end)
        )
    )
    data["decisions"] = r.scalars().all()

    # Life area scores
    r = await db.execute(
        select(LifeAreaScore).where(
            and_(LifeAreaScore.user_id == user_id, LifeAreaScore.week_start_date >= start)
        )
    )
    data["life_scores"] = r.scalars().all()

    # Projects
    r = await db.execute(select(Project).where(Project.user_id == user_id))
    data["projects"] = r.scalars().all()

    return data


def _format_logs(logs) -> str:
    lines = []
    for log in logs:
        entry = f"[{log.date}]"
        if log.mood_score:
            entry += f" Mood:{log.mood_score}/10"
        if log.energy_level:
            entry += f" Energy:{log.energy_level}/10"
        if log.content:
            entry += f" {log.content[:150]}"
        if log.emotions:
            entry += f" emotions:{','.join(log.emotions)}"
        if log.tags:
            entry += f" tags:{','.join(log.tags)}"
        lines.append(entry)
    return "\n".join(lines)


def _format_interactions(interactions, people) -> str:
    pmap = {p.id: p.name for p in people}
    lines = []
    for i in interactions:
        name = pmap.get(i.person_id, f"Person#{i.person_id}")
        lines.append(f"[{i.date}] {name}: {i.description or ''} (tone:{i.emotional_tone or 'n/a'})")
    return "\n".join(lines)


def _format_decisions(decisions) -> str:
    lines = []
    for d in decisions:
        domain = d.domain.value if hasattr(d.domain, 'value') else (d.domain or 'general')
        outcome = f" → outcome:{d.outcome_score}/10 {d.outcome_notes or ''}" if d.outcome_score else ""
        lines.append(f"[{d.date}] {d.title} ({domain}): {d.description or ''}{outcome}")
    return "\n".join(lines)


def _format_goals(goals) -> str:
    lines = []
    for g in goals:
        status = g.status.value if hasattr(g.status, 'value') else g.status
        domain = g.domain.value if hasattr(g.domain, 'value') else (g.domain or 'general')
        lines.append(f"{g.title} [{status}] ({domain}): {g.description or ''}")
    return "\n".join(lines)


def _format_life_scores(scores) -> str:
    lines = []
    for s in scores:
        area = s.area.value if hasattr(s.area, 'value') else s.area
        lines.append(f"[{s.week_start_date}] {area}: {s.score}/10")
    return "\n".join(lines)


async def _store_insight(parsed: dict, db: AsyncSession, agent_type: AgentType, **ctx) -> dict:
    """Store a parsed insight into the database."""
    insight = AgentInsight(
        user_id=ctx["user_id"],
        agent_type=agent_type,
        title=parsed.get("title", "Untitled Insight"),
        content=parsed.get("content", ""),
        data=parsed.get("data", {}),
        severity=parsed.get("severity", "info"),
        tags=parsed.get("tags", []),
        date_range_start=ctx.get("start"),
        date_range_end=ctx.get("end"),
        insight_period=ctx.get("insight_period"),
        parent_insight_id=ctx.get("parent_insight_id"),
    )
    db.add(insight)
    await db.flush()
    await db.refresh(insight)
    return {"insight_id": insight.id}


async def _gather_prior_insights(
    db: AsyncSession, user_id: int, agent_type_str: str,
    start: date, end: date, period: InsightPeriod
) -> list:
    """Fetch existing AgentInsight records for the given period within the date range."""
    # Map period to sub-period: QUARTERLY reads MONTHLY, YEARLY reads MONTHLY
    try:
        agent_enum = AgentType(agent_type_str)
    except ValueError:
        return []

    result = await db.execute(
        select(AgentInsight).where(
            and_(
                AgentInsight.user_id == user_id,
                AgentInsight.agent_type == agent_enum,
                AgentInsight.insight_period == period,
                AgentInsight.date_range_start >= start,
                AgentInsight.date_range_end <= end,
            )
        ).order_by(AgentInsight.date_range_start)
    )
    return result.scalars().all()


def _format_prior_insights(insights: list) -> str:
    """Format prior period insights as context for meta-insight generation."""
    lines = []
    for ins in insights:
        period_label = ins.insight_period.value if ins.insight_period else "unknown"
        lines.append(f"--- {period_label.upper()} Insight: {ins.title} ---")
        lines.append(f"Period: {ins.date_range_start} to {ins.date_range_end}")
        lines.append(f"Severity: {ins.severity}")
        lines.append(ins.content)
        if ins.tags:
            lines.append(f"Tags: {', '.join(ins.tags)}")
        lines.append("")
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════
#  1. BEHAVIORAL AGENT
# ═══════════════════════════════════════════════════════════════════════

class BehavioralAgent(BaseAgent):
    name = "BehavioralAgent"
    model = "openai/gpt-oss-20b"
    system_prompt = """You are a behavioral analysis AI. Analyze the user's daily patterns, habits, and routines.
Identify recurring behaviors, habit streaks, time patterns, and behavioral trends.

Return a JSON object:
- "title": Short insight title (e.g., "Morning Routine Breakdown")
- "content": Detailed analysis (3-6 paragraphs) covering patterns, habits, consistency
- "data": {"habits_identified": [...], "consistency_score": 1-10, "top_patterns": [...], "risk_behaviors": [...]}
- "severity": "info" | "warning" | "positive" | "critical"
- "tags": relevant tags

Return ONLY JSON."""

    def _build_user_message(self, text: str, **ctx) -> str:
        return text

    def parse(self, raw: dict, **ctx) -> dict:
        if not isinstance(raw, dict):
            raise ValueError("Expected JSON object")
        if "content" not in raw:
            raw["content"] = "No behavioral patterns detected in this period."
        return raw

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        return await _store_insight(parsed, db, AgentType.BEHAVIORAL, **ctx)


# ═══════════════════════════════════════════════════════════════════════
#  2. PSYCHOLOGICAL AGENT
# ═══════════════════════════════════════════════════════════════════════

class PsychologicalAgent(BaseAgent):
    name = "PsychologicalAgent"
    model = "openai/gpt-oss-20b"
    system_prompt = """You are a psychological wellness AI. Analyze the user's emotional states, mood patterns,
and psychological well-being indicators. Look for emotional trends, stress signals, and mental health patterns.
Be compassionate and constructive. You are NOT a therapist — provide observations, not diagnoses.

Return a JSON object:
- "title": Short insight title
- "content": Detailed analysis (3-6 paragraphs) covering emotional trends, stress indicators, well-being
- "data": {"dominant_emotions": [...], "stress_level": 1-10, "emotional_stability": 1-10, "positive_ratio": float, "concerns": [...]}
- "severity": "info" | "warning" | "positive" | "critical"
- "tags": relevant tags

Return ONLY JSON."""

    def _build_user_message(self, text: str, **ctx) -> str:
        return text

    def parse(self, raw: dict, **ctx) -> dict:
        if not isinstance(raw, dict):
            raise ValueError("Expected JSON object")
        if "content" not in raw:
            raw["content"] = "Insufficient emotional data for analysis."
        return raw

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        return await _store_insight(parsed, db, AgentType.PSYCHOLOGICAL, **ctx)


# ═══════════════════════════════════════════════════════════════════════
#  3. FINANCIAL AGENT
# ═══════════════════════════════════════════════════════════════════════

class FinancialAgent(BaseAgent):
    name = "FinancialAgent"
    model = "microsoft/phi-4-reasoning-plus"
    system_prompt = """You are a financial wellness AI. Analyze the user's financial decisions, career progress,
and money-related behaviors from their logs, decisions, and life area scores.
Look for spending patterns, career alignment, and financial goal progress.

Return a JSON object:
- "title": Short insight title
- "content": Detailed analysis (3-6 paragraphs) covering financial behaviors, career trajectory, money decisions
- "data": {"financial_health": 1-10, "career_trajectory": "up"|"stable"|"down", "key_financial_decisions": [...], "recommendations": [...]}
- "severity": "info" | "warning" | "positive" | "critical"
- "tags": relevant tags

Return ONLY JSON."""

    def _build_user_message(self, text: str, **ctx) -> str:
        return text

    def parse(self, raw: dict, **ctx) -> dict:
        if not isinstance(raw, dict):
            raise ValueError("Expected JSON object")
        if "content" not in raw:
            raw["content"] = "No financial data available for analysis."
        return raw

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        return await _store_insight(parsed, db, AgentType.FINANCIAL, **ctx)


# ═══════════════════════════════════════════════════════════════════════
#  4. RELATIONSHIP AGENT
# ═══════════════════════════════════════════════════════════════════════

class RelationshipAgent(BaseAgent):
    name = "RelationshipAgent"
    model = "openai/gpt-oss-20b"  # Often handles narrative/social dynamics well
    system_prompt = """You are a relationship intelligence AI. Analyze the user's social interactions,
relationship dynamics, and interpersonal patterns. Look for relationship health indicators,
neglected connections, and social energy patterns.

Return a JSON object:
- "title": Short insight title
- "content": Detailed analysis (3-6 paragraphs) covering relationship health, social patterns, key dynamics
- "data": {"relationship_health": 1-10, "most_active_connections": [...], "neglected_relationships": [...], "energy_drains": [...], "energy_boosters": [...]}
- "severity": "info" | "warning" | "positive" | "critical"
- "tags": relevant tags

Return ONLY JSON."""

    def _build_user_message(self, text: str, **ctx) -> str:
        return text

    def parse(self, raw: dict, **ctx) -> dict:
        if not isinstance(raw, dict):
            raise ValueError("Expected JSON object")
        if "content" not in raw:
            raw["content"] = "No relationship data available for analysis."
        return raw

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        return await _store_insight(parsed, db, AgentType.RELATIONSHIP, **ctx)


# ═══════════════════════════════════════════════════════════════════════
#  5. DECISION AUDIT AGENT
# ═══════════════════════════════════════════════════════════════════════

class DecisionAuditAgent(BaseAgent):
    name = "DecisionAuditAgent"
    model = "microsoft/phi-4-reasoning-plus"
    system_prompt = """You are a decision audit AI. Analyze the user's past decisions, their outcomes,
and decision-making patterns. Look for biases, quality of decisions, and areas of improvement.

Return a JSON object:
- "title": Short insight title
- "content": Detailed analysis (3-6 paragraphs) covering decision quality, patterns, biases, outcomes
- "data": {"decision_quality": 1-10, "bias_detected": [...], "best_decisions": [...], "worst_decisions": [...], "pending_reviews": int}
- "severity": "info" | "warning" | "positive" | "critical"
- "tags": relevant tags

Return ONLY JSON."""

    def _build_user_message(self, text: str, **ctx) -> str:
        return text

    def parse(self, raw: dict, **ctx) -> dict:
        if not isinstance(raw, dict):
            raise ValueError("Expected JSON object")
        if "content" not in raw:
            raw["content"] = "No decision data available for audit."
        return raw

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        return await _store_insight(parsed, db, AgentType.DECISION_AUDIT, **ctx)


# ═══════════════════════════════════════════════════════════════════════
#  6. PREDICTIVE AGENT
# ═══════════════════════════════════════════════════════════════════════

class PredictiveAgent(BaseAgent):
    name = "PredictiveAgent"
    model = "microsoft/phi-4-reasoning-plus"
    system_prompt = """You are a predictive intelligence AI. Based on the user's historical data and trends,
make informed predictions about likely outcomes, upcoming challenges, and opportunities.
Be clear that these are probabilistic observations, not certainties.

Return a JSON object:
- "title": Short insight title
- "content": Detailed analysis (3-6 paragraphs) with predictions and their rationale
- "data": {"predictions": [{"prediction": "...", "confidence": 1-10, "timeframe": "...", "basis": "..."}], "upcoming_risks": [...], "opportunities": [...]}
- "severity": "info" | "warning" | "positive" | "critical"
- "tags": relevant tags

Return ONLY JSON."""

    def _build_user_message(self, text: str, **ctx) -> str:
        return text

    def parse(self, raw: dict, **ctx) -> dict:
        if not isinstance(raw, dict):
            raise ValueError("Expected JSON object")
        if "content" not in raw:
            raw["content"] = "Insufficient data for meaningful predictions."
        return raw

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        return await _store_insight(parsed, db, AgentType.PREDICTIVE, **ctx)


# ═══════════════════════════════════════════════════════════════════════
#  7. CONTRADICTION AGENT
# ═══════════════════════════════════════════════════════════════════════

class ContradictionAgent(BaseAgent):
    name = "ContradictionAgent"
    model = "microsoft/phi-4-reasoning-plus"
    system_prompt = """You are a contradiction detection AI. Analyze the user's stated goals, values, and intentions
versus their actual behaviors and decisions. Identify misalignments, contradictions, and cognitive dissonance.
Be constructive and non-judgmental — help the user see blind spots.

Return a JSON object:
- "title": Short insight title
- "content": Detailed analysis (3-6 paragraphs) covering contradictions, misalignments, and blind spots
- "data": {"contradictions": [{"stated": "...", "actual": "...", "severity": 1-10}], "alignment_score": 1-10, "blind_spots": [...]}
- "severity": "info" | "warning" | "positive" | "critical"
- "tags": relevant tags

Return ONLY JSON."""

    def _build_user_message(self, text: str, **ctx) -> str:
        return text

    def parse(self, raw: dict, **ctx) -> dict:
        if not isinstance(raw, dict):
            raise ValueError("Expected JSON object")
        if "content" not in raw:
            raw["content"] = "No contradictions detected in this period."
        return raw

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        return await _store_insight(parsed, db, AgentType.CONTRADICTION, **ctx)


# ═══════════════════════════════════════════════════════════════════════
#  8. LIFE PATTERN AGENT
# ═══════════════════════════════════════════════════════════════════════

class LifePatternAgent(BaseAgent):
    name = "LifePatternAgent"
    model = "openai/gpt-oss-20b"
    system_prompt = """You are a life pattern recognition AI. Look across ALL domains of the user's life
to identify overarching patterns, cycles, and meta-themes. Connect dots between different life areas
that the user might not see themselves.

Return a JSON object:
- "title": Short insight title
- "content": Detailed analysis (3-6 paragraphs) covering cross-domain patterns, life cycles, meta-themes
- "data": {"patterns": [{"name": "...", "description": "...", "domains_affected": [...], "recurrence": "..."}], "life_phase": "...", "trajectory": "..."}
- "severity": "info" | "warning" | "positive" | "critical"
- "tags": relevant tags

Return ONLY JSON."""

    def _build_user_message(self, text: str, **ctx) -> str:
        return text

    def parse(self, raw: dict, **ctx) -> dict:
        if not isinstance(raw, dict):
            raise ValueError("Expected JSON object")
        if "content" not in raw:
            raw["content"] = "Insufficient data for life pattern analysis."
        return raw

    async def store(self, parsed: dict, db: AsyncSession, **ctx) -> dict:
        return await _store_insight(parsed, db, AgentType.LIFE_PATTERN, **ctx)


# ── Agent registry ────────────────────────────────────────────────────

AGENT_MAP = {
    "behavioral": BehavioralAgent,
    "psychological": PsychologicalAgent,
    "financial": FinancialAgent,
    "relationship": RelationshipAgent,
    "decision_audit": DecisionAuditAgent,
    "predictive": PredictiveAgent,
    "contradiction": ContradictionAgent,
    "life_pattern": LifePatternAgent,
}


# ── Knowledge graph fact retrieval ─────────────────────────────────────

_AGENT_FACT_CATEGORIES = {
    "behavioral": ["habit", "work", "preference"],
    "psychological": ["emotion", "belief", "health"],
    "financial": ["work", "goal"],
    "relationship": ["relationship"],
    "decision_audit": ["preference", "belief", "goal"],
    "predictive": ["goal", "habit", "work"],
    "contradiction": ["belief", "goal", "preference", "habit"],
    "life_pattern": ["habit", "preference", "health", "work", "relationship"],
}


async def _gather_knowledge_facts(
    db: AsyncSession, user_id: int, agent_type: str, limit: int = 30
) -> str:
    """Fetch relevant knowledge facts for an agent type."""
    categories = _AGENT_FACT_CATEGORIES.get(agent_type, [])
    if not categories:
        return ""

    from sqlalchemy import or_
    conditions = [KnowledgeFact.category == cat for cat in categories]
    result = await db.execute(
        select(KnowledgeFact).where(
            and_(
                KnowledgeFact.user_id == user_id,
                or_(*conditions),
            )
        ).order_by(KnowledgeFact.confidence.desc()).limit(limit)
    )
    facts = result.scalars().all()
    if not facts:
        return ""

    lines = ["=== Known Facts About User ==="]
    for f in facts:
        lines.append(f"- {f.subject} {f.predicate} {f.object_value} [{f.category}, confidence:{f.confidence:.1f}]")
    return "\n".join(lines)


# ── Agent-type to search queries mapping (for RAG) ────────────────────

_AGENT_QUERIES = {
    "behavioral": [
        "daily habits routines patterns consistency",
        "morning evening routine schedule productivity",
        "exercise sleep health habits recurring behavior",
    ],
    "psychological": [
        "emotions mood feelings anxiety stress wellbeing",
        "mental health emotional state happiness sadness",
        "self-reflection growth mindset psychological state",
    ],
    "financial": [
        "money finances spending career salary investment",
        "financial decisions budget income expenses",
        "career progress job promotion work compensation",
    ],
    "relationship": [
        "relationships friends family partner social connections",
        "interaction meeting conversation conflict trust",
        "social energy loneliness community support network",
    ],
    "decision_audit": [
        "decision choice outcome consequence regret",
        "important decisions trade-offs analysis results",
        "evaluated reviewed decision quality judgment",
    ],
    "predictive": [
        "trends trajectory goals progress future plans",
        "upcoming events deadlines milestones predictions",
        "patterns forecasting risk opportunity challenge",
    ],
    "contradiction": [
        "goals values stated intentions vs actual behavior",
        "contradiction misalignment inconsistency conflict",
        "what I said vs what I did blind spots hypocrisy",
    ],
    "life_pattern": [
        "cross-domain patterns cycles life themes phases",
        "recurring patterns across work health relationships",
        "overall life trajectory evolution growth regression",
    ],
}


async def _gather_data_rag(
    db: AsyncSession, user_id: int, agent_type: str,
    start: date, end: date, n_results: int = 40,
) -> str:
    """Use RAG semantic search to gather the most relevant data for an agent.

    Returns formatted text ready for the LLM prompt.
    """
    queries = _AGENT_QUERIES.get(agent_type, ["life patterns habits decisions"])
    all_results = []
    seen_ids = set()

    for query in queries:
        hits = vector_store.semantic_search(
            user_id=user_id,
            query=query,
            n_results=n_results // len(queries),
            date_from=start,
            date_to=end,
        )
        for hit in hits:
            if hit["id"] not in seen_ids:
                seen_ids.add(hit["id"])
                all_results.append(hit)

    # Sort by date
    all_results.sort(key=lambda h: h["metadata"].get("date", ""))

    # Group by type for formatting
    logs = [r for r in all_results if r["metadata"]["type"] == "daily_log"]
    decisions = [r for r in all_results if r["metadata"]["type"] == "decision"]
    interactions = [r for r in all_results if r["metadata"]["type"] == "interaction"]
    goals = [r for r in all_results if r["metadata"]["type"] == "goal"]

    sections = [
        f"Analysis period: {start} to {end}",
        f"(Semantically retrieved {len(all_results)} most relevant entries via RAG)\n",
    ]

    if logs:
        lines = [f"[{r['metadata']['date']}] {r['document']}" for r in logs]
        sections.append("=== Daily Logs (most relevant) ===\n" + "\n".join(lines))
    if interactions:
        lines = [f"[{r['metadata']['date']}] {r['document']}" for r in interactions]
        sections.append("\n=== Interactions (most relevant) ===\n" + "\n".join(lines))
    if decisions:
        lines = [f"[{r['metadata']['date']}] {r['document']}" for r in decisions]
        sections.append("\n=== Decisions (most relevant) ===\n" + "\n".join(lines))
    if goals:
        lines = [r["document"] for r in goals]
        sections.append("\n=== Goals ===\n" + "\n".join(lines))

    return "\n".join(sections)


async def build_agent_prompt(
    agent_type: str, db: AsyncSession, user_id: int,
    start: date, end: date, insight_period: str = None,
) -> str:
    """Build the user message for any agent type.

    For QUARTERLY/YEARLY periods, uses prior period insights instead of raw data
    (Map-Reduce architecture). Falls back to raw data if no prior insights exist.

    For large datasets (>RAG_THRESHOLD logs), uses semantic search (RAG) to
    retrieve only the most relevant entries instead of loading everything.
    """
    # Determine if we should use meta-insight mode
    use_meta = False
    prior_insights = []
    sub_period = None

    if insight_period in ("quarterly", "yearly"):
        # Quarterly reads monthly insights, yearly reads monthly insights
        sub_period = InsightPeriod.MONTHLY
        prior_insights = await _gather_prior_insights(
            db, user_id, agent_type, start, end, sub_period
        )
        if prior_insights:
            use_meta = True
            logger.info(
                "[build_agent_prompt] Meta-insight mode: using %d %s insights for %s",
                len(prior_insights), sub_period.value, insight_period
            )

    if use_meta:
        # === Meta-Insight Mode: summarize prior insights ===
        sections = [
            f"META-ANALYSIS period: {start} to {end}",
            f"You are reviewing {len(prior_insights)} {sub_period.value} insights to identify macro-trends.",
            "",
            "=== Previous Period Insights ===",
            _format_prior_insights(prior_insights),
        ]
        return "\n".join(sections)

    # === Check data volume to decide RAG vs brute-force ===
    log_count_result = await db.execute(
        select(func.count(DailyLog.id)).where(
            and_(DailyLog.user_id == user_id, DailyLog.date >= start, DailyLog.date <= end)
        )
    )
    log_count = log_count_result.scalar() or 0

    if log_count > RAG_THRESHOLD:
        # === RAG Mode: semantic retrieval ===
        logger.info(
            "[build_agent_prompt] RAG mode: %d logs in range (threshold=%d), using semantic search",
            log_count, RAG_THRESHOLD,
        )
        rag_text = await _gather_data_rag(db, user_id, agent_type, start, end)

        # Still add people/projects context that RAG doesn't cover
        data = {"people": [], "projects": []}
        if agent_type == "relationship":
            r = await db.execute(select(Person).where(Person.user_id == user_id))
            data["people"] = r.scalars().all()
        if agent_type in ("behavioral", "life_pattern"):
            from backend.models import Project
            r = await db.execute(select(Project).where(Project.user_id == user_id))
            data["projects"] = r.scalars().all()

        # Also add life area scores (small dataset, always include)
        r = await db.execute(
            select(LifeAreaScore).where(
                and_(LifeAreaScore.user_id == user_id, LifeAreaScore.week_start_date >= start)
            )
        )
        life_scores = r.scalars().all()

        sections = [rag_text]

        if life_scores:
            sections.append("\n=== Life Area Scores ===\n" + _format_life_scores(life_scores))

        if agent_type == "relationship" and data["people"]:
            people_lines = []
            for p in data["people"]:
                people_lines.append(
                    f"{p.name} ({p.relationship_type or 'other'}) trust:{p.trust_level}/10 energy:{p.energy_exchange or 'n/a'}"
                )
            sections.append("\n=== People in Network ===\n" + "\n".join(people_lines))

        if agent_type in ("behavioral", "life_pattern") and data["projects"]:
            proj_lines = []
            for p in data["projects"]:
                status = p.status.value if hasattr(p.status, 'value') else p.status
                proj_lines.append(f"{p.name} [{status}]: {p.description or ''}")
            sections.append("\n=== Projects ===\n" + "\n".join(proj_lines))

        # Inject knowledge facts
        facts_text = await _gather_knowledge_facts(db, user_id, agent_type)
        if facts_text:
            sections.append("\n" + facts_text)

        return "\n".join(sections)

    # === Standard Mode: brute-force (small dataset) ===
    logger.info(
        "[build_agent_prompt] Standard mode: %d logs in range (threshold=%d)",
        log_count, RAG_THRESHOLD,
    )
    data = await _gather_data(db, user_id, start, end)

    sections = [f"Analysis period: {start} to {end}\n"]

    if data["logs"]:
        sections.append("=== Daily Logs ===\n" + _format_logs(data["logs"]))
    if data["interactions"]:
        sections.append("\n=== Interactions ===\n" + _format_interactions(data["interactions"], data["people"]))
    if data["decisions"]:
        sections.append("\n=== Decisions ===\n" + _format_decisions(data["decisions"]))
    if data["goals"]:
        sections.append("\n=== Goals ===\n" + _format_goals(data["goals"]))
    if data["life_scores"]:
        sections.append("\n=== Life Area Scores ===\n" + _format_life_scores(data["life_scores"]))

    # People summary for relationship agent
    if agent_type == "relationship" and data["people"]:
        people_lines = []
        for p in data["people"]:
            people_lines.append(
                f"{p.name} ({p.relationship_type or 'other'}) trust:{p.trust_level}/10 energy:{p.energy_exchange or 'n/a'}"
            )
        sections.append("\n=== People in Network ===\n" + "\n".join(people_lines))

    # Projects for behavioral/life pattern
    if agent_type in ("behavioral", "life_pattern") and data["projects"]:
        proj_lines = []
        for p in data["projects"]:
            status = p.status.value if hasattr(p.status, 'value') else p.status
            proj_lines.append(f"{p.name} [{status}]: {p.description or ''}")
        sections.append("\n=== Projects ===\n" + "\n".join(proj_lines))

    # Inject knowledge facts
    facts_text = await _gather_knowledge_facts(db, user_id, agent_type)
    if facts_text:
        sections.append("\n" + facts_text)

    return "\n".join(sections)
