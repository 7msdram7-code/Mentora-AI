from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, Topic, Mastery, Question
from app.seed import seed_database, SUBJECT_ID
from app.schemas import DemoLoadResponse

router = APIRouter(prefix="/demo", tags=["Demo"])

@router.post("/reset")
def reset_demo(db: Session = Depends(get_db)):
    """
    Resets the demo student state (attempts, mastery, teachback sessions)
    back to the baseline 0.5 mastery state without duplicating seed data.
    """
    seed_database(db, force_reset_demo=True)
    return {
        "status": "success",
        "message": "Demo state reset to clean baseline (p = 0.5 for all topics)."
    }

@router.post("/load", response_model=DemoLoadResponse)
def load_demo(db: Session = Depends(get_db)):
    """
    Prepares and loads the preset demonstration state for the scripted demo:
    - Subject: Data Structures — Hashing
    - Scripted Q1: Insert key 25 into table of size 10 using h(k)=k % 10
    """
    seed_database(db, force_reset_demo=True)

    subject = db.query(Subject).filter(Subject.id == SUBJECT_ID).first()
    masteries = db.query(Mastery).filter(Mastery.student_id == "demo_student").all()
    summary = {m.topic_id: m.p for m in masteries}

    # Scripted demo question is Q1
    scripted_q = db.query(Question).filter(Question.id == 1).first()
    q_id = scripted_q.id if scripted_q else 1

    return DemoLoadResponse(
        student_id="demo_student",
        subject_id=SUBJECT_ID,
        subject_name=subject.name if subject else "Simple Maths Problem Solving",
        scripted_question_id=q_id,
        mastery_summary=summary
    )
