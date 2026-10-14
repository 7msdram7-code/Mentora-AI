# MistakeMirror — Implementation Plan & Specification Update

## Executive Overview
MistakeMirror is an AI-powered educational tutor prototype that diagnoses **why** a student answers incorrectly, traces the error backwards through a prerequisite dependency graph to uncover the root-cause misconception, challenges the false mental model using targeted counter-examples, and guides the student through bilingual Socratic teach-back and spaced-repetition revision.

---

## 1. Architecture & Directory Structure

```
mistakemirror/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py              # Environment variables & provider settings (Gemini, Anthropic, Ollama, Mock)
│   │   ├── database.py            # SQLAlchemy engine, sessionmaker, and Base
│   │   ├── models.py              # Subject, Topic, TopicPrerequisite, Question, Attempt, Mastery, Teachback
│   │   ├── schemas.py             # Pydantic v2 validation models
│   │   ├── seed.py                # Data Structures — Hashing (9 topics, 18+ questions) & Simple Maths
│   │   ├── mastery.py             # Deterministic Bayesian mastery engine & status thresholds
│   │   ├── graph.py               # DFS prerequisite traversal, cycle detection, path tracing
│   │   ├── extractor.py           # Document extraction (PDF, PPTX, Image/OCR) & draft generator
│   │   ├── llm.py                 # Multi-provider LLM client (Ollama, Gemini, Anthropic, Mock fallback)
│   │   ├── main.py                # FastAPI application & CORS setup
│   │   └── routers/
│   │       ├── health.py          # GET /api/health
│   │       ├── subjects.py        # GET /api/subjects, GET /api/subjects/{id}/graph
│   │       ├── questions.py       # GET /api/questions/next
│   │       ├── answers.py         # POST /api/answers (idempotent submission, diagnosis, mastery update)
│   │       ├── notes.py           # POST /api/notes (draft generation), POST /api/notes/commit
│   │       ├── teachback.py       # POST /api/teachback/start, /message, /finish
│   │       ├── revision.py        # GET /api/revision-plan
│   │       ├── progress.py        # GET /api/progress (mastery telemetry & KPIs)
│   │       └── demo.py            # POST /api/demo/reset, POST /api/demo/load
│   └── tests/
│       ├── conftest.py            # In-memory SQLite session with StaticPool
│       ├── test_mastery.py        # Unit tests for Bayesian updates, careless slip, status boundaries
│       ├── test_graph.py          # Unit tests for DFS, cycle detection, prerequisite chaining
│       ├── test_api.py            # API integration tests for demo flow, idempotency, counter-examples
│       └── test_llm_and_notes.py  # Tests for offline LLM fallback, Ollama config, notes draft
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js          # Fetch API client for all backend endpoints
│   │   ├── components/
│   │   │   ├── Sidebar.jsx        # Navigation (Notes, Practice, Root-Cause Map, Teach-back, Revision, Progress)
│   │   │   ├── Header.jsx         # Bilingual English/Tamil switch, active root cause indicator
│   │   │   ├── CustomTopicNode.jsx# React Flow node with mastery bar, status, and root-cause pulsing ring
│   │   │   ├── PracticeScreen.jsx # Question display, timer, voice think-aloud, counter-example flow
│   │   │   ├── RootCauseMapScreen.jsx # React Flow prerequisite DAG visualizer
│   │   │   ├── TeachBackScreen.jsx# Feynman Socratic chat with AI junior, voice input & audio read-aloud
│   │   │   ├── RevisionScreen.jsx # 1-3-7 day spaced-repetition revision cards
│   │   │   ├── ProgressScreen.jsx # Analytics KPIs, topic mastery matrix, misconception taxonomy
│   │   │   └── NotesScreen.jsx    # Notes upload, stage pipeline, editable draft review (topics, prereqs, Qs)
│   │   ├── App.jsx                # Screen switcher and shared application state
│   │   ├── index.css              # Tailwind utilities and dark educational theme
│   │   └── main.jsx               # React DOM entry point
├── IMPLEMENTATION_PLAN.md
├── README.md
├── .env.example
└── verify_flow.py                 # Automated end-to-end verification script
```

---

## 2. Database Schema & Models

