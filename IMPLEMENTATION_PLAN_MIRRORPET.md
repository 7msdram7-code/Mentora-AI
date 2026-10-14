# MistakeMirror — MirrorPet Feature Implementation Plan

## Executive Overview
**MirrorPet** is an interactive, animated 3D companion that lives inside the student's personal Profile page in MistakeMirror. It is **completely separate** from the student's account avatar and identity. Students earn progress points through validated, meaningful learning activities (e.g., resolving misconceptions through counter-examples, explaining concepts in TeachBack AI, completing practice quizzes, and mastering prerequisite topics). They can spend points in a dedicated Wardrobe & Style Shop to customize their pet's 3D appearance with outfits, accessories, color themes, and magical visual effects (sparkles, glowing auras, particle trails).

---

## Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                            Student Learning Activities                            |
|  - Practice Quiz (+10)        - Misconception Recovery (+25)                      |
|  - TeachBack AI (+20)         - Notes Upload & Commit (+15)                       |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                        Backend Points Ledger (Idempotent)                         |
|  - PointTransaction (activity validation, anti-duplication, atomic balance)       |
|  - StudentProfile (points_balance, total_earned, level, study stats)              |
+-----------------------------------------------------------------------------------+
                                        |
                   +--------------------+--------------------+
                   |                                         |
                   v                                         v
