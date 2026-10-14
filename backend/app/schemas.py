from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

# Subject
class SubjectRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    topic_count: int = 0

class SubjectGraphNode(BaseModel):
    id: str
    name: str
    mastery: float
    status: str  # RED, AMBER, GREEN
    diagnostic_role: Optional[str] = None  # ROOT CAUSE, SYMPTOM, OK
    pages: List[int] = []
    prerequisites: List[str] = []

class SubjectGraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str = "needs"

class SubjectGraphResponse(BaseModel):
    subject_id: str
    subject_name: str
    nodes: List[SubjectGraphNode]
    edges: List[SubjectGraphEdge]
    active_root_cause: Optional[str] = None

# Questions
class QuestionOption(BaseModel):
    id: str
    text: str
    mistake_tag: Optional[str] = None
    misconception: Optional[str] = None
    root_topic: Optional[str] = None

class QuestionRead(BaseModel):
    id: int
    topic_id: str
    topic_name: str
    type: str
    text: str
    options: List[Dict[str, Any]]  # options presented without exposing correct_option
    difficulty: str
    is_counterexample: bool
    counter_belief_target: Optional[str] = None

# Answer Submission
class AnswerSubmitRequest(BaseModel):
    student_id: str = "demo_student"
    question_id: int
    answer: str
    time_sec: float = 5.0
    language: str = "en"  # "en" or "ta"
    parent_attempt_id: Optional[int] = None

class TraceNode(BaseModel):
    id: str
    name: str
    p: float
    status: str
    role: Optional[str] = None

class MasteryChange(BaseModel):
    topic_id: str
    topic_name: str
    old_p: float
    new_p: float
    status: str
    role: Optional[str] = None

class CounterExamplePayload(BaseModel):
    id: Optional[int] = None
    text: str
    options: List[Dict[str, Any]]
    correct_option: Optional[str] = None
    target_topic: str
    why_belief_fails: str

class AnswerSubmitResponse(BaseModel):
    correct: bool
    correct_answer: str
    mistake_type: Optional[str] = None
    misconception: Optional[str] = None
    root_topic: Optional[str] = None
    root_topic_name: Optional[str] = None
    trace: List[TraceNode] = []
    mastery_changes: List[MasteryChange] = []
    counter_example: Optional[CounterExamplePayload] = None
    explanation: str
    addressed_misconception: Optional[bool] = None

# Teach-back
class TeachbackStartRequest(BaseModel):
    student_id: str = "demo_student"
    topic_id: str
    language: str = "en"

class TeachbackStartResponse(BaseModel):
    session_id: str
    student_id: str
    topic_id: str
    topic_name: str
    junior_message: str

class TeachbackMessageRequest(BaseModel):
    session_id: str
    user_message: str
    language: str = "en"

class TeachbackMessageResponse(BaseModel):
    session_id: str
    reply: str

class KnowledgeGap(BaseModel):
    topic_id: str
    gap: str

class TeachbackFinishRequest(BaseModel):
    session_id: str
    language: str = "en"

class TeachbackFinishResponse(BaseModel):
    session_id: str
    score: int
    gaps: List[KnowledgeGap]
    feedback: str
    suggested_topics: List[str]

# Revision Plan
class RevisionCard(BaseModel):
    topic_id: str
    topic_name: str
    reason: str
    p: float
    status: str
    role: Optional[str] = None
    suggested_days: int  # 1, 3, or 7
    review_date: str
    pages: List[int] = []
    practice_question_id: Optional[int] = None

class RevisionPlanResponse(BaseModel):
    student_id: str
    cards: List[RevisionCard]

# Demo
class DemoLoadResponse(BaseModel):
    student_id: str
    subject_id: str
    subject_name: str
    scripted_question_id: int
    mastery_summary: Dict[str, float]

# Notes Upload
class DraftTopic(BaseModel):
    id: str
    name: str
    prerequisites: List[str] = []
    pages: List[int] = []

class DraftOption(BaseModel):
    id: str
    text: str
    mistake_tag: Optional[str] = None
    misconception: Optional[str] = None
    root_topic: Optional[str] = None

class DraftQuestion(BaseModel):
    topic_id: str
    text: str
    options: List[DraftOption]
    correct_option: str
    difficulty: str = "medium"

class NotesDraftResponse(BaseModel):
    title: str
    description: str
    topics: List[DraftTopic]
    questions: List[DraftQuestion]

class NotesCommitRequest(BaseModel):
    subject_id: str
    title: str
    description: str
    topics: List[DraftTopic]
    questions: List[DraftQuestion]

# MirrorPet & Student Profile
class PetCosmeticRead(BaseModel):
    id: str
    name: str
    category: str
    price: int
    milestone_requirement: Optional[str] = None
    description: str
    icon: str
    mesh_config: Dict[str, Any] = {}
    is_owned: bool = False
    is_equipped: bool = False
    is_locked: bool = False
    milestone_met: bool = True

class PetProfileRead(BaseModel):
    id: int
    student_id: str
    pet_name: str
    pet_type: str
    color_theme: str
    equipped_outfit: Optional[str] = None
    equipped_accessory: Optional[str] = None
    equipped_effect: Optional[str] = None
    happiness: int
    equipped_details: Dict[str, Any] = {}

class PointTransactionRead(BaseModel):
    id: int
    amount: int
    reason: str
    activity_type: str
    created_at: str

class StudentProfileRead(BaseModel):
    student_id: str
    display_name: str
    avatar_url: str
    points_balance: int
    total_earned_points: int
    level: int
    pet: PetProfileRead
    recent_transactions: List[PointTransactionRead] = []

class PetPurchaseRequest(BaseModel):
    student_id: str = "demo_student"
    cosmetic_id: str

class PetEquipRequest(BaseModel):
    student_id: str = "demo_student"
    cosmetic_id: Optional[str] = None
    category: str  # outfit, accessory, effect
    action: str = "equip"  # equip or unequip

class PetCustomizeRequest(BaseModel):
    student_id: str = "demo_student"
    pet_name: Optional[str] = None
    color_theme: Optional[str] = None

class PetInteractResponse(BaseModel):
    pet_name: str
    happiness: int
    reaction: str
    message: str

