# Personal Life Intelligence System (PLIS) - Deep Project Flow

This functional flow document describes exactly how data moves across the PLIS application stack, from raw frontend user input down into the LLM orchestration logic.

---

## 1. System Initialization & Authentication

### 1.1 Local Server Startup (`run.bat`)

1. Validates Conda dependencies and activates the explicitly configured environment.
2. Initializes Uvicorn running `backend.api:app` asynchronously across port `8000`.
3. In `models.py`, `SQLAlchemy` uses `aiosqlite` to verify if `data/plis.db` exists. If not, it executes a `metadata.create_all` hook to generate all mapped schemas (`DailyLog`, `Person`, etc.).
4. Spins up a corresponding Vite development server orchestrating `App.jsx` on port `5173`.

### 1.2 Authentication Lifecycle

1. The user inputs credentials via `Login.jsx` or `Register.jsx`.
2. `api.js` fires a POST to `/api/auth/register` (or `/login`).
3. `auth.py` hashes passwords utilizing `Passlib` with `bcrypt`.
4. Successful validation generates an explicit JWT token (`Algorithm: HS256`) set to expire according to `config.yaml` guidelines.
5. The frontend `App.jsx` catches the token, assigns it centrally to the `api` interceptor, and conditionally triggers the `Dashboard.jsx` routing.

---

## 2. Core Operational Modules

### 2.1 The Daily Logging Flow (`NLPDailyLogRequest`)

1. **Frontend**: The user opens `DailyLog.jsx`. They enter a rich text journal log and attach photo files.
2. **Transfer**: `Photos` are bundled as `multipart/form-data`, while JSON payloads (`content`, `mood_score`, `energy_level`) are simultaneously dispatched.
3. **Storage**: The `api.py` router intercepts the photos. Before Database commit, it writes the binaries to `data/uploads/` generating UUID file paths.
4. **NLP Abstraction**: If the user didn't manually tag the log, an asynchronous request is fired to the *NLP route*. The application uses `Qwen` (via `LM Studio/Ollama`) to parse the raw multi-paragraph journal text to automatically extract `["work", "family"]` tags, `emotions=[\"anxious\", \"grateful\"]`, and map explicit IDs to `people_mentioned` arrays.
5. **Commit**: The fully formed schema is pushed to SQLite as a `DailyLog` record.

### 2.2 Deep Interaction Topology

1. A user logs a new relationship in `People.jsx` (mapping a `PersonCreate` schema into SQLite, assigning a base `trust_level=5`).
2. When the user journals ("Had coffee with Alex, was draining"), the NLP parser implicitly logs an `Interaction` associated with `Person`.
3. The `InteractionCreate` schema tracks `emotional_tone` ("draining") and `energy_exchange` ("negative"), committing this to the ledger.
4. **Rendering**: `RelationshipGraph.jsx` pulls the full network topography from `/api/people` and plots 3D spatial nodes. Distances and clustering are dynamically governed by the relative `influence_score` and `trust_level` of interconnected user IDs.

### 2.3 Productivity & Intentionality Tracks

- **Projects/Tasks**: Handled via standard REST CRUD via `Projects.jsx`. Project hierarchies explicitly track `status` (Active, Completed) and feed directly into Dashboard widget analytics.
- **Goals/Decisions**: High-friction inputs where a user explicitly dictates hypotheses. For example, a user logs a `DecisionCreate` stating "Quit Job". Months later, they must log a corresponding `outcome_score`. These ledger items are entirely isolated for `DecisionAuditAgent` analysis.

---

## 3. The Orchestration Engine: AI Intelligence Agents

The most critical flow within PLIS operates outside the user input loop, acting as a background or periodic synthesis layer.

### 3.1 The Execution Pipeline

1. **Triggering**: Insights are requested manually via the `AgentHub.jsx` dispatch panel or automatically upon new week boundaries mapping `InsightPeriod.WEEKLY`.
2. **Context Compilation** (`_gather_data`): When an agent (e.g., `FinancialAgent`) is launched, the `api.py` endpoint constructs an `AsyncSession` to fetch all `DailyLogs`, `Goals`, and `LifeAreaScores` strictly within the requested `InsightPeriod` slice.
3. **Token Construction**: The backend translates all relational DB rows into dense Markdown/JSON context variables.
4. **LLM Invocation**: The `llm_client.run_agent()` method packages the agent-specific `system_prompt` plus the Context window and hits the local OpenAI-compatible inference server payload.
5. **Parsing (`parse()`)**: Raw string output from the LLM is expected explicitly in JSON. The agent's dedicated `.parse()` block catches this response, isolating anomalies, arrays of `struggles`/`wins`, and `severity` strings ("CRITICAL").
6. **DB Insert**: The parsed output is bundled into an `AgentInsight` SQLAlchemy object and committed.
7. **Frontend Hydration**: The user's `DashboardHome.jsx` makes its standard `GET /api/summary/` request. The backend sees new `AgentInsight` rows and pushes them as priority alerts to the top of the user's view hierarchy.

### 3.2 Cascading Knowledge (Meta-Agents)

The `LifePatternAgent` works distinctly differently. Instead of parsing base `DailyLog` rows, its context window consists purely of previous historical `AgentInsights` across quarters/years. This enforces a hierarchy of analysis where lower-level agents handle dense data, and higher-level agents synthesize overarching life narratives without overwhelming the LLM's context token limits.