+-------------------------------------+   +-------------------------------------+
|        Wardrobe & Style Shop        |   |       3D MirrorPet Arena (Profile)   |
|  - Outfits (Scholar, Cyber, Hero)   |   |  - Full-body Three.js pet character |
|  - Accessories (Hat, Glasses, etc.) |   |  - Real-time equipped cosmetics     |
|  - Effects (Aura, Sparkles, Trail)  |   |  - Breathing, blinking, idle float  |
|  - Milestone Unlocks (Mastery feats)|   |  - Click/tap interaction: wave/jump |
|  - Atomic Purchase Validation       |   |  - Off-screen pause optimization    |
+-------------------------------------+   +-------------------------------------+
```

---

## 1. Database Schema Extension (`backend/app/models.py`)

1. **`StudentProfile`**:
   - `student_id` (PK, string, e.g. "demo_student")
   - `display_name` (string, e.g. "Alex Chen")
   - `avatar_url` (string, student's personal account avatar, separate from pet)
   - `points_balance` (integer, non-negative, available to spend)
   - `total_earned_points` (integer, lifetime earnings for level calculation)
   - `level` (integer, derived from total points)
   - `created_at`, `updated_at`

2. **`PetProfile`**:
   - `id` (PK, integer)
   - `student_id` (FK to StudentProfile / string, unique)
   - `pet_type` (string, default "mirror_sprite")
   - `pet_name` (string, e.g. "Lumi", editable)
   - `color_theme` (string: "violet", "emerald", "cyan", "gold", "pink")
   - `equipped_outfit` (nullable string cosmetic ID)
   - `equipped_accessory` (nullable string cosmetic ID)
   - `equipped_effect` (nullable string cosmetic ID)
   - `happiness` (integer, 0-100)
   - `last_interacted_at` (datetime)

3. **`PetCosmetic`** (Catalogue of available items):
   - `id` (PK, string, e.g. "outfit_scholar", "acc_wizard_hat")
   - `name` (string, e.g. "Scholar's Robe")
   - `category` ("outfit", "accessory", "effect", "color")
   - `price` (integer, points required)
   - `milestone_requirement` (nullable string: e.g. "resolve_3_misconceptions", "teachback_score_80")
   - `description` (string)
   - `icon` (string, Lucide icon or emoji representation)
   - `mesh_config` (JSON configuration for 3D rendering: geometry, color, metallic, roughness)

4. **`StudentInventory`**:
   - `id` (PK, integer)
   - `student_id` (string, indexed)
   - `cosmetic_id` (string, FK PetCosmetic)
   - `acquired_at` (datetime)
   - Unique constraint: (`student_id`, `cosmetic_id`)

5. **`PointTransaction`**:
   - `id` (PK, integer)
   - `student_id` (string, indexed)
   - `amount` (integer: positive for earned, negative for spent)
   - `reason` (string, human-readable description)
   - `activity_type` (string: "practice", "recovery", "teachback", "notes", "shop_purchase")
   - `reference_id` (string: attempt_id, session_id, or cosmetic_id for idempotency)
   - `created_at` (datetime)

---

## 2. API Endpoints (`backend/app/routers/pet.py`)

- `GET /api/pet`: Returns student profile, current pet appearance, points balance, equipped items, and happiness.
- `GET /api/pet/shop`: Returns cosmetic catalogue with items flagged as `owned`, `equipped`, `purchasable`, or `locked_by_milestone`.
- `POST /api/pet/purchase`: Atomically validates student balance and milestone unlock, subtracts points, creates `PointTransaction`, and adds to inventory.
- `POST /api/pet/equip`: Equips or unequips an owned item on the pet.
- `POST /api/pet/customize`: Updates pet name and base color theme.
- `POST /api/pet/interact`: Triggers click reaction (happy jump / wave) and increments pet happiness.
- `GET /api/pet/transactions`: Returns transaction history of earned and spent points.

---

## 3. Learning Activity Rewards Integration

Points are granted on validated educational accomplishments:
1. **Counter-Example Recovery**: `POST /api/answers` with `parent_attempt_id` and correct answer $\to$ award **+25 points** (reason: "Misconception Resolved via Counter-Example").
2. **Standard Practice Completion**: `POST /api/answers` for first-time correct answer $\to$ award **+10 points**.
3. **TeachBack AI Session**: `POST /api/teachback/finish` $\to$ award **+20 points** (plus bonus +10 points if score $\ge 80$).
4. **Notes Upload & Graph Commit**: `POST /api/notes/commit` $\to$ award **+15 points** (reason: "Knowledge Graph Generation").

*Idempotency Guard*: Before awarding points, the backend checks `PointTransaction` by `(student_id, activity_type, reference_id)`. Repeated clicks or double-submissions are discarded without granting duplicate points.

---

## 4. 3D MirrorPet Scene Architecture (Three.js)

- Dedicated WebGL canvas inside `MirrorPetCanvas.jsx`.
- **Character Geometry & Shading**:
  - Base Body: Smooth stylized sphere/capsule with gentle breathing squash & stretch.
  - Expressive Eyes: Stylized eyelids that blink every 3–4 seconds.
  - Head Accents: Ears/horns that bob with idle physics.
- **Cosmetics in 3D**:
  - **Outfits**: Scholar Robe (layered torso cowl with gold trim), Cyber Hoodie (neon shoulder accents), Hero Cape (flowing vertex mesh).
  - **Accessories**: Wizard Hat (conical brim with star), Cool Sunglasses (reflective lenses), Studio Headphones (padded band & earcups), Cozy Scarf.
  - **Effects**: Sparkle Particle System (orbiting sprite points), Glowing Aura (additive pulsing glow shell), Particle Trail.
  - **Color Themes**: Violet Spark (`#6C4CF1`), Emerald Drake (`#1FB57A`), Cyber Cyan (`#22C3E6`), Golden Sunset (`#F5A524`), Cosmic Pink (`#E040FB`).
- **Interactive Animation**:
  - Idle state: floating vertical sine bobbing + breathing scale.
  - Interaction: clicking the pet triggers a cheerful bounce/hop and arm wave with sparkle burst.
  - Performance: `IntersectionObserver` halts render loop when canvas is off-screen.

---

## 5. Open-Source AI Model Integration

- Support **Groq API** (`GROQ_API_KEY`) for ultrafast open-source models:
  - Default: `llama-3.3-70b-versatile` or `llama-3.1-8b-instant`.
  - OpenAI-compatible chat completion endpoint: `https://api.groq.com/openai/v1/chat/completions`.
- Support **Ollama** (`OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=llama3.2`) for 100% offline local open-source inference.
- Support **Gemini** & **Anthropic** when API keys are configured.
- Seamless fallback to deterministic mock mode (`USE_MOCK_LLM=true`) when no keys or networks are available.
