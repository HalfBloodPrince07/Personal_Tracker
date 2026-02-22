"""SQLAlchemy ORM models for PLIS."""
import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Float, Date, DateTime,
    ForeignKey, Enum, JSON, Boolean
)
from sqlalchemy.orm import relationship
from backend.database import Base


class LifeArea(str, enum.Enum):
    HEALTH = "health"
    CAREER = "career"
    FINANCES = "finances"
    RELATIONSHIPS = "relationships"
    LEARNING = "learning"
    CREATIVITY = "creativity"
    SPIRITUALITY = "spirituality"


class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class GoalStatus(str, enum.Enum):
    ACTIVE = "active"
    ACHIEVED = "achieved"
    ABANDONED = "abandoned"
    PAUSED = "paused"


class AgentType(str, enum.Enum):
    BEHAVIORAL = "behavioral"
    PSYCHOLOGICAL = "psychological"
    FINANCIAL = "financial"
    RELATIONSHIP = "relationship"
    DECISION_AUDIT = "decision_audit"
    PREDICTIVE = "predictive"
    CONTRADICTION = "contradiction"
    LIFE_PATTERN = "life_pattern"


class InsightPeriod(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


# ─── User ──────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    daily_logs = relationship("DailyLog", back_populates="user", cascade="all, delete-orphan")
    people = relationship("Person", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    life_area_scores = relationship("LifeAreaScore", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="user", cascade="all, delete-orphan")
    weekly_reviews = relationship("WeeklyReview", back_populates="user", cascade="all, delete-orphan")
    agent_insights = relationship("AgentInsight", back_populates="user", cascade="all, delete-orphan")
    conversation_briefs = relationship("ConversationBrief", back_populates="user", cascade="all, delete-orphan")


# ─── Daily Life Log ───────────────────────────────────────────────────
class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    content = Column(Text)  # Main journal text
    mood_score = Column(Integer)  # 1-10
    energy_level = Column(Integer)  # 1-10
    tags = Column(JSON, default=list)  # ["work", "family", ...]
    people_mentioned = Column(JSON, default=list)  # [person_id, ...]
    emotions = Column(JSON, default=list)  # ["grateful", "anxious", ...]
    decisions_made = Column(JSON, default=list)  # summary of decisions
    highlights = Column(Text)  # Key moments
    photo_urls = Column(JSON, default=list)  # ["/uploads/abc.jpg", ...]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="daily_logs")


# ─── People & Relationships ──────────────────────────────────────────
class Person(Base):
    __tablename__ = "people"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    relationship_type = Column(String(50))  # family, friend, colleague, etc.
    trust_level = Column(Integer, default=5)  # 1-10
    influence_score = Column(Float, default=0.0)
    energy_exchange = Column(String(20))  # energizing, neutral, draining
    notes = Column(Text)
    photo_url = Column(String(500))
    known_since = Column(Date)  # when they first met
    birthday = Column(Date)     # optional birthday
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="people")
    interactions = relationship("Interaction", back_populates="person", cascade="all, delete-orphan")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    person_id = Column(Integer, ForeignKey("people.id"), nullable=False)
    date = Column(Date, nullable=False)
    description = Column(Text)
    emotional_tone = Column(String(50))  # positive, negative, neutral, mixed
    context = Column(String(100))  # work, social, family, etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    person = relationship("Person", back_populates="interactions")


# ─── Projects & Tasks ────────────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE)
    start_date = Column(Date)
    target_date = Column(Date)
    color = Column(String(7), default="#6366f1")  # hex color for UI
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    due_date = Column(Date)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="tasks")


# ─── Life Areas ──────────────────────────────────────────────────────
class LifeAreaScore(Base):
    __tablename__ = "life_area_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    area = Column(Enum(LifeArea), nullable=False)
    score = Column(Integer, nullable=False)  # 1-10
    week_start_date = Column(Date, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="life_area_scores")


