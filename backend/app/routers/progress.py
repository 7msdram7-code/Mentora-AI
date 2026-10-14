from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Attempt, Mastery, Topic, Question, TeachbackSession

router = APIRouter(prefix="/progress", tags=["Progress"])

@router.get("")
def get_student_progress(
    student_id: str = Query("demo_student"),
    db: Session = Depends(get_db)
):
    """
    Returns comprehensive learning progress analytics:
    - Overall mastery percentage & distribution
    - Diagnosed misconceptions vs resolved counter-examples
    - Breakdown of mistake types (concept gap, mental model, careless slip, prerequisite)
    - Per-topic mastery and telemetry status
    - Recent diagnostic activity timeline
    """
    # 1. Fetch topics and mastery
    topics = db.query(Topic).all()
    mastery_records = db.query(Mastery).filter(Mastery.student_id == student_id).all()
    mastery_map = {m.topic_id: m for m in mastery_records}

    topic_items = []
    total_p = 0.0
    green_count = 0
    amber_count = 0
    red_count = 0

    for t in topics:
        m = mastery_map.get(t.id)
        p = m.p if m else 0.5
        status = m.status if m else "AMBER"
        role = m.diagnostic_role if m else "OK"

        total_p += p
        if status == "GREEN":
            green_count += 1
        elif status == "RED" or role == "ROOT CAUSE":
            red_count += 1
        else:
            amber_count += 1

        topic_items.append({
            "id": t.id,
            "name": t.name,
            "p": round(p, 4),
            "percentage": round(p * 100, 1),
            "status": status,
            "role": role,
            "pages": t.pages or []
        })

    # Sort topics by lowest mastery first
    topic_items.sort(key=lambda x: (x["p"], x["id"]))
    overall_mastery = round((total_p / len(topics) * 100), 1) if topics else 50.0

    # 2. Attempt metrics
    attempts = db.query(Attempt).filter(Attempt.student_id == student_id).order_by(Attempt.id.desc()).all()
    total_attempts = len(attempts)
    correct_count = sum(1 for a in attempts if a.correct)
    accuracy = round((correct_count / total_attempts * 100), 1) if total_attempts > 0 else 0.0

    # Diagnosed vs Resolved
    misconceptions_diagnosed = sum(1 for a in attempts if not a.correct and not a.parent_attempt_id)
    misconceptions_resolved = sum(1 for a in attempts if a.correct and a.parent_attempt_id)

    # Mistake type distribution
    mistake_distribution = {
        "concept_gap": 0,
        "wrong_mental_model": 0,
        "careless_slip": 0,
        "missing_prerequisite": 0
    }
    for a in attempts:
        if a.mistake_type and a.mistake_type in mistake_distribution:
            mistake_distribution[a.mistake_type] += 1

    # 3. Teach-back metrics
    tb_sessions = db.query(TeachbackSession).filter(
        TeachbackSession.student_id == student_id,
        TeachbackSession.status == "completed"
    ).all()
    avg_tb_score = round(sum(s.score or 0 for s in tb_sessions) / len(tb_sessions), 1) if tb_sessions else 0.0

    # 4. Recent timeline (last 8)
    timeline = []
    q_dict = {q.id: q.text for q in db.query(Question.id, Question.text).all()}
    t_dict = {t.id: t.name for t in topics}

    for a in attempts[:8]:
        q_text = q_dict.get(a.question_id, f"Question #{a.question_id}")
        timeline.append({
            "id": a.id,
            "question_text": q_text[:75] + ("..." if len(q_text) > 75 else ""),
            "answer": a.answer,
            "correct": a.correct,
            "mistake_type": a.mistake_type,
            "root_topic": a.root_topic,
            "root_topic_name": t_dict.get(a.root_topic, a.root_topic),
            "is_counterexample": bool(a.parent_attempt_id),
            "time_sec": round(a.time_sec, 1),
            "timestamp": a.created_at.strftime("%H:%M:%S") if a.created_at else ""
        })

    return {
        "student_id": student_id,
        "overall_mastery": overall_mastery,
        "topic_counts": {
            "total": len(topics),
            "mastered": green_count,
            "learning": amber_count,
            "root_cause": red_count
        },
        "performance": {
            "total_attempts": total_attempts,
            "correct_attempts": correct_count,
            "accuracy": accuracy,
            "misconceptions_diagnosed": misconceptions_diagnosed,
            "misconceptions_resolved": misconceptions_resolved,
            "resolution_rate": round((misconceptions_resolved / misconceptions_diagnosed * 100), 1) if misconceptions_diagnosed > 0 else 100.0,
            "avg_teachback_score": avg_tb_score
        },
        "mistake_distribution": mistake_distribution,
        "topics": topic_items,
        "recent_timeline": timeline
    }
