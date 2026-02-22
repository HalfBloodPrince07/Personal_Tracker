# Personal Life Intelligence System (PLIS) - Deep Architecture

## High-Level System Design

PLIS is an entirely self-hosted, private-first life logging and intelligence platform. Data storage and AI inference are kept strictly on the local machine to ensure total privacy for deeply personal data.

- **Frontend**: React (via Vite) + React Router + Axios, built with a heavy emphasis on dynamic, highly visual data representations (using D3.js / Recharts / vis-network).
- **Backend**: FastAPI (Python 3.10+) leveraging fully asynchronous endpoints for high throughput.
- **Database**: SQLite accessed asynchronously via `aiosqlite` and `SQLAlchemy 2.0`.
- **AI Processing**: Local LLM integrations (like Qwen via LM Studio or Ollama) wrapped in a centralized `llm_client.py`.

---

## 1. Deep Dive: Backend Architecture & ORM (`backend/`)

The backend follows a rigorous Domain-Driven Design pattern to separate database operations from API logic and AI processing.

### A. Database Models (`models.py`)

Built on SQLAlchemy 2.0 mapping schemas to the SQLite database `data/plis.db`:

- **`User`**: Core authentication model storing hashed passwords (`bcrypt`), mapped to all subsequent modules.
- **`DailyLog`**: Richards journals capturing text `content`, `mood_score` (1-10), `energy_level` (1-10), `tags` (JSON), `people_mentioned` (JSON), `emotions` (JSON), `decisions_made` (JSON), and `photo_urls` (JSON).
- **`Person` & `Interaction`**: Relationship management mapping network connections. Tracks `trust_level`, `influence_score`, and `energy_exchange`.
- **`Project` & `Task`**: Hierarchical productivity layers. Features statuses (Active/Paused/Completed) and Priority matrices.
- **`LifeAreaScore`**: A 1-10 longitudinal dataset mapping progression across 7 domains (`HEALTH`, `CAREER`, `FINANCES`, `RELATIONSHIPS`, `LEARNING`, `CREATIVITY`, `SPIRITUALITY`).
- **`Goal` & `GoalCheckIn`**: Intentionality trackers scoring daily alignment to macro-goals.
- **`Decision`**: An explicit audit ledger tracking `outcome_score` to objectively evaluate user decision-making over time.
- **`WeeklyReview`**: Caches AI-generated reflections, wins, struggles, and trend averages.
- **`AgentInsight` & `ConversationBrief`**: The output layer of the AI orchestrator, storing deep longitudinal analysis.

### B. Validation Schemas (`schemas.py`)

Employs Pydantic v2.0 for all I/O boundary validations. This ensures strictly typed inputs before reaching the database (e.g., verifying `mood_score` is explicitly constrained via `Field(..., ge=1, le=10)`).

### C. Server Layer (`api.py`)

- Defines standard REST CRUD endpoints for the models above.
- Manages strict JWT-based Authentication middleware.
- Serves uploaded media statically from `data/uploads/`.
- Routes specialized NLP endpoints (`/api/daily-log/nlp`) strictly isolating parsing workloads from generic CRUD updates.

---

## 2. Deep Dive: Agentic Intelligence Framework (`backend/agents/`)

The platform's true power lies in its modular AI analysis pipeline. Eight specialized subclasses inherit from `BaseAgent`, acting as distinct AI personas.

### The Agent Hierarchy

- **`BaseAgent`**: Orchestrates `_gather_data()` to pull logs, goals, and interactions by date ranges, packages them into optimized context windows, queries the `llm_client`, and extracts JSON payloads.
- **`BehavioralAgent`**: Analyzes daily habits, routine disruptions, and execution efficiency based on task completion and daily logs.
- **`PsychologicalAgent`**: Parses the emotional taxonomy of `DailyLog.emotions`, `mood_score`, and `energy_level` to identify stress triggers and emotional lifecycles.
- **`FinancialAgent`**: Cross-references career life-area scores with recorded financial goals and decisions.
- **`RelationshipAgent`**: Synthesizes `Interaction` frequency and `energy_exchange` to flag declining trust levels or toxic interpersonal loops.
- **`DecisionAuditAgent`**: A "hindsight" analyzer that compares recorded goals/decisions against their actual resolved `outcome_score`.
- **`PredictiveAgent`**: Uses historical datasets (e.g., looking at last month's mood drops after certain people interactions) to forecast future friction points.
- **`ContradictionAgent`**: Dedicated solely to finding hypocrisies (e.g., scoring `DailyLog` behaviors that explicitly conflict with active `Goal` alignments).
- **`LifePatternAgent`**: A meta-agent that synthesizes the insights of all other agents over quarterly and yearly `InsightPeriod` boundaries to generate macro-theses on user growth.

---

## 3. Deep Dive: Frontend Architecture (`frontend/src/`)

A React SPA tailored for heavy, dynamic data visualization layered atop a deeply custom, glassmorphic CSS design system `index.css`.

### A. Routing & State Management

- **`App.jsx`**: Central routing orchestrator via `react-router-dom`. Manages the top-level authentication state lock, halting navigation if `localStorage` tokens are invalidated.
- **`api.js`**: An Axios-backed service class mapping direct endpoints to backend FastAPI routes. Includes automatic token injection for `Authorization: Bearer <token>`.

### B. Specialized Component Pages (`src/pages/`)

Each page corresponds to a specific cognitive domain of the user's life:

1. **`DailyLog.jsx`**: A markdown-enabled rich text editor combined with a media upload interface. Maps to `NLPDailyLogRequest` for auto-tagging journal text.
2. **`RelationshipGraph.jsx` & `People.jsx`**: Employs interactive 3D physics engines (via `react-force-graph` or similar) to map `Interaction` and `Person` tables into spatial node clusters.
3. **`LifeAreas.jsx`**: A radar-chart heavy dashboard plotting `LifeAreaScore` temporal data to visualize macro-life balance.
4. **`Goals.jsx` & `Decisions.jsx`**: Kanban and ledger-based layouts for explicit intention tracking.
5. **`Timeline.jsx` & `Chapters.jsx`**: Linear historical aggregations overlaying Tasks, Decisions, and Agent Insights linearly.
6. **`AgentHub.jsx` & `AgentDetail.jsx`**: The interface for triggering, viewing, and resolving the generated JSON outputs from `backend/agents/insight_agents.py`.

### C. Design Implementation

- Bypasses heavy UI library bloat (like Tailwind or Material) in favor of performant, explicit CSS (`index.css`) optimized for high-FPS animations, dynamic gradients, and unified "dark mode" syntax essential for a premium feel.