# ─── Goals ───────────────────────────────────────────────────────────
class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    domain = Column(Enum(LifeArea))
    target_date = Column(Date)
    status = Column(Enum(GoalStatus), default=GoalStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="goals")
    checkins = relationship("GoalCheckIn", back_populates="goal", cascade="all, delete-orphan")


class GoalCheckIn(Base):
    __tablename__ = "goal_checkins"

    id = Column(Integer, primary_key=True, autoincrement=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    date = Column(Date, nullable=False)
    alignment_score = Column(Integer, nullable=False)  # 1-10, how aligned behavior was
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    goal = relationship("Goal", back_populates="checkins")


# ─── Decisions ───────────────────────────────────────────────────────
class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    domain = Column(Enum(LifeArea))
    outcome_notes = Column(Text)
    outcome_score = Column(Integer)  # 1-10
    reviewed_at = Column(DateTime)
    next_review_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="decisions")


# ─── Weekly Review (Module 9) ──────────────────────────────────────
class WeeklyReview(Base):
    __tablename__ = "weekly_reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    week_start_date = Column(Date, nullable=False, index=True)
    summary = Column(Text)  # AI-generated weekly summary
    reflections = Column(JSON, default=list)  # list of reflective Q&A pairs
    wins = Column(JSON, default=list)  # highlights/wins of the week
    struggles = Column(JSON, default=list)  # challenges faced
    focus_next_week = Column(JSON, default=list)  # suggested focus areas
    mood_avg = Column(Float)  # average mood score for the week
    energy_avg = Column(Float)  # average energy for the week
    raw_llm_output = Column(Text)  # store full AI response
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="weekly_reviews")


# ─── AI Agent Insights (Module 10) ─────────────────────────────────
class AgentInsight(Base):
    __tablename__ = "agent_insights"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent_type = Column(Enum(AgentType), nullable=False, index=True)
    title = Column(String(300))
    content = Column(Text, nullable=False)  # main insight text
    data = Column(JSON, default=dict)  # structured data (scores, metrics, etc.)
    severity = Column(String(20))  # info, warning, critical, positive
    tags = Column(JSON, default=list)
    date_range_start = Column(Date)  # data period this insight covers
    date_range_end = Column(Date)
    insight_period = Column(Enum(InsightPeriod))  # weekly, monthly, quarterly, yearly
    parent_insight_id = Column(Integer, ForeignKey("agent_insights.id"), nullable=True)  # for meta-insights
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="agent_insights")
    parent_insight = relationship("AgentInsight", remote_side=[id], uselist=False)


# ─── Conversation Memory (Module 11) ──────────────────────────────
class ConversationBrief(Base):
    __tablename__ = "conversation_briefs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    person_id = Column(Integer, ForeignKey("people.id"), nullable=False)
    brief = Column(Text, nullable=False)  # AI-generated pre-meeting brief
    key_topics = Column(JSON, default=list)  # topics to remember
    last_interaction_summary = Column(Text)
    relationship_health = Column(String(20))  # thriving, stable, needs_attention, strained
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="conversation_briefs")
    person = relationship("Person")


# ─── Knowledge Graph Facts (Module 12 — RAG) ────────────────────────
class KnowledgeFact(Base):
    __tablename__ = "knowledge_facts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject = Column(String(200), nullable=False)   # e.g. "User"
    predicate = Column(String(200), nullable=False)  # e.g. "dislikes"
    object_value = Column(String(500), nullable=False)  # e.g. "working late on Fridays"
    category = Column(String(50))  # preference, habit, belief, relationship, goal, health
    confidence = Column(Float, default=0.8)  # 0.0 - 1.0
    source_log_id = Column(Integer, ForeignKey("daily_logs.id"), nullable=True)
    source_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


# ─── Cached Chapters (auto-regenerated every 10 days) ──────────────
class CachedChapter(Base):
    __tablename__ = "cached_chapters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    chapters_json = Column(JSON, nullable=False)  # full chapters array
    log_count = Column(Integer)  # number of logs when generated
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