### Relational Entities
1. **Subject**: `id` (PK, string), `name`, `description`, `created_at`.
2. **Topic**: `id` (PK, stable string identifier), `subject_id` (FK), `name`, `pages` (JSON integer array).
3. **TopicPrerequisite**: `topic_id` (FK Topic), `prerequisite_id` (FK Topic), composite PK (`topic_id`, `prerequisite_id`).
4. **Question**: `id` (PK, int), `topic_id` (FK), `type` ("mcq" | "short"), `text`, `options` (JSON array with `id`, `text`, `mistake_tag`, `misconception`, `root_topic`), `correct_option`, `difficulty`, `is_counterexample`.
5. **Attempt**: `id` (PK, int), `student_id`, `question_id` (FK), `answer`, `correct`, `time_sec`, `mistake_type`, `root_topic`, `created_at`, `parent_attempt_id` (FK Attempt, nullable).
6. **Mastery**: `student_id` (composite PK), `topic_id` (composite PK), `p` (float, $0.0 \le p \le 1.0$), `status` ("RED" | "AMBER" | "GREEN"), `diagnostic_role` ("ROOT CAUSE" | "SYMPTOM" | "OK"), `updated_at`.
7. **TeachbackSession** & **TeachbackMessage**: Socratic session records with scoring and transcripts.

---

## 3. Seed Data: Data Structures — Hashing (Primary Scripted Demo)

### 9 Topics & Prerequisite Hierarchy
| Topic ID | Name | Prerequisites | Source Pages |
| :--- | :--- | :--- | :--- |
| `arrays` | Arrays | *None* | [1, 2] |
| `modulo` | Modulo Arithmetic | *None* | [3, 4] |
| `linked_lists` | Linked Lists | *None* | [5, 6] |
| `hash_function` | Hash Functions | `modulo`, `arrays` | [7, 8] |
| `hash_table` | Hash Tables | `hash_function` | [9, 10] |
| `chaining` | Separate Chaining | `hash_table`, `linked_lists` | [11, 12] |
| `linear_probing` | Linear Probing | `hash_table` | [13, 14] |
| `load_factor` | Load Factor | `hash_table` | [15, 16] |
| `rehashing` | Rehashing | `load_factor` | [17, 18] |

### Scripted Demo Question (ID: 1)
- **Tested Topic**: `hash_table`
- **Question Text**: *"Insert key 25 into a table of size 10 using $h(k) = k \pmod{10}$. Which index?"*
- **Options**:
  - `5`: Correct option.
  - `25`: Mistake tag `"forgot_mod_wrap"`, root topic `"modulo"`, misconception: *"You answered 25 because you treated the hash value as the original key. The root cause is misunderstanding modulo wrap-around. Let's test that belief with another example."*
  - `2`: Mistake tag `"used_first_digit"`, root topic `"hash_function"`, misconception: *"You extracted the first digit instead of calculating the modulo remainder."*
  - `0`: Mistake tag `"used_last_two_digits_wrongly"`, root topic `"hash_function"`, misconception: *"You evaluated the boundary without calculating the remainder."*

### Scripted Counter-Example (ID: 101)
- **Topic**: `modulo`
- **Question Text**: *"What is $25 \pmod{10}$? Calculate the integer remainder when 25 is divided by 10."*
- **Options**:
  - `5`: Correct ($25 = 2 \times 10 + 5$, remainder 5).
  - `25`: Incorrect (remainder cannot be equal to or greater than the divisor 10).
  - `2`: Incorrect (2 is the quotient, not the remainder).

---

## 4. Mastery Engine & Diagnostic State Separation

### Status vs. Diagnostic Labels
- **Probability Mastery Score ($p$)**: Continuous metric in $[0.0, 1.0]$.
  - $p < 0.4 \implies \text{RED}$
  - $0.4 \le p < 0.7 \implies \text{AMBER}$
  - $p \ge 0.7 \implies \text{GREEN}$
- **Diagnostic Role**:
  - `ROOT CAUSE`: Specifically applied to the root topic identified in the error diagnosis (highlighted in red with a pulsing ring on the Root-Cause Map).
  - `SYMPTOM`: Applied to the directly tested topic on an incorrect answer.
  - `OK`: Default operational baseline.

### Deterministic Update Rules
1. **Initial State**: All 9 topics initialize at $p = 0.50$ (Status: `AMBER`, Role: `OK`).
2. **Correct Answer**:
   $$p_{\text{new}} = p_{\text{old}} + (1 - p_{\text{old}}) \times 0.25$$
3. **Wrong Answer on Tested Topic**:
   $$p_{\text{tested, new}} = p_{\text{tested, old}} \times 0.80$$
   Mark tested topic role as `SYMPTOM`.
