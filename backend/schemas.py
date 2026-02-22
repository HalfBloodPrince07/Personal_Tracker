"""Pydantic schemas for request/response validation."""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ─── Auth ──────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=6)
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    display_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─── Daily Log ────────────────────────────────────────────────────────
class DailyLogCreate(BaseModel):
    date: date
    content: Optional[str] = None
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    energy_level: Optional[int] = Field(None, ge=1, le=10)
    tags: List[str] = []
    people_mentioned: List[int] = []
    emotions: List[str] = []
    decisions_made: List[str] = []
    highlights: Optional[str] = None
    photo_urls: List[str] = []


class DailyLogUpdate(BaseModel):
    content: Optional[str] = None
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    energy_level: Optional[int] = Field(None, ge=1, le=10)
    tags: Optional[List[str]] = None
    people_mentioned: Optional[List[int]] = None
    emotions: Optional[List[str]] = None
    decisions_made: Optional[List[str]] = None
    highlights: Optional[str] = None
    photo_urls: Optional[List[str]] = None


class DailyLogResponse(BaseModel):
    id: int
    user_id: int
    date: date
    content: Optional[str]
    mood_score: Optional[int]
    energy_level: Optional[int]
    tags: List[str]
    people_mentioned: List[int]
    emotions: List[str]
    decisions_made: List[str]
    highlights: Optional[str]
    photo_urls: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Person ───────────────────────────────────────────────────────────
class PersonCreate(BaseModel):
    name: str = Field(..., max_length=100)
    relationship_type: Optional[str] = None
    trust_level: int = Field(5, ge=1, le=10)
    influence_score: float = 0.0
    energy_exchange: Optional[str] = None
    notes: Optional[str] = None
    known_since: Optional[date] = None
    birthday: Optional[date] = None


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    relationship_type: Optional[str] = None
    trust_level: Optional[int] = Field(None, ge=1, le=10)
    influence_score: Optional[float] = None
    energy_exchange: Optional[str] = None
    notes: Optional[str] = None
    known_since: Optional[date] = None
    birthday: Optional[date] = None


class PersonResponse(BaseModel):
    id: int
    user_id: int
    name: str
    relationship_type: Optional[str]
    trust_level: int
    influence_score: float
    energy_exchange: Optional[str]
    notes: Optional[str]
    known_since: Optional[date]
    birthday: Optional[date]
    created_at: datetime
    interaction_count: int = 0

    class Config:
        from_attributes = True


# ─── Interaction ──────────────────────────────────────────────────────
class InteractionCreate(BaseModel):
    person_id: int
    date: date
    description: Optional[str] = None
    emotional_tone: Optional[str] = None
    context: Optional[str] = None


class InteractionResponse(BaseModel):
    id: int
    person_id: int
    date: date
    description: Optional[str]
    emotional_tone: Optional[str]
    context: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Project ─────────────────────────────────────────────────────────
class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    status: str = "active"
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    color: str = "#6366f1"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    color: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    status: str
    start_date: Optional[date]
    target_date: Optional[date]
    color: str
    created_at: datetime
    task_count: int = 0
    completed_task_count: int = 0

    class Config:
        from_attributes = True


# ─── Task ────────────────────────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None


class TaskResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[date]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Life Area Score ─────────────────────────────────────────────────
class LifeAreaScoreCreate(BaseModel):
    area: str
    score: int = Field(..., ge=1, le=10)
    week_start_date: date
    notes: Optional[str] = None


class LifeAreaScoreBatchCreate(BaseModel):
    week_start_date: date
    scores: dict  # {"health": 7, "career": 8, ...}
    notes: Optional[dict] = None  # {"health": "Ran 3x this week", ...}


class LifeAreaScoreResponse(BaseModel):
    id: int
    user_id: int
    area: str
    score: int
    week_start_date: date
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Goal ────────────────────────────────────────────────────────────
class GoalCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    domain: Optional[str] = None
    target_date: Optional[date] = None
    status: str = "active"


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    target_date: Optional[date] = None
    status: Optional[str] = None


class GoalCheckInCreate(BaseModel):
    date: date
    alignment_score: int = Field(..., ge=1, le=10)
    notes: Optional[str] = None


class GoalCheckInResponse(BaseModel):
    id: int
    goal_id: int
    date: date
    alignment_score: int
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class GoalResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    domain: Optional[str]
    target_date: Optional[date]
    status: str
    created_at: datetime
    checkins: List[GoalCheckInResponse] = []
    avg_alignment: Optional[float] = None

    class Config:
        from_attributes = True


# ─── Decision ────────────────────────────────────────────────────────
class DecisionCreate(BaseModel):
    date: date
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    domain: Optional[str] = None
    next_review_date: Optional[date] = None


class DecisionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    outcome_notes: Optional[str] = None
    outcome_score: Optional[int] = Field(None, ge=1, le=10)
    next_review_date: Optional[date] = None


class DecisionResponse(BaseModel):
    id: int
    user_id: int
    date: date
    title: str
    description: Optional[str]
    domain: Optional[str]
    outcome_notes: Optional[str]
    outcome_score: Optional[int]
    reviewed_at: Optional[datetime]
    next_review_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Dashboard ───────────────────────────────────────────────────────
class DashboardSummary(BaseModel):
    today_log: Optional[DailyLogResponse] = None
    mood_trend: List[dict] = []  # last 7 days
    active_projects: int = 0
    pending_tasks: int = 0
    goals_on_track: int = 0
    goals_total: int = 0
    life_area_scores: dict = {}  # latest scores
    recent_decisions: List[DecisionResponse] = []
    people_count: int = 0


# ─── NLP ─────────────────────────────────────────────────────────────
class NLPLifeAreaRequest(BaseModel):
    text: str
    week_start_date: Optional[date] = None


class NLPPersonRequest(BaseModel):
    text: str
    # If provided, update existing person instead of creating
    person_id: Optional[int] = None


class NLPDailyLogRequest(BaseModel):
    text: str
    log_date: Optional[date] = None


# ─── Weekly Review (Module 9) ───────────────────────────────────────
class WeeklyReviewResponse(BaseModel):
    id: int
    user_id: int
    week_start_date: date
    summary: Optional[str]
    reflections: List[dict] = []
    wins: List[str] = []
    struggles: List[str] = []
    focus_next_week: List[str] = []
    mood_avg: Optional[float]
    energy_avg: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class WeeklyReviewGenerate(BaseModel):
    week_start_date: Optional[date] = None


# ─── Agent Insight (Module 10) ──────────────────────────────────────
class AgentInsightResponse(BaseModel):
    id: int
    user_id: int
    agent_type: str
    title: Optional[str]
    content: str
    data: dict = {}
    severity: Optional[str]
    tags: List[str] = []
    date_range_start: Optional[date]
    date_range_end: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


class AgentRunRequest(BaseModel):
    agent_type: str
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None
    insight_period: Optional[str] = None  # weekly, monthly, quarterly, yearly


# ─── Conversation Brief (Module 11) ─────────────────────────────────
class ConversationBriefResponse(BaseModel):
    id: int
    user_id: int
    person_id: int
    brief: str
    key_topics: List[str] = []
    last_interaction_summary: Optional[str]
    relationship_health: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationBriefRequest(BaseModel):
    person_id: int
