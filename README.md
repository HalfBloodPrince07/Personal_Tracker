# 🧠 Personal Life Intelligence System (PLIS)

## The Locally-Hosted, Agentic "Second Brain"

A private, highly dynamic, full-stack intelligence platform functioning as a longitudinal ledger for your life. PLIS tracks raw life inputs (journals, relationships, workflows, behaviors) and applies a suite of deeply analytical local AI Agents to synthesize actionable growth patterns.

> **Data Privacy Promise**: Your memories, financial goals, and social graphs are incredibly sensitive. PLIS enforces absolute privacy. **Zero data leaves your machine**. Database operations are 100% local SQLite files, and all LLM inferences execute through locally orchestrated endpoints (via LM Studio or Ollama).

---

## 🚀 Quick Start / Local Deployment

1. **Prerequisites**: Ensure you have Conda, Python 3.10+, Node.js (v18+), and a local LLM runner available.
2. **Execute Engine**:

```bash
# Windows - Activates backend dependencies, starts FastAPI servers, and runs Vite React clients.
run.bat
```

- **React Frontend**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)

---

## 📖 Deep Documentation

Explore the specific infrastructure powering PLIS:

- [Deep Architecture Overview](architecture.md) - Exact layouts of the React modules, Pydantic strict schemas, SQLAlchemy 2.0 ORM, and LLM implementations.
- [Project Data Flow Lifecycle](project_flow.md) - Granular request lifecycles detailing how user input transits through CRUD endpoints into LLM context mappings.

---

## 🏗️ Technical Architecture Stack

- **Frontend**: SPA built using React, Vite, and React Router Dom. Styling relies on a rigorously defined `index.css` structure capable of highly dynamic glassmorphism and real-time dashboard plotting (using specialized charting/graphing mechanics).
- **Backend Orchestrator**: High-performance, fully async Python server utilizing `FastAPI` to manage concurrency across high-volume log writes, auth boundaries, and simultaneous API requests.
- **Database Engine**: Persistent single-file `SQLite` operations managed via asynchronous `aiosqlite` and fully mapped with `SQLAlchemy`. Schema endpoints guarded by strict `Pydantic` v2 validations.
- **Security Logic**: Dedicated Passlib/Bcrypt instances handle database-level password hashing, paired with standardized Auth-Bearer JWT interception middleware to block stateless accesses.
- **Artificial Intelligence Subsystem**: Features a plug-and-play LLM orchestration wrapper (`llm_client.py`) allowing instant transitions between models running on `LM Studio` or `Ollama`.

---

## 🧩 Deep Functional Modules

PLIS divides human consciousness into nine distinct functional data verticals:

### 1. The Raw Input Layer

- **Rich Context Daily Logs**: Core journaling components supporting multi-paragraph markdown entries, dynamic mood/energy level sliders (1-10 mapping), direct Photo caching, and automated NLP-driven variable tagging.
- **Goals vs Reality Audits**: Separate ledger endpoints where aspirations meet historical fact mapping. Explicit `Decision` modeling assigns `outcome_scores` to enforce systemic humility natively.
- **Work & Projects Pipelines**: Granular tracking systems mirroring traditional Kanban flows mapped atop `project_id` relationship trees to isolate productivity timelines.

### 2. The Analytical Render Layer

- **Relationship Graph (Phase 2)**: Translates linear `Interaction` database rows mapping explicit `trust_values` and `emotional_tones` into deeply interactive, spatial 3D D3.js models visualizing network densities and toxic connection hotspots.
- **Life Area Radar Dashboard**: Employs historical datasets tracking `career`, `finances`, `relationships`, and `health`, plotting them asynchronously into rich radar-chart geometries to highlight neglected life quadrants.
- **Life Chapters/Timelines (Phase 2)**: Linear visualizations mapping the convergence of specific task completion timestamps over peak mood variances.

### 3. The Autonomous Agent Layer

*(Orchestrated via `backend/agents/`)*
A suite of 8 explicit LLM personas built to interrogate your stored data autonomously over specific `InsightPeriods` (weekly/monthly/annual). They trigger, analyze contexts, and write deep JSON analysis alerts back to your User Dashboard.  

- **Behavioral & Psychological Agents**: Cross-reference journal tags against rolling energy dips.
- **Financial & Relationship Agents**: Correlate goal checkpoints against social interaction exhaust.
- **Contradiction Agent**: Solely seeks out hypocrisies present in your inputs over time.
- **Life Pattern Meta-Agent**: The orchestrator of orchestrators, finding longitudinal meaning by reading the output produced by the lower-tier agents.

---

## 🔮 Future Roadmap & Improvements

PLIS is designed for ongoing evolution. For a deep look at the planned architectural upgrades—including Vector Databases (RAG) for infinite AI memory, Background Celery Processing, PWA conversion for mobile logging, and SQLCipher encryption at rest—please see the [Future Enhancements Document](future_improvements.md).
