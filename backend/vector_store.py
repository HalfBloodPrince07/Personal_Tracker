"""Vector store (ChromaDB) for RAG-based semantic memory retrieval.

Indexes daily logs, decisions, interactions, and goals into a local
ChromaDB instance. Agents query this instead of brute-forcing all records.
"""
import logging
from datetime import date
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import DailyLog, Decision, Interaction, Person, Goal

logger = logging.getLogger(__name__)

# Persistent ChromaDB storage alongside SQLite
_DATA_DIR = Path(__file__).parent.parent / "data"
_CHROMA_DIR = _DATA_DIR / "chroma_db"
_CHROMA_DIR.mkdir(parents=True, exist_ok=True)

_client: chromadb.ClientAPI | None = None


def _get_client() -> chromadb.ClientAPI:
    """Lazily initialize the persistent ChromaDB client."""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=str(_CHROMA_DIR),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info("[vector_store] ChromaDB initialized at %s", _CHROMA_DIR)
    return _client


def _collection_name(user_id: int) -> str:
    """Each user gets their own collection for data isolation."""
    return f"user_{user_id}_memories"


def _get_collection(user_id: int):
    """Get or create the user's ChromaDB collection."""
    client = _get_client()
    return client.get_or_create_collection(
        name=_collection_name(user_id),
        metadata={"hnsw:space": "cosine"},
    )


# ── Document builders ──────────────────────────────────────────────────

def _log_to_doc(log: DailyLog) -> dict:
    """Convert a DailyLog to a ChromaDB document."""
    parts = []
    if log.content:
        parts.append(log.content)
    if log.highlights:
        parts.append(f"Highlights: {log.highlights}")
    if log.emotions:
        parts.append(f"Emotions: {', '.join(log.emotions)}")
    if log.tags:
        parts.append(f"Tags: {', '.join(log.tags)}")
    if log.mood_score:
        parts.append(f"Mood: {log.mood_score}/10")
    if log.energy_level:
        parts.append(f"Energy: {log.energy_level}/10")

    return {
        "id": f"log_{log.id}",
        "document": " | ".join(parts) if parts else "Empty log entry",
        "metadata": {
            "type": "daily_log",
            "date": str(log.date),
            "user_id": log.user_id,
            "mood": log.mood_score or 0,
            "energy": log.energy_level or 0,
        },
    }


def _decision_to_doc(d: Decision) -> dict:
    """Convert a Decision to a ChromaDB document."""
    domain = d.domain.value if hasattr(d.domain, "value") else (d.domain or "general")
    parts = [f"Decision: {d.title}"]
    if d.description:
        parts.append(d.description)
    if d.outcome_notes:
        parts.append(f"Outcome: {d.outcome_notes}")
    if d.outcome_score:
        parts.append(f"Outcome score: {d.outcome_score}/10")

    return {
        "id": f"decision_{d.id}",
        "document": " | ".join(parts),
        "metadata": {
            "type": "decision",
            "date": str(d.date),
            "user_id": d.user_id,
            "domain": domain,
        },
    }


def _interaction_to_doc(i: Interaction, person_name: str) -> dict:
    """Convert an Interaction to a ChromaDB document."""
    parts = [f"Interaction with {person_name}"]
    if i.description:
        parts.append(i.description)
    if i.emotional_tone:
        parts.append(f"Tone: {i.emotional_tone}")
    if i.context:
        parts.append(f"Context: {i.context}")

    return {
        "id": f"interaction_{i.id}",
        "document": " | ".join(parts),
        "metadata": {
            "type": "interaction",
            "date": str(i.date),
            "user_id": i.user_id,
            "person": person_name,
        },
    }


def _goal_to_doc(g: Goal) -> dict:
    """Convert a Goal to a ChromaDB document."""
    status = g.status.value if hasattr(g.status, "value") else g.status
    domain = g.domain.value if hasattr(g.domain, "value") else (g.domain or "general")
    parts = [f"Goal: {g.title} [{status}]"]
    if g.description:
        parts.append(g.description)
    parts.append(f"Domain: {domain}")

    return {
        "id": f"goal_{g.id}",
        "document": " | ".join(parts),
        "metadata": {
            "type": "goal",
            "date": str(g.target_date) if g.target_date else "no-date",
            "user_id": g.user_id,
            "domain": domain,
            "status": status,
        },
    }


# ── Indexing ───────────────────────────────────────────────────────────