4. **Root Cause Propagation**:
   If the chosen option or diagnosis indicates root topic $R \ne \text{tested}$:
   $$p_{\text{root, new}} = p_{\text{root, old}} \times 0.60$$
   Mark root topic role as `ROOT CAUSE` (Status becomes `RED` when $0.50 \times 0.60 = 0.30$).
5. **Careless Slip Precedence**:
   If mistake type is `"careless_slip"` OR (answer submitted in $< 5.0$ seconds on a previously mastered topic with $p \ge 0.70$):
   $$p_{\text{tested, new}} = \max(0.0, p_{\text{tested, old}} - 0.05)$$
   **No propagation to prerequisites**; preserve diagnostic history.
6. **Counter-Example Recovery**:
   When answering counter-example on root topic (`modulo`) correctly:
   $$p = 0.30 + (1 - 0.30) \times 0.25 = 0.475$$
   Status recalculates to `AMBER` ($0.475$). Modulo is **not** artificially forced to green; its status strictly follows its calculated mastery score.
7. **Idempotency Guard**:
   Submissions matching student ID, question ID, and answer within a 5-second window return the current mastery state without reapplying penalties.

---

## 5. Notes Review & Course Draft Architecture

```
User uploads PDF/PPTX/Image
          │
          ▼
Extractor Stage Pipeline (Reading -> Finding Topics -> Building Prereqs -> Writing Qs)
          │
          ▼
Interactive Draft Review Screen (Editable topics, prerequisites, source pages, and questions)
          │
          ├── User edits topic names / prerequisites / questions / pages
          │
          ▼
User clicks "Save to Course Catalog"
          │
          ▼
POST /api/notes/commit -> DAG validation (Cycle detection via DFS) -> SQLite Persistence
```

### OCR Support for Images
- When an image (PNG, JPG) is uploaded:
  - Attempt extraction with `pytesseract` or `EasyOCR`.
  - If neither OCR engine/binary is available on the system: return a clear, user-friendly HTTP 400 error: *"OCR engine is unavailable on this system. Please upload a supported PDF or PPTX document instead, or configure Tesseract/EasyOCR."*

---

## 6. Open-Source, Offline, and Provider-Independent AI

### Configuration (`backend/app/config.py`)
- `USE_MOCK_LLM=true` (default for offline, deterministic hackathon evaluation).
- `LLM_PROVIDER`: supports `"gemini"`, `"anthropic"`, and `"ollama"`.
- `OLLAMA_BASE_URL`: defaults to `"http://localhost:11434"`.
- `OLLAMA_MODEL`: defaults to `"llama3.2"`.

### Reliability Protocol
1. **Pydantic Validation**: All LLM JSON responses parsed into Pydantic models (`DiagnosisOutput`, `CounterExampleOutput`, etc.).
2. **Single Retry**: If first LLM call fails or returns unparseable output, retry once.
3. **Deterministic Fallback**: If retry fails, or in offline mock mode, use high-fidelity deterministic responses.
4. **Graph Validation of Root Topics**: Never blindly trust an LLM-generated root topic ID. It must exist in the database and be reachable as a prerequisite in the topic graph; otherwise fallback to the tested topic ID.

---

## 7. Implementation Phases & Verification Strategy

### Six Phases
1. **Phase 1: Project Setup & Core Models** (SQLAlchemy models, Pydantic schemas, config).
2. **Phase 2: Prerequisite Graph & Mastery Engine** (DFS traversal, cycle detection, deterministic Bayesian updates).
3. **Phase 3: Seed Data & Question Repository** (9 Hashing topics, 18+ questions, scripted Q1, Simple Maths preservation).
4. **Phase 4: Multi-Provider LLM Wrapper & Document Extractor** (Ollama support, offline mock fallbacks, OCR detection, Notes draft generation).
5. **Phase 5: API Endpoints & Idempotency** (All 9 routers tested with pytest).
6. **Phase 6: Frontend Experience & Browser Verification** (Sidebar with Progress, Voice input, Root-Cause Map, Teach-back, Spaced Revision, Notes draft editor).

### Verification Checklist
- [x] Run `pytest` on all backend test suites (`test_mastery.py`, `test_graph.py`, `test_api.py`, `test_llm_and_notes.py`).
- [x] Rebuild frontend with `npm.cmd run build` to verify zero compile or bundling errors.
- [x] Execute end-to-end Python test `verify_flow.py` covering the complete demo flow.
- [x] Test live in browser on `http://localhost:5173` through wrong answer diagnosis $\to$ red root-cause highlight $\to$ counter-example recovery $\to$ teach-back $\to$ revision plan $\to$ progress dashboard.
