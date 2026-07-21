"""Main FastAPI application with all API routes."""
import logging
import os
import uuid
import shutil
from pathlib import Path as FsPath
from datetime import date, datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db, init_db
from backend.auth import (
    hash_password, verify_password, create_access_token, get_current_user
)
from backend.models import (
    User, DailyLog, Person, Interaction,
    Project, Task, LifeAreaScore, Goal, GoalCheckIn, Decision,
    ProjectStatus, TaskStatus as TaskStatusEnum, GoalStatus, LifeArea,
    WeeklyReview, AgentInsight, AgentType, ConversationBrief,
    CachedChapter,
)
from backend.schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    DailyLogCreate, DailyLogUpdate, DailyLogResponse,
    PersonCreate, PersonUpdate, PersonResponse,
    InteractionCreate, InteractionResponse,
    ProjectCreate, ProjectUpdate, ProjectResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    LifeAreaScoreCreate, LifeAreaScoreBatchCreate, LifeAreaScoreResponse,
    GoalCreate, GoalUpdate, GoalResponse,
    GoalCheckInCreate, GoalCheckInResponse,
    DecisionCreate, DecisionUpdate, DecisionResponse,
    DashboardSummary,
    NLPLifeAreaRequest, NLPPersonRequest, NLPDailyLogRequest,
    WeeklyReviewResponse, WeeklyReviewGenerate,
    AgentInsightResponse, AgentRunRequest,
    ConversationBriefResponse, ConversationBriefRequest,
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Personal Life Intelligence System",
    version="1.0.0",
    description="A private, AI-powered personal intelligence platform"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173",
        "http://192.168.0.15:5173",   # LAN access from phone (HTTP)
        "https://192.168.0.15:5173",  # LAN access from phone (HTTPS for PWA)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Static file serving for uploaded photos ────────────────────────────
_UPLOAD_DIR = FsPath(__file__).parent.parent / "data" / "uploads"
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_UPLOAD_DIR)), name="uploads")


@app.on_event("startup")
async def startup():
    """Initialize database on startup."""
    await init_db()
    logger.info("✅ Database initialized")


