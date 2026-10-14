from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Question, Topic, Attempt, Mastery
from app.schemas import QuestionRead

router = APIRouter(prefix="/questions", tags=["Questions"])

@router.get("/next", response_model=QuestionRead)
def get_next_question(
    student_id: str = Query("demo_student"),
    subject_id: str = Query("simple_maths"),
    topic_id: Optional[str] = Query(None),
    question_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Adaptive Question Selector:
    - If question_id is explicitly requested, return that question.
    - If topic_id is explicitly requested, return next unanswered in that topic.
    - If student has an active root cause, prioritize questions from that root-cause topic.
    - Otherwise prioritize lowest mastery topics.
    - Avoid immediate repeats and prefer unanswered questions.
    """
    topics = db.query(Topic).filter(Topic.subject_id == subject_id).all()
    if not topics:
        raise HTTPException(status_code=404, detail="Subject topics not found")

    topic_dict = {t.id: t.name for t in topics}

    # If specific question requested directly (e.g. Scripted Demo Q1)
    if question_id:
        selected_q = db.query(Question).filter(Question.id == question_id).first()
        if selected_q:
            safe_options = [
                {"id": opt["id"], "text": opt["text"]}
                for opt in (selected_q.options or [])
            ]
            return QuestionRead(
                id=selected_q.id,
                topic_id=selected_q.topic_id,
                topic_name=topic_dict.get(selected_q.topic_id, selected_q.topic_id),
                type=selected_q.type or "mcq",
                text=selected_q.text,
                options=safe_options,
                difficulty=selected_q.difficulty or "medium",
                is_counterexample=bool(selected_q.is_counterexample),
                counter_belief_target=selected_q.counter_belief_target
            )

    # If specific topic requested:
    target_topic_ids = [topic_id] if topic_id else []

    if not target_topic_ids:
        # Check if there is an active ROOT CAUSE topic
        active_root = db.query(Mastery).filter(
            Mastery.student_id == student_id,
            Mastery.diagnostic_role == "ROOT CAUSE",
            Mastery.topic_id.in_(topic_dict.keys())
        ).first()

        if active_root:
            target_topic_ids = [active_root.topic_id]
        else:
            # Order topics by lowest mastery probability (p), then tie-break
            mastery_records = db.query(Mastery).filter(
                Mastery.student_id == student_id,
                Mastery.topic_id.in_(topic_dict.keys())
            ).all()
            m_map = {m.topic_id: m.p for m in mastery_records}
            sorted_topics = sorted(topics, key=lambda t: (m_map.get(t.id, 0.5), t.id))
            target_topic_ids = [t.id for t in sorted_topics]

    # Find answered question IDs for this student
    answered_q_ids = {
        row[0] for row in db.query(Attempt.question_id).filter(
            Attempt.student_id == student_id
        ).all()
    }

    selected_q = None

    # First attempt: unanswered questions in target topics
    for tid in target_topic_ids:
        unanswered = db.query(Question).filter(
            Question.topic_id == tid,
            Question.is_counterexample == False,
            ~Question.id.in_(answered_q_ids)
        ).order_by(Question.id.asc()).first()
        if unanswered:
            selected_q = unanswered
            break

    # Second attempt: any unanswered regular question in the subject
    if not selected_q:
        selected_q = db.query(Question).filter(
            Question.topic_id.in_(topic_dict.keys()),
            Question.is_counterexample == False,
            ~Question.id.in_(answered_q_ids)
        ).order_by(Question.id.asc()).first()

    # Third attempt: if all answered, fallback to least recently attempted question
    if not selected_q:
        selected_q = db.query(Question).filter(
            Question.topic_id.in_(topic_dict.keys()),
            Question.is_counterexample == False
        ).order_by(Question.id.asc()).first()

    if not selected_q:
        raise HTTPException(status_code=404, detail="No questions available for this subject")

    safe_options = [
        {"id": opt["id"], "text": opt["text"]}
        for opt in (selected_q.options or [])
    ]

    return QuestionRead(
        id=selected_q.id,
        topic_id=selected_q.topic_id,
        topic_name=topic_dict.get(selected_q.topic_id, selected_q.topic_id),
        type=selected_q.type or "mcq",
        text=selected_q.text,
        options=safe_options,
        difficulty=selected_q.difficulty or "medium",
        is_counterexample=bool(selected_q.is_counterexample),
        counter_belief_target=selected_q.counter_belief_target
    )