async def index_user_data(db: AsyncSession, user_id: int) -> dict:
    """(Re)index all of a user's data into ChromaDB.

    Safe to call repeatedly — uses upsert so existing docs are updated.
    Returns counts of indexed items.
    """
    collection = _get_collection(user_id)
    counts = {"logs": 0, "decisions": 0, "interactions": 0, "goals": 0}

    # Logs
    result = await db.execute(
        select(DailyLog).where(DailyLog.user_id == user_id).order_by(DailyLog.date)
    )
    logs = result.scalars().all()
    for log in logs:
        doc = _log_to_doc(log)
        collection.upsert(
            ids=[doc["id"]],
            documents=[doc["document"]],
            metadatas=[doc["metadata"]],
        )
        counts["logs"] += 1

    # Decisions
    result = await db.execute(
        select(Decision).where(Decision.user_id == user_id).order_by(Decision.date)
    )
    decisions = result.scalars().all()
    for d in decisions:
        doc = _decision_to_doc(d)
        collection.upsert(
            ids=[doc["id"]],
            documents=[doc["document"]],
            metadatas=[doc["metadata"]],
        )
        counts["decisions"] += 1

    # People lookup for interactions
    result = await db.execute(
        select(Person).where(Person.user_id == user_id)
    )
    people = result.scalars().all()
    pmap = {p.id: p.name for p in people}

    # Interactions
    result = await db.execute(
        select(Interaction).where(Interaction.user_id == user_id).order_by(Interaction.date)
    )
    interactions = result.scalars().all()
    for i in interactions:
        name = pmap.get(i.person_id, f"Person#{i.person_id}")
        doc = _interaction_to_doc(i, name)
        collection.upsert(
            ids=[doc["id"]],
            documents=[doc["document"]],
            metadatas=[doc["metadata"]],
        )
        counts["interactions"] += 1

    # Goals
    result = await db.execute(
        select(Goal).where(Goal.user_id == user_id)
    )
    goals = result.scalars().all()
    for g in goals:
        doc = _goal_to_doc(g)
        collection.upsert(
            ids=[doc["id"]],
            documents=[doc["document"]],
            metadatas=[doc["metadata"]],
        )
        counts["goals"] += 1

    total = sum(counts.values())
    logger.info("[vector_store] Indexed %d documents for user %d: %s", total, user_id, counts)
    return counts


async def index_single_log(log: DailyLog) -> None:
    """Index or update a single daily log entry."""
    collection = _get_collection(log.user_id)
    doc = _log_to_doc(log)
    collection.upsert(
        ids=[doc["id"]],
        documents=[doc["document"]],
        metadatas=[doc["metadata"]],
    )


async def index_single_decision(decision: Decision) -> None:
    """Index or update a single decision."""
    collection = _get_collection(decision.user_id)
    doc = _decision_to_doc(decision)
    collection.upsert(
        ids=[doc["id"]],
        documents=[doc["document"]],
        metadatas=[doc["metadata"]],
    )


async def index_single_interaction(
    interaction: Interaction, person_name: str
) -> None:
    """Index or update a single interaction."""
    collection = _get_collection(interaction.user_id)
    doc = _interaction_to_doc(interaction, person_name)
    collection.upsert(
        ids=[doc["id"]],
        documents=[doc["document"]],
        metadatas=[doc["metadata"]],
    )


# ── Semantic search ───────────────────────────────────────────────────

def semantic_search(
    user_id: int,
    query: str,
    n_results: int = 20,
    doc_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[dict]:
    """Search the user's memory store semantically.

    Args:
        user_id: User whose data to search.
        query: Natural-language query text.
        n_results: Max results to return.
        doc_type: Filter by type (daily_log, decision, interaction, goal).
        date_from / date_to: Optional date range filter.

    Returns:
        List of dicts with keys: id, document, metadata, distance.
    """
    collection = _get_collection(user_id)

    if collection.count() == 0:
        return []

    where_filter = None
    if doc_type:
        where_filter = {"type": doc_type}

    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, collection.count()),
        where=where_filter,
    )

    # Post-filter by date range (ChromaDB string comparison works for ISO dates)
    items = []
    for i in range(len(results["ids"][0])):
        meta = results["metadatas"][0][i]
        doc_date = meta.get("date", "")

        if date_from and doc_date < str(date_from):
            continue
        if date_to and doc_date > str(date_to):
            continue

        items.append({
            "id": results["ids"][0][i],
            "document": results["documents"][0][i],
            "metadata": meta,
            "distance": results["distances"][0][i] if results.get("distances") else None,
        })

    return items


def get_collection_stats(user_id: int) -> dict:
    """Get stats about a user's vector store."""
    collection = _get_collection(user_id)
    return {
        "total_documents": collection.count(),
        "collection_name": _collection_name(user_id),
    }
