import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Topic, Mastery, Question
from app.schemas import RevisionPlanResponse, RevisionCard

router = APIRouter(prefix="/revision-plan", tags=["Revision"])

@router.get("", response_model=RevisionPlanResponse)
def get_revision_plan(
    student_id: str = Query("demo_student"),
    db: Session = Depends(get_db)
):
    """
    Returns prioritized revision cards:
    - Priority 1: Unresolved root causes (RED, diagnostic_role == 'ROOT CAUSE') -> 1 day interval
    - Priority 2: Weak prerequisites & symptoms (RED/AMBER) -> 3 day interval
    - Priority 3: Topics under learning -> 7 day interval
    Includes note page references and practice question links.
    """
    masteries = db.query(Mastery).filter(Mastery.student_id == student_id).all()
    mastery_map = {m.topic_id: m for m in masteries}

    topics = db.query(Topic).all()

    # Find practice question for each topic
    q_map = {}
    for t in topics:
        q = db.query(Question.id).filter(
            Question.topic_id == t.id,
            Question.is_counterexample == False
        ).order_by(Question.id.asc()).first()
        if q:
            q_map[t.id] = q[0]

    now = datetime.datetime.utcnow()
    cards = []

    for t in topics:
        m = mastery_map.get(t.id)
        p = m.p if m else 0.5
        status = m.status if m else "AMBER"
        role = m.diagnostic_role if m else "OK"

        # Determine priority and intervals
        if role == "ROOT CAUSE" or status == "RED":
            priority = 1
            days = 1
            reason = "Critical prerequisite root cause diagnosed. High priority review needed to unblock dependent concepts."
        elif status == "AMBER" or role == "SYMPTOM":
            priority = 2
            days = 3
            reason = "In-progress understanding. Practice recommended to reach mastery and reinforce mental models."
        else:
            priority = 3
            days = 7
            reason = "Concept mastered. Periodic spaced review to prevent memory decay."

        review_date = (now + datetime.timedelta(days=days)).strftime("%Y-%m-%d")

        cards.append({
            "priority": priority,
            "p": p,
            "card": RevisionCard(
                topic_id=t.id,
                topic_name=t.name,
                reason=reason,
                p=p,
                status=status,
                role=role,
                suggested_days=days,
                review_date=review_date,
                pages=t.pages or [],
                practice_question_id=q_map.get(t.id)
            )
        })

    # Sort cards: Priority 1 first, then lowest p
    cards.sort(key=lambda c: (c["priority"], c["p"], c["card"].topic_id))

    return RevisionPlanResponse(
        student_id=student_id,
        cards=[c["card"] for c in cards]
    )