# ═══════════════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════════

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    # Check existing username
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Check existing email
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        display_name=user_data.display_name or user_data.username,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return Token(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login with username and password."""
    result = await db.execute(select(User).where(User.username == credentials.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return Token(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return UserResponse.model_validate(current_user)


# ═══════════════════════════════════════════════════════════════════════
#  DAILY LOG ROUTES
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/logs", response_model=List[DailyLogResponse])
async def get_logs(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get daily logs, optionally filtered by date range."""
    query = select(DailyLog).where(DailyLog.user_id == current_user.id)
    if start_date:
        query = query.where(DailyLog.date >= start_date)
    if end_date:
        query = query.where(DailyLog.date <= end_date)
    query = query.order_by(desc(DailyLog.date))
    result = await db.execute(query)
    return [DailyLogResponse.model_validate(log) for log in result.scalars().all()]


@app.get("/api/logs/{log_date}", response_model=Optional[DailyLogResponse])
async def get_log_by_date(
    log_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific day's log."""
    result = await db.execute(
        select(DailyLog).where(
            and_(DailyLog.user_id == current_user.id, DailyLog.date == log_date)
        )
    )
    log = result.scalar_one_or_none()
    if log:
        return DailyLogResponse.model_validate(log)
    return None


@app.post("/api/logs", response_model=DailyLogResponse)
async def create_log(
    log_data: DailyLogCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or update a daily log for a specific date."""
    # Check if log already exists for this date
    result = await db.execute(
        select(DailyLog).where(
            and_(DailyLog.user_id == current_user.id, DailyLog.date == log_data.date)
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Update existing
        for key, value in log_data.model_dump(exclude_unset=True).items():
            setattr(existing, key, value)
        existing.updated_at = datetime.utcnow()
        await db.flush()
        await db.refresh(existing)
        # Auto-index into vector store
        try:
            await vector_store.index_single_log(existing)
        except Exception:
            logger.debug("Vector index update skipped for log %d", existing.id)
            
        background_tasks.add_task(_background_generate_chapters, current_user.id)
        return DailyLogResponse.model_validate(existing)

    log = DailyLog(user_id=current_user.id, **log_data.model_dump())
    db.add(log)
    await db.flush()
    await db.refresh(log)
    # Auto-index into vector store
    try:
        await vector_store.index_single_log(log)
    except Exception:
        logger.debug("Vector index skipped for log %d", log.id)
    
    background_tasks.add_task(_background_generate_chapters, current_user.id)
    return DailyLogResponse.model_validate(log)


@app.put("/api/logs/{log_id}", response_model=DailyLogResponse)
async def update_log(
    log_id: int,
    log_data: DailyLogUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a daily log."""
    result = await db.execute(
        select(DailyLog).where(
            and_(DailyLog.id == log_id, DailyLog.user_id == current_user.id)
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    for key, value in log_data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(log, key, value)
    log.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(log)
    
    background_tasks.add_task(_background_generate_chapters, current_user.id)
    return DailyLogResponse.model_validate(log)


@app.delete("/api/logs/{log_id}")
async def delete_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a daily log."""
    result = await db.execute(
        select(DailyLog).where(
            and_(DailyLog.id == log_id, DailyLog.user_id == current_user.id)
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    await db.delete(log)
    return {"detail": "Log deleted"}


# ═══════════════════════════════════════════════════════════════════════
#  PEOPLE ROUTES
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/people", response_model=List[PersonResponse])
async def get_people(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all people in the user's network."""
    result = await db.execute(
        select(Person).where(Person.user_id == current_user.id)
        .options(selectinload(Person.interactions))
        .order_by(Person.name)
    )
    people = result.scalars().all()
    response = []
    for p in people:
        pr = PersonResponse.model_validate(p)
        pr.interaction_count = len(p.interactions)
        response.append(pr)
    return response


@app.post("/api/people", response_model=PersonResponse)
async def create_person(
    person_data: PersonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a person to the network."""
    person = Person(user_id=current_user.id, **person_data.model_dump())
    db.add(person)
    await db.flush()
    await db.refresh(person)
    pr = PersonResponse.model_validate(person)
    pr.interaction_count = 0
    return pr


@app.put("/api/people/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: int,
    person_data: PersonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a person."""
    result = await db.execute(
        select(Person).where(
            and_(Person.id == person_id, Person.user_id == current_user.id)
        ).options(selectinload(Person.interactions))
    )
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    for key, value in person_data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(person, key, value)
    person.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(person)
    pr = PersonResponse.model_validate(person)
    pr.interaction_count = len(person.interactions)
    return pr


@app.delete("/api/people/{person_id}")
async def delete_person(
    person_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a person from the network."""
    result = await db.execute(
        select(Person).where(
            and_(Person.id == person_id, Person.user_id == current_user.id)
        )
    )
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    await db.delete(person)
    return {"detail": "Person deleted"}


# ─── Interactions ─────────────────────────────────────────────────────

@app.get("/api/people/{person_id}/interactions", response_model=List[InteractionResponse])
async def get_interactions(
    person_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all interactions with a person."""
    result = await db.execute(
        select(Interaction).where(
            and_(Interaction.person_id == person_id, Interaction.user_id == current_user.id)
        ).order_by(desc(Interaction.date))
    )
    return [InteractionResponse.model_validate(i) for i in result.scalars().all()]


@app.post("/api/interactions", response_model=InteractionResponse)
async def create_interaction(
    data: InteractionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Log an interaction with a person."""
    # Verify person ownership
    person_result = await db.execute(
        select(Person).where(
            and_(Person.id == data.person_id, Person.user_id == current_user.id)
        )
    )
    person = person_result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    interaction = Interaction(user_id=current_user.id, **data.model_dump())
    db.add(interaction)
    await db.flush()
    await db.refresh(interaction)
    # Auto-index into vector store
    try:
        person_result = await db.execute(select(Person).where(Person.id == interaction.person_id))
        person = person_result.scalar_one_or_none()
        pname = person.name if person else f"Person#{interaction.person_id}"
        await vector_store.index_single_interaction(interaction, pname)
    except Exception:
        logger.debug("Vector index skipped for interaction %d", interaction.id)
    return InteractionResponse.model_validate(interaction)


# ═══════════════════════════════════════════════════════════════════════
#  PROJECT ROUTES
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/projects", response_model=List[ProjectResponse])
async def get_projects(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all projects."""
    query = select(Project).where(Project.user_id == current_user.id)\
        .options(selectinload(Project.tasks))
    if status_filter:
        query = query.where(Project.status == status_filter)
    query = query.order_by(desc(Project.updated_at))
    result = await db.execute(query)
    projects = result.scalars().all()

    response = []
    for p in projects:
        pr = ProjectResponse.model_validate(p)
        pr.task_count = len(p.tasks)
        pr.completed_task_count = sum(1 for t in p.tasks if t.status == TaskStatusEnum.DONE)
        response.append(pr)
    return response


@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project."""
    project = Project(user_id=current_user.id, **project_data.model_dump())
    db.add(project)
    await db.flush()
    await db.refresh(project)
    pr = ProjectResponse.model_validate(project)
    pr.task_count = 0
    pr.completed_task_count = 0
    return pr


@app.put("/api/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a project."""
    result = await db.execute(
        select(Project).where(
            and_(Project.id == project_id, Project.user_id == current_user.id)
        ).options(selectinload(Project.tasks))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for key, value in project_data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(project, key, value)
    project.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(project)
    pr = ProjectResponse.model_validate(project)
    pr.task_count = len(project.tasks)
    pr.completed_task_count = sum(1 for t in project.tasks if t.status == TaskStatusEnum.DONE)
    return pr


@app.delete("/api/projects/{project_id}")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a project and all its tasks."""
    result = await db.execute(
        select(Project).where(
            and_(Project.id == project_id, Project.user_id == current_user.id)
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    return {"detail": "Project deleted"}


# ─── Tasks ────────────────────────────────────────────────────────────

@app.get("/api/projects/{project_id}/tasks", response_model=List[TaskResponse])
async def get_tasks(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tasks for a project."""
    # Verify project ownership
    proj_result = await db.execute(
        select(Project).where(
            and_(Project.id == project_id, Project.user_id == current_user.id)
        )
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Task).where(Task.project_id == project_id)
        .order_by(Task.priority, Task.created_at)
    )
    return [TaskResponse.model_validate(t) for t in result.scalars().all()]


@app.post("/api/projects/{project_id}/tasks", response_model=TaskResponse)
async def create_task(
    project_id: int,
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a task to a project."""
    # Verify project ownership
    proj_result = await db.execute(
        select(Project).where(
            and_(Project.id == project_id, Project.user_id == current_user.id)
        )
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    task = Task(project_id=project_id, **task_data.model_dump())
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a task."""
    result = await db.execute(
        select(Task).join(Project).where(
            and_(Task.id == task_id, Project.user_id == current_user.id)
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for key, value in task_data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(task, key, value)

    # Auto-set completed_at
    if task_data.status == "done" and not task.completed_at:
        task.completed_at = datetime.utcnow()
    elif task_data.status and task_data.status != "done":
        task.completed_at = None

    await db.flush()
    await db.refresh(task)
    return TaskResponse.model_validate(task)


@app.delete("/api/tasks/{task_id}")
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a task."""
    result = await db.execute(
        select(Task).join(Project).where(
            and_(Task.id == task_id, Project.user_id == current_user.id)
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    return {"detail": "Task deleted"}


# ═══════════════════════════════════════════════════════════════════════
#  LIFE AREA ROUTES
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/life-areas", response_model=List[LifeAreaScoreResponse])
async def get_life_area_scores(
    week_start_date: Optional[date] = None,
    weeks: int = Query(default=12, le=52),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get life area scores, optionally for a specific week or range."""
    query = select(LifeAreaScore).where(LifeAreaScore.user_id == current_user.id)
    if week_start_date:
        query = query.where(LifeAreaScore.week_start_date == week_start_date)
    else:
        cutoff = date.today() - timedelta(weeks=weeks)
        query = query.where(LifeAreaScore.week_start_date >= cutoff)
    query = query.order_by(desc(LifeAreaScore.week_start_date))
    result = await db.execute(query)
    return [LifeAreaScoreResponse.model_validate(s) for s in result.scalars().all()]


@app.post("/api/life-areas/batch", response_model=List[LifeAreaScoreResponse])
async def batch_create_life_area_scores(
    data: LifeAreaScoreBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit scores for all life areas for a specific week (upsert)."""
    responses = []
    for area_name, score in data.scores.items():
        # Check if score already exists for this week+area
        result = await db.execute(
            select(LifeAreaScore).where(
                and_(
                    LifeAreaScore.user_id == current_user.id,
                    LifeAreaScore.area == area_name,
                    LifeAreaScore.week_start_date == data.week_start_date
                )
            )
        )
        existing = result.scalar_one_or_none()

        notes = data.notes.get(area_name) if data.notes else None

        if existing:
            existing.score = score
            existing.notes = notes
            await db.flush()
            await db.refresh(existing)
            responses.append(LifeAreaScoreResponse.model_validate(existing))
        else:
            new_score = LifeAreaScore(
                user_id=current_user.id,
                area=area_name,
                score=score,
                week_start_date=data.week_start_date,
                notes=notes
            )
            db.add(new_score)
            await db.flush()
            await db.refresh(new_score)
            responses.append(LifeAreaScoreResponse.model_validate(new_score))

    return responses


# ═══════════════════════════════════════════════════════════════════════
#  GOAL ROUTES
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/goals", response_model=List[GoalResponse])
async def get_goals(
    status_filter: Optional[str] = None,
    domain_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all goals with their check-ins."""
    query = select(Goal).where(Goal.user_id == current_user.id)\
        .options(selectinload(Goal.checkins))
    if status_filter:
        query = query.where(Goal.status == status_filter)
    if domain_filter:
        query = query.where(Goal.domain == domain_filter)
    query = query.order_by(desc(Goal.created_at))
    result = await db.execute(query)
    goals = result.scalars().all()

    response = []
    for g in goals:
        gr = GoalResponse.model_validate(g)
        gr.checkins = [GoalCheckInResponse.model_validate(c) for c in g.checkins]
        if g.checkins:
            gr.avg_alignment = sum(c.alignment_score for c in g.checkins) / len(g.checkins)
        response.append(gr)
    return response


@app.post("/api/goals", response_model=GoalResponse)
async def create_goal(
    goal_data: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new goal."""
    goal = Goal(user_id=current_user.id, **goal_data.model_dump())
    db.add(goal)
    await db.flush()
    await db.refresh(goal, ["checkins"])
    gr = GoalResponse.model_validate(goal)
    return gr


@app.put("/api/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal_data: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a goal."""
    result = await db.execute(
        select(Goal).where(
            and_(Goal.id == goal_id, Goal.user_id == current_user.id)
        ).options(selectinload(Goal.checkins))
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    for key, value in goal_data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(goal, key, value)
    goal.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(goal)
    gr = GoalResponse.model_validate(goal)
    gr.checkins = [GoalCheckInResponse.model_validate(c) for c in goal.checkins]
    if goal.checkins:
        gr.avg_alignment = sum(c.alignment_score for c in goal.checkins) / len(goal.checkins)
    return gr


@app.delete("/api/goals/{goal_id}")
async def delete_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a goal."""
    result = await db.execute(
        select(Goal).where(
            and_(Goal.id == goal_id, Goal.user_id == current_user.id)
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    return {"detail": "Goal deleted"}


# ─── Goal Check-ins ──────────────────────────────────────────────────

@app.post("/api/goals/{goal_id}/checkins", response_model=GoalCheckInResponse)
async def create_goal_checkin(
    goal_id: int,
    checkin_data: GoalCheckInCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a check-in for a goal."""
    result = await db.execute(
        select(Goal).where(
            and_(Goal.id == goal_id, Goal.user_id == current_user.id)
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Goal not found")

    checkin = GoalCheckIn(goal_id=goal_id, **checkin_data.model_dump())
    db.add(checkin)
    await db.flush()
    await db.refresh(checkin)
    return GoalCheckInResponse.model_validate(checkin)


# ═══════════════════════════════════════════════════════════════════════
#  DECISION ROUTES
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/decisions", response_model=List[DecisionResponse])
async def get_decisions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all decisions."""
    result = await db.execute(
        select(Decision).where(Decision.user_id == current_user.id)
        .order_by(desc(Decision.date))
    )
    return [DecisionResponse.model_validate(d) for d in result.scalars().all()]


@app.post("/api/decisions", response_model=DecisionResponse)
async def create_decision(
    decision_data: DecisionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Log a new decision."""
    decision = Decision(user_id=current_user.id, **decision_data.model_dump())
    db.add(decision)
    await db.flush()
    await db.refresh(decision)
    # Auto-index into vector store
    try:
        await vector_store.index_single_decision(decision)
    except Exception:
        logger.debug("Vector index skipped for decision %d", decision.id)
    return DecisionResponse.model_validate(decision)


@app.put("/api/decisions/{decision_id}", response_model=DecisionResponse)
async def update_decision(
    decision_id: int,
    decision_data: DecisionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a decision (e.g., add outcome notes)."""
    result = await db.execute(
        select(Decision).where(
            and_(Decision.id == decision_id, Decision.user_id == current_user.id)
        )
    )
    decision = result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    for key, value in decision_data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(decision, key, value)

    if decision_data.outcome_notes or decision_data.outcome_score:
        decision.reviewed_at = datetime.utcnow()

    await db.flush()
    await db.refresh(decision)
    return DecisionResponse.model_validate(decision)


# ═══════════════════════════════════════════════════════════════════════
#  DASHBOARD ROUTE
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aggregated dashboard summary."""
    today = date.today()
    week_ago = today - timedelta(days=7)

    # Today's log
    log_result = await db.execute(
        select(DailyLog).where(
            and_(DailyLog.user_id == current_user.id, DailyLog.date == today)
        )
    )
    today_log = log_result.scalar_one_or_none()

    # Mood trend (last 7 days)
    mood_result = await db.execute(
        select(DailyLog.date, DailyLog.mood_score, DailyLog.energy_level).where(
            and_(
                DailyLog.user_id == current_user.id,
                DailyLog.date >= week_ago,
                DailyLog.mood_score.isnot(None)
            )
        ).order_by(DailyLog.date)
    )
    mood_trend = [
        {"date": str(r[0]), "mood": r[1], "energy": r[2]}
        for r in mood_result.all()
    ]

    # Active projects count
    proj_result = await db.execute(
        select(func.count(Project.id)).where(
            and_(Project.user_id == current_user.id, Project.status == ProjectStatus.ACTIVE)
        )
    )
    active_projects = proj_result.scalar() or 0

    # Pending tasks count
    task_result = await db.execute(
        select(func.count(Task.id)).join(Project).where(
            and_(
                Project.user_id == current_user.id,
                Task.status != TaskStatusEnum.DONE
            )
        )
    )
    pending_tasks = task_result.scalar() or 0

    # Goals
    goal_result = await db.execute(
        select(Goal).where(
            and_(Goal.user_id == current_user.id, Goal.status == GoalStatus.ACTIVE)
        ).options(selectinload(Goal.checkins))
    )
    active_goals = goal_result.scalars().all()
    goals_on_track = sum(
        1 for g in active_goals
        if g.checkins and (sum(c.alignment_score for c in g.checkins) / len(g.checkins)) >= 6
    )

    # Latest life area scores
    # Get the most recent week's scores
    latest_week_result = await db.execute(
        select(func.max(LifeAreaScore.week_start_date)).where(
            LifeAreaScore.user_id == current_user.id
        )
    )
    latest_week = latest_week_result.scalar()
    life_area_scores = {}
    if latest_week:
        scores_result = await db.execute(
            select(LifeAreaScore).where(
                and_(
                    LifeAreaScore.user_id == current_user.id,
                    LifeAreaScore.week_start_date == latest_week
                )
            )
        )
        for s in scores_result.scalars().all():
            life_area_scores[s.area.value if hasattr(s.area, 'value') else s.area] = s.score

    # Recent decisions
    dec_result = await db.execute(
        select(Decision).where(Decision.user_id == current_user.id)
        .order_by(desc(Decision.date)).limit(5)
    )
    recent_decisions = [DecisionResponse.model_validate(d) for d in dec_result.scalars().all()]

    # People count
    people_result = await db.execute(
        select(func.count(Person.id)).where(Person.user_id == current_user.id)
    )
    people_count = people_result.scalar() or 0

    return DashboardSummary(
        today_log=DailyLogResponse.model_validate(today_log) if today_log else None,
        mood_trend=mood_trend,
        active_projects=active_projects,
        pending_tasks=pending_tasks,
        goals_on_track=goals_on_track,
        goals_total=len(active_goals),
        life_area_scores=life_area_scores,
        recent_decisions=recent_decisions,
        people_count=people_count
    )


# ═══════════════════════════════════════════════════════════════════════
#  INTERACTION DELETE
# ═══════════════════════════════════════════════════════════════════════

@app.delete("/api/interactions/{interaction_id}")
async def delete_interaction(
    interaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific interaction log."""
    result = await db.execute(
        select(Interaction).where(
            and_(Interaction.id == interaction_id, Interaction.user_id == current_user.id)
        )
    )
    interaction = result.scalar_one_or_none()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    await db.delete(interaction)
    return {"detail": "Interaction deleted"}


# ═══════════════════════════════════════════════════════════════════════
#  NLP ENDPOINTS  — thin wrappers that delegate to the agent layer
# ═══════════════════════════════════════════════════════════════════════

from datetime import date as date_type
from backend.agents import (
    LifeAreaAgent, PersonAgent, DailyLogAgent,
    WeeklyReviewAgent, AGENT_MAP, build_agent_prompt,
)
from backend.agents.weekly_review_agent import gather_week_context
from backend.agents.conversation_agent import ConversationBriefAgent, gather_person_context
from backend import vector_store


def _week_start(d=None):
    d = d or date_type.today()
    import datetime as _dt
    return d - _dt.timedelta(days=d.weekday())


def _nlp_error(exc: Exception) -> HTTPException:
    """Map agent exceptions to appropriate HTTP status codes."""
    if isinstance(exc, RuntimeError):    # LM Studio offline
        return HTTPException(status_code=503, detail=str(exc))
    if isinstance(exc, LookupError):     # person_id not found
        return HTTPException(status_code=404, detail=str(exc))
    return HTTPException(status_code=422, detail=str(exc))


@app.post("/api/life-areas/nlp")
async def nlp_life_areas(
    req: NLPLifeAreaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Parse week description → extract/infer 7 life-area scores and save them."""
    try:
        return await LifeAreaAgent().run(
            req.text, db,
            user_id   = current_user.id,
            week_date = req.week_start_date or _week_start(),
        )
    except Exception as exc:
        raise _nlp_error(exc)


@app.post("/api/people/nlp")
async def nlp_person(
    req: NLPPersonRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Parse person description → create or update a person profile."""
    try:
        return await PersonAgent().run(
            req.text, db,
            user_id   = current_user.id,
            person_id = req.person_id,
        )
    except Exception as exc:
        raise _nlp_error(exc)


@app.post("/api/daily-log/nlp")
async def nlp_daily_log(
    req: NLPDailyLogRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Parse day description → upsert daily log and auto-log interactions."""
    log_date = req.log_date or date_type.today()

    # Pre-fetch user's people list once and pass as context
    people_result = await db.execute(
        select(Person).where(Person.user_id == current_user.id)
    )
    people_names = [{"id": p.id, "name": p.name} for p in people_result.scalars().all()]

    try:
        result = await DailyLogAgent().run(
            req.text, db,
            user_id       = current_user.id,
            log_date      = log_date,
            people_names  = people_names,
            original_text = req.text,
        )

        # Auto-index the created/updated log into vector store + extract knowledge facts
        try:
            log_result = await db.execute(
                select(DailyLog).where(
                    and_(DailyLog.user_id == current_user.id, DailyLog.date == log_date)
                )
            )
            log_obj = log_result.scalar_one_or_none()
            if log_obj:
                await vector_store.index_single_log(log_obj)
                from backend.knowledge_graph import extract_facts_from_log
                await extract_facts_from_log(db, log_obj)
        except Exception:
            logger.debug("Post-NLP indexing/extraction skipped")

        background_tasks.add_task(_background_generate_chapters, current_user.id)
        return result
    except Exception as exc:
        raise _nlp_error(exc)


# ═══════════════════════════════════════════════════════════════════════
#  PHASE 2: PHOTO UPLOAD, TIMELINE, CHAPTERS, RELATIONSHIP GRAPH
# ═══════════════════════════════════════════════════════════════════════

@app.post("/api/upload")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload an image file and return its URL."""
    allowed = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed. Use: {', '.join(allowed)}")

    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = _UPLOAD_DIR / unique_name
    with open(dest, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    return {"url": f"/uploads/{unique_name}", "filename": unique_name}


@app.get("/api/timeline")
async def get_timeline(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggregate daily logs, projects, goals, decisions, and interactions into a unified timeline."""
    events = []
    # If no start_date, fetch ALL events (no cutoff)
    sd = start_date or date(2000, 1, 1)
    ed = end_date or date.today()

    # Daily Logs
    logs_result = await db.execute(
        select(DailyLog).where(
            and_(DailyLog.user_id == current_user.id, DailyLog.date >= sd, DailyLog.date <= ed)
        ).order_by(DailyLog.date)
    )
    for log in logs_result.scalars().all():
        events.append({
            "type": "daily_log", "date": str(log.date), "id": log.id,
            "title": f"Daily Log", "summary": (log.content or "")[:120],
            "mood": log.mood_score, "energy": log.energy_level,
            "tags": log.tags or [], "photos": log.photo_urls or [],
        })

    # Goals
    goals_result = await db.execute(
        select(Goal).where(Goal.user_id == current_user.id)
    )
    for g in goals_result.scalars().all():
        if g.created_at and sd <= g.created_at.date() <= ed:
            events.append({
                "type": "goal", "date": str(g.created_at.date()), "id": g.id,
                "title": f"🎯 Goal: {g.title}", "summary": g.description or "",
                "status": g.status.value if hasattr(g.status, 'value') else g.status,
                "domain": g.domain.value if hasattr(g.domain, 'value') else g.domain,
            })

    # Decisions
    dec_result = await db.execute(
        select(Decision).where(
            and_(Decision.user_id == current_user.id, Decision.date >= sd, Decision.date <= ed)
        )
    )
    for d in dec_result.scalars().all():
        events.append({
            "type": "decision", "date": str(d.date), "id": d.id,
            "title": f"⚖️ Decision: {d.title}", "summary": d.description or "",
            "domain": d.domain.value if hasattr(d.domain, 'value') else d.domain,
        })

    # Projects
    proj_result = await db.execute(
        select(Project).where(Project.user_id == current_user.id)
    )
    for p in proj_result.scalars().all():
        if p.start_date and sd <= p.start_date <= ed:
            events.append({
                "type": "project", "date": str(p.start_date), "id": p.id,
                "title": f"🚀 Project: {p.name}", "summary": p.description or "",
                "status": p.status.value if hasattr(p.status, 'value') else p.status,
                "color": p.color,
            })

    # Interactions (Grouped by Date)
    int_result = await db.execute(
        select(Interaction).where(
            and_(Interaction.user_id == current_user.id, Interaction.date >= sd, Interaction.date <= ed)
        ).options(selectinload(Interaction.person))
    )
    interactions = int_result.scalars().all()
    
    # Group by date
    interactions_by_date = {}
    for i in interactions:
        date_str = str(i.date)
        if date_str not in interactions_by_date:
            interactions_by_date[date_str] = []
        interactions_by_date[date_str].append(i)
        
    for date_str, int_list in interactions_by_date.items():
        if len(int_list) == 1:
            i = int_list[0]
            person_name = i.person.name if i.person else "Unknown"
            events.append({
                "type": "interaction", "date": date_str, "id": i.id,
                "title": f"💬 Interaction with {person_name}", 
                "summary": i.description or "",
                "tone": i.emotional_tone, "context": i.context,
                "person_id": i.person_id,
            })
        else:
            # Consolidate multiple interactions
            names = [i.person.name for i in int_list if i.person]
            # remove duplicates but preserve order
            unique_names = list(dict.fromkeys(names))
            names_str = ", ".join(unique_names)
            
            summary_parts = []
            for i in int_list:
                person = i.person.name if i.person else "Unknown"
                desc = i.description or "No details"
                summary_parts.append(f"- **{person}**: {desc}")
                
            events.append({
                "type": "interaction", "date": date_str, "id": f"group_{date_str}",
                "title": f"💬 {len(int_list)} Interactions ({names_str})",
                "summary": "\n".join(summary_parts),
                "tone": "mixed", 
                "context": "multiple",
                "person_id": None, # it's a grouped event
            })

    events.sort(key=lambda e: e["date"])
    return events


async def _generate_chapters_for_user(user_id: int, db: AsyncSession, current_log_count: int):
    from backend.llm_client import chat, extract_json
    import json
    
    # Get previous chapters if they exist to maintain continuity
    cache_result = await db.execute(
        select(CachedChapter).where(CachedChapter.user_id == user_id).order_by(desc(CachedChapter.created_at)).limit(1)
    )
    cached = cache_result.scalar_one_or_none()
    past_chapters_context = ""
    if cached and cached.chapters_json:
        past_chapters_context = f"\nFor continuity, here are the PREVIOUSLY generated chapters. Your task is to PRESERVE these past chapters (you may refine their names or summaries slightly if new context sheds light on them, but do not completely rewrite the past). Only create new chapters or significantly modify the most recent/ongoing chapter to reflect the new events:\n{json.dumps(cached.chapters_json, indent=2)}\n"

    logs_result = await db.execute(
        select(DailyLog).where(DailyLog.user_id == user_id).order_by(DailyLog.date)
    )
    logs = logs_result.scalars().all()

    # Build concise timeline — keep entries SHORT to avoid context overflow
    log_summaries = []
    for log in logs:
        entry = f"[{log.date}]"
        if log.mood_score:
            entry += f" M:{log.mood_score}"
        if log.content:
            entry += f" {log.content[:60]}"
        if log.tags:
            entry += f" #{','.join(log.tags[:3])}"
        log_summaries.append(entry)

    # Add goals and decisions
    goals_result = await db.execute(select(Goal).where(Goal.user_id == user_id).order_by(Goal.created_at))
    for g in goals_result.scalars().all():
        if g.created_at:
            log_summaries.append(f"[{g.created_at.date()}] GOAL: {g.title}")

    dec_result = await db.execute(select(Decision).where(Decision.user_id == user_id).order_by(Decision.date))
    for d in dec_result.scalars().all():
        log_summaries.append(f"[{d.date}] DECISION: {d.title}")

    log_summaries.sort()
    timeline_text = "\n".join(log_summaries[-100:])  # max 100 entries to fit context

    system_prompt = f"""You are a life coach AI that analyzes personal timelines and groups them into meaningful life chapters.
Each chapter should represent a distinct time period or phase in the person's life.{past_chapters_context}
Return a JSON array of chapters, ordered chronologically. Each chapter should have:
- "title": A beautiful, poetic, and meaningful name for the chapter
- "start_date": The approximate start date (YYYY-MM-DD)
- "end_date": The approximate end date (YYYY-MM-DD), or null if ongoing
- "summary": A 2-3 sentence summary of what defined this chapter
- "themes": An array of 2-4 key themes
- "mood": The overall emotional tone ("positive", "challenging", "transformative", "neutral", "mixed")

Return ONLY the JSON array, no explanation."""

    user_prompt = f"Here is my personal timeline. Please analyze it and group it into meaningful life chapters:\n\n{timeline_text}"

    raw = await chat(
        system_prompt, 
        user_prompt, 
        max_tokens=4096, 
        enable_thinking=True,
        model="openai/gpt-oss-20b"
    )
    chapters = extract_json(raw)
    if chapters is None:
        chapters = []

    # Save to cache
    new_cache = CachedChapter(
        user_id=user_id,
        chapters_json=chapters,
        log_count=current_log_count,
    )
    db.add(new_cache)
    logger.info("[chapters] Generated and cached %d chapters", len(chapters))

    return chapters


async def _background_generate_chapters(user_id: int):
    from backend.database import async_session
    async with async_session() as db:
        try:
            log_count_result = await db.execute(select(func.count(DailyLog.id)).where(DailyLog.user_id == user_id))
            current_log_count = log_count_result.scalar() or 0
            if current_log_count > 0:
                await _generate_chapters_for_user(user_id, db, current_log_count)
        except Exception as e:
            logger.error("[chapters] Background LLM error: %s", e)


@app.get("/api/chapters")
async def get_chapters(
    force_refresh: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return cached life chapters, auto-regenerating every 10 days or when new logs appear."""
    from backend.llm_client import chat, extract_json

    # Count current logs
    log_count_result = await db.execute(
        select(func.count(DailyLog.id)).where(DailyLog.user_id == current_user.id)
    )
    current_log_count = log_count_result.scalar() or 0
    if current_log_count == 0:
        return []

    # Check cache: return if < 10 days old AND log count hasn't changed
    if not force_refresh:
        cache_result = await db.execute(
            select(CachedChapter)
            .where(CachedChapter.user_id == current_user.id)
            .order_by(desc(CachedChapter.created_at))
            .limit(1)
        )
        cached = cache_result.scalar_one_or_none()
        if cached:
            age = datetime.utcnow() - cached.created_at
            if age.days < 10 and cached.log_count == current_log_count:
                logger.info("[chapters] Returning cached chapters (age: %d days)", age.days)
                return cached.chapters_json

    # --- Need to (re-)generate ---
    try:
        chapters = await _generate_chapters_for_user(current_user.id, db, current_log_count)
        return chapters
    except Exception as e:
        logger.error("[chapters] LLM error: %s", e)
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/people/graph")
async def get_people_graph(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate nodes and links for a 3D relationship force graph."""
    # Fetch all people with interactions
    result = await db.execute(
        select(Person).where(Person.user_id == current_user.id)
        .options(selectinload(Person.interactions))
    )
    people = result.scalars().all()

    # Center node = the user
    nodes = [{
        "id": "user",
        "name": "You",
        "type": "self",
        "trust": 10,
        "energy": "energizing",
        "val": 20,  # node size
        "color": "#6366f1",
    }]

    links = []
    person_ids = set()

    def _classify_relationship(rel_type: str) -> str:
        """Map custom relationship types to canonical categories for coloring."""
        if not rel_type:
            return "other"
        rt = rel_type.lower()
        # Family
        if any(k in rt for k in ["mother", "father", "brother", "sister", "parent", "family", "mummy", "dad", "mom"]):
            return "family"
        # Partner / romantic
        if any(k in rt for k in ["girlfriend", "boyfriend", "partner", "wife", "husband", "ex-girlfriend", "ex-boyfriend", "ex"]):
            return "partner"
        # Close friend / best friend
        if any(k in rt for k in ["best friend", "very good friend", "close friend", "roommate"]):
            return "close_friend"
        # Colleague / manager / work
        if any(k in rt for k in ["colleague", "manager", "teammate", "flatmate", "coworker"]):
            return "colleague"
        # Mentor
        if "mentor" in rt:
            return "mentor"
        # Former / acquaintance
        if any(k in rt for k in ["former", "acquaintance"]):
            return "acquaintance"
        # Generic friend
        if "friend" in rt:
            return "friend"
        return "other"

    rel_colors = {
        "family": "#f43f5e",
        "partner": "#ec4899",
        "close_friend": "#8b5cf6",
        "friend": "#3b82f6",
        "colleague": "#06b6d4",
        "mentor": "#10b981",
        "acquaintance": "#6b7280",
        "other": "#a78bfa",
    }

    for p in people:
        interaction_count = len(p.interactions)
        # Calculate dynamic influence score based on interactions and trust
        influence = (p.trust_level / 10) * 0.4 + min(interaction_count / 20, 1.0) * 0.6

        # Color coding by relationship type (fuzzy matching)
        category = _classify_relationship(p.relationship_type)
        color = rel_colors.get(category, "#a78bfa")

        nodes.append({
            "id": f"p{p.id}",
            "name": p.name,
            "type": p.relationship_type or "other",
            "trust": p.trust_level,
            "energy": p.energy_exchange or "neutral",
            "influence": round(influence, 2),
            "interactions": interaction_count,
            "val": 5 + int(influence * 15),  # node size
            "color": color,
            "notes": p.notes,
            "known_since": str(p.known_since) if p.known_since else None,
        })
        person_ids.add(p.id)

        # Link from user to this person
        link_strength = p.trust_level / 10
        links.append({
            "source": "user",
            "target": f"p{p.id}",
            "value": round(link_strength, 2),
            "interactions": interaction_count,
            "type": p.relationship_type or "other",
        })

    # Look for shared interactions (people who interacted on the same day in the same context)
    for i, p1 in enumerate(people):
        for p2 in people[i+1:]:
            shared_dates = set(int.date for int in p1.interactions) & set(int.date for int in p2.interactions)
            if shared_dates:
                links.append({
                    "source": f"p{p1.id}",
                    "target": f"p{p2.id}",
                    "value": min(len(shared_dates) / 5, 1.0),
                    "interactions": len(shared_dates),
                    "type": "shared_context",
                })

    return {"nodes": nodes, "links": links}


# ═══════════════════════════════════════════════════════════════════════
#  MODULE 9: WEEKLY REVIEW
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/weekly-reviews", response_model=List[WeeklyReviewResponse])
async def get_weekly_reviews(
    limit: int = Query(default=12, le=52),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all weekly reviews, newest first."""
    result = await db.execute(
        select(WeeklyReview).where(WeeklyReview.user_id == current_user.id)
        .order_by(desc(WeeklyReview.week_start_date))
        .limit(limit)
    )
    return [WeeklyReviewResponse.model_validate(r) for r in result.scalars().all()]


@app.get("/api/weekly-reviews/{week_date}", response_model=Optional[WeeklyReviewResponse])
async def get_weekly_review(
    week_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific week's review."""
    result = await db.execute(
        select(WeeklyReview).where(
            and_(WeeklyReview.user_id == current_user.id, WeeklyReview.week_start_date == week_date)
        )
    )
    review = result.scalar_one_or_none()
    if review:
        return WeeklyReviewResponse.model_validate(review)
    return None


@app.post("/api/weekly-reviews/generate")
async def generate_weekly_review(
    req: WeeklyReviewGenerate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate an AI weekly review for a specific week."""
    import datetime as _dt
    week_start = req.week_start_date
    if not week_start:
        today = date.today()
        week_start = today - _dt.timedelta(days=today.weekday() + 7)  # Last Monday

    try:
        text, mood_avg, energy_avg = await gather_week_context(db, current_user.id, week_start)
        result = await WeeklyReviewAgent().run(
            text, db,
            user_id=current_user.id,
            week_start=week_start,
            mood_avg=mood_avg,
            energy_avg=energy_avg,
        )
        return result
    except Exception as exc:
        raise _nlp_error(exc)


# ═══════════════════════════════════════════════════════════════════════
#  MODULE 10: AI AGENT SUITE
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/agents/insights", response_model=List[AgentInsightResponse])
async def get_agent_insights(
    agent_type: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get stored agent insights, optionally filtered by agent type."""
    query = select(AgentInsight).where(AgentInsight.user_id == current_user.id)
    if agent_type:
        query = query.where(AgentInsight.agent_type == agent_type)
    query = query.order_by(desc(AgentInsight.created_at)).limit(limit)
    result = await db.execute(query)
    return [AgentInsightResponse.model_validate(i) for i in result.scalars().all()]


@app.get("/api/agents/insights/{insight_id}", response_model=AgentInsightResponse)
async def get_agent_insight(
    insight_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific agent insight."""
    result = await db.execute(
        select(AgentInsight).where(
            and_(AgentInsight.id == insight_id, AgentInsight.user_id == current_user.id)
        )
    )
    insight = result.scalar_one_or_none()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return AgentInsightResponse.model_validate(insight)


@app.post("/api/agents/run")
async def run_agent(
    req: AgentRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run a specific AI agent to generate new insights."""
    import datetime as _dt

    if req.agent_type not in AGENT_MAP:
        raise HTTPException(status_code=400, detail=f"Unknown agent type: {req.agent_type}")

    end = req.date_range_end or date.today()
    start = req.date_range_start or (end - _dt.timedelta(days=30))

    try:
        prompt_text = await build_agent_prompt(
            req.agent_type, db, current_user.id, start, end,
            insight_period=req.insight_period,
        )
        agent_class = AGENT_MAP[req.agent_type]
        result = await agent_class().run(
            prompt_text, db,
            user_id=current_user.id,
            start=start,
            end=end,
            insight_period=req.insight_period,
        )
        return result
    except Exception as exc:
        raise _nlp_error(exc)


@app.get("/api/agents/types")
async def get_agent_types():
    """List all available agent types with descriptions."""
    return [
        {"id": "behavioral", "name": "Behavioral Agent", "icon": "🔄", "description": "Analyzes habits, routines, and behavioral patterns"},
        {"id": "psychological", "name": "Psychological Agent", "icon": "🧠", "description": "Examines emotional trends, stress, and mental well-being"},
        {"id": "financial", "name": "Financial Agent", "icon": "💰", "description": "Reviews financial decisions, career trajectory, and money patterns"},
        {"id": "relationship", "name": "Relationship Agent", "icon": "💞", "description": "Evaluates social dynamics, connection health, and interaction patterns"},
        {"id": "decision_audit", "name": "Decision Audit Agent", "icon": "⚖️", "description": "Audits past decisions, identifies biases, and reviews outcomes"},
        {"id": "predictive", "name": "Predictive Agent", "icon": "🔮", "description": "Makes informed predictions about trends and upcoming challenges"},
        {"id": "contradiction", "name": "Contradiction Agent", "icon": "⚡", "description": "Detects misalignments between stated goals and actual behavior"},
        {"id": "life_pattern", "name": "Life Pattern Agent", "icon": "🌊", "description": "Identifies cross-domain patterns, cycles, and meta-themes"},
    ]


# ═══════════════════════════════════════════════════════════════════════
#  MODULE 11: NETWORK EVOLUTION, CONVERSATION MEMORY, ADVANCED VIZ
# ═══════════════════════════════════════════════════════════════════════

@app.get("/api/people/graph/evolution")
async def get_network_evolution(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    interval: str = Query(default="week", regex="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get network evolution data — snapshots of the relationship graph over time.
    Combines both formal Interaction records and DailyLog people_mentioned fields.
    """
    import datetime as _dt

    ed = end_date or date.today()
    sd = start_date or (ed - _dt.timedelta(days=180))

    # Get all people
    people_result = await db.execute(
        select(Person).where(Person.user_id == current_user.id)
    )
    people = people_result.scalars().all()
    people_by_name = {p.name.lower(): p.id for p in people}

    # Get all formal interactions in range
    int_result = await db.execute(
        select(Interaction).where(
            and_(Interaction.user_id == current_user.id, Interaction.date >= sd, Interaction.date <= ed)
        ).order_by(Interaction.date)
    )
    all_interactions = int_result.scalars().all()

    # Also get daily logs that mention people (via people_mentioned or content)
    logs_result = await db.execute(
        select(DailyLog).where(
            and_(DailyLog.user_id == current_user.id, DailyLog.date >= sd, DailyLog.date <= ed)
        ).order_by(DailyLog.date)
    )
    all_logs = logs_result.scalars().all()

    # Build a list of (date, person_id) tuples from both sources
    activity_events = []
    for i in all_interactions:
        activity_events.append((i.date, i.person_id))
    for log in all_logs:
        # Check people_mentioned field (list of names or ids)
        mentioned = log.people_mentioned or []
        for ref in mentioned:
            if isinstance(ref, int):
                activity_events.append((log.date, ref))
            elif isinstance(ref, str):
                pid = people_by_name.get(ref.lower())
                if pid:
                    activity_events.append((log.date, pid))
        # Also check content for name mentions
        if log.content:
            content_lower = log.content.lower()
            for p in people:
                if p.name.lower() in content_lower:
                    activity_events.append((log.date, p.id))

    # Build time buckets
    snapshots = []
    current = sd
    if interval == "day":
        delta = _dt.timedelta(days=1)
    elif interval == "week":
        delta = _dt.timedelta(weeks=1)
    else:
        delta = _dt.timedelta(days=30)

    while current <= ed:
        bucket_end = min(current + delta, ed)
        bucket_events = [(d, pid) for d, pid in activity_events if current <= d <= bucket_end]

        # Count interactions per person in this bucket (deduplicate per person per day)
        person_activity = {}
        seen = set()
        for d, pid in bucket_events:
            key = (d, pid)
            if key not in seen:
                seen.add(key)
                person_activity[pid] = person_activity.get(pid, 0) + 1

        nodes = []
        for p in people:
            activity = person_activity.get(p.id, 0)
            if activity > 0 or (p.known_since and p.known_since <= bucket_end):
                nodes.append({
                    "id": f"p{p.id}",
                    "name": p.name,
                    "type": p.relationship_type or "other",
                    "activity": activity,
                    "trust": p.trust_level,
                })

        links = []
        for pid, count in person_activity.items():
            links.append({
                "source": "user",
                "target": f"p{pid}",
                "value": min(count / 5, 1.0),
                "interactions": count,
            })

        snapshots.append({
            "date": str(current),
            "date_end": str(bucket_end),
            "nodes": nodes,
            "links": links,
            "total_interactions": sum(person_activity.values()),
        })
        current = bucket_end + _dt.timedelta(days=1)

    return {"snapshots": snapshots, "people": [{"id": p.id, "name": p.name, "type": p.relationship_type} for p in people]}


@app.post("/api/conversation-briefs/generate", response_model=dict)
async def generate_conversation_brief(
    req: ConversationBriefRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a pre-meeting brief for a specific person."""
    try:
        context = await gather_person_context(db, current_user.id, req.person_id)
        result = await ConversationBriefAgent().run(
            context, db,
            user_id=current_user.id,
            person_id=req.person_id,
        )
        return result
    except Exception as exc:
        raise _nlp_error(exc)


@app.get("/api/conversation-briefs/{person_id}", response_model=List[ConversationBriefResponse])
async def get_conversation_briefs(
    person_id: int,
    limit: int = Query(default=5, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get conversation briefs for a specific person."""
    result = await db.execute(
        select(ConversationBrief).where(
            and_(ConversationBrief.user_id == current_user.id, ConversationBrief.person_id == person_id)
        ).order_by(desc(ConversationBrief.created_at)).limit(limit)
    )
    return [ConversationBriefResponse.model_validate(b) for b in result.scalars().all()]


@app.get("/api/visualizations/mood-energy")
async def get_mood_energy_viz(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get mood and energy data optimized for D3.js visualizations."""
    import datetime as _dt
    ed = end_date or date.today()
    sd = start_date or (ed - _dt.timedelta(days=90))

    result = await db.execute(
        select(DailyLog).where(
            and_(DailyLog.user_id == current_user.id, DailyLog.date >= sd, DailyLog.date <= ed)
        ).order_by(DailyLog.date)
    )
    logs = result.scalars().all()

    return {
        "data": [
            {
                "date": str(log.date),
                "mood": log.mood_score,
                "energy": log.energy_level,
                "emotions": log.emotions or [],
                "tags": log.tags or [],
            }
            for log in logs if log.mood_score or log.energy_level
        ],
        "range": {"start": str(sd), "end": str(ed)},
    }


@app.get("/api/visualizations/life-areas-history")
async def get_life_areas_history(
    weeks: int = Query(default=24, le=52),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get life area scores over time for D3.js area/line charts."""
    import datetime as _dt
    cutoff = date.today() - _dt.timedelta(weeks=weeks)

    result = await db.execute(
        select(LifeAreaScore).where(
            and_(LifeAreaScore.user_id == current_user.id, LifeAreaScore.week_start_date >= cutoff)
        ).order_by(LifeAreaScore.week_start_date)
    )
    scores = result.scalars().all()

    # Group by week
    weeks_data = {}
    for s in scores:
        week_key = str(s.week_start_date)
        if week_key not in weeks_data:
            weeks_data[week_key] = {"date": week_key}
        area_name = s.area.value if hasattr(s.area, 'value') else s.area
        weeks_data[week_key][area_name] = s.score

    return {"data": list(weeks_data.values()), "areas": [a.value for a in LifeArea]}


@app.get("/api/visualizations/activity-heatmap")
async def get_activity_heatmap(
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get daily activity data for a GitHub-style contribution heatmap."""
    import datetime as _dt
    target_year = year or date.today().year
    start = date(target_year, 1, 1)
    end = date(target_year, 12, 31)

    result = await db.execute(
        select(DailyLog.date, DailyLog.mood_score, DailyLog.energy_level).where(
            and_(DailyLog.user_id == current_user.id, DailyLog.date >= start, DailyLog.date <= end)
        ).order_by(DailyLog.date)
    )
    rows = result.all()

    return {
        "data": [
            {"date": str(r[0]), "mood": r[1], "energy": r[2], "logged": True}
            for r in rows
        ],
        "year": target_year,
    }


# ═══════════════════════════════════════════════════════════════════════
#  RAG: VECTOR STORE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

@app.post("/api/rag/index")
async def rag_index(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """(Re)index all user data into the vector store for RAG retrieval."""
    counts = await vector_store.index_user_data(db, current_user.id)
    return {"status": "indexed", "counts": counts}


@app.get("/api/rag/status")
async def rag_status(
    current_user: User = Depends(get_current_user)
):
    """Get vector store stats for the current user."""
    stats = vector_store.get_collection_stats(current_user.id)
    return stats


@app.get("/api/rag/search")
async def rag_search(
    q: str = Query(..., min_length=2, description="Search query"),
    n: int = Query(default=10, le=50),
    doc_type: Optional[str] = Query(default=None, description="Filter: daily_log, decision, interaction, goal"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: User = Depends(get_current_user),
):
    """Semantic search across the user's memory store."""
    results = vector_store.semantic_search(
        user_id=current_user.id,
        query=q,
        n_results=n,
        doc_type=doc_type,
        date_from=date_from,
        date_to=date_to,
    )
    return {"query": q, "count": len(results), "results": results}


# ═══════════════════════════════════════════════════════════════════════
#  KNOWLEDGE GRAPH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

@app.post("/api/knowledge/extract")
async def extract_facts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract knowledge facts from all user logs using LLM."""
    from backend.knowledge_graph import extract_facts_from_all_logs
    counts = await extract_facts_from_all_logs(db, current_user.id)
    return {"status": "extracted", "facts_created": counts}


@app.get("/api/knowledge/facts")
async def get_knowledge_facts(
    category: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get extracted knowledge facts, optionally filtered by category."""
    from backend.models import KnowledgeFact
    query = select(KnowledgeFact).where(KnowledgeFact.user_id == current_user.id)
    if category:
        query = query.where(KnowledgeFact.category == category)
    query = query.order_by(desc(KnowledgeFact.confidence)).limit(limit)
    result = await db.execute(query)
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
            "created_at": str(f.created_at),
        }
        for f in facts
    ]


@app.get("/api/knowledge/query")
async def query_knowledge(
    q: str = Query(..., min_length=2, description="Natural language query"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Query the knowledge graph for relevant facts."""
    from backend.knowledge_graph import query_facts
    facts = await query_facts(db, current_user.id, q)
    return {"query": q, "count": len(facts), "facts": facts}


