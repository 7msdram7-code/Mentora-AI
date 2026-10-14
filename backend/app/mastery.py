"""
Mastery Engine for MistakeMirror.
Deterministic Bayesian-style mastery update algorithms without LLM dependencies.
"""
from typing import Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import Mastery, Topic

def clamp_p(p: float) -> float:
    """Clamp mastery probability strictly within [0.0, 1.0], rounded to 4 decimals."""
    return round(max(0.0, min(1.0, float(p))), 4)

def calculate_status(p: float) -> str:
    """
    Status rules:
    - p < 0.4: RED
    - 0.4 <= p < 0.7: AMBER
    - p >= 0.7: GREEN
    """
    if p < 0.4:
        return "RED"
    elif p < 0.7:
        return "AMBER"
    else:
        return "GREEN"

def get_or_create_mastery(db: Session, student_id: str, topic_id: str) -> Mastery:
    """Retrieve existing mastery entry or initialize at p = 0.5."""
    mastery = db.query(Mastery).filter(
        Mastery.student_id == student_id,
        Mastery.topic_id == topic_id
    ).first()
    if not mastery:
        mastery = Mastery(
            student_id=student_id,
            topic_id=topic_id,
            p=0.5,
            status="AMBER",
            diagnostic_role="OK"
        )
        db.add(mastery)
        db.flush()
    return mastery

def apply_correct_update(p_old: float) -> float:
    """p = p + (1 - p) * 0.25"""
    return clamp_p(p_old + (1.0 - p_old) * 0.25)

def apply_wrong_update(p_old: float) -> float:
    """p_tested = p_tested * 0.8"""
    return clamp_p(p_old * 0.8)

def apply_root_cause_update(p_old: float) -> float:
    """p_root = p_root * 0.6"""
    return clamp_p(p_old * 0.6)

def apply_careless_slip_update(p_old: float) -> float:
    """p_tested = max(0.0, p_tested - 0.05)"""
    return clamp_p(p_old - 0.05)

def update_mastery_for_attempt(
    db: Session,
    student_id: str,
    tested_topic_id: str,
    is_correct: bool,
    time_sec: float = 10.0,
    mistake_type: Optional[str] = None,
    root_topic_id: Optional[str] = None,
    is_counterexample: bool = False
) -> Dict[str, Any]:
    """
    Executes the full deterministic mastery logic within the active DB transaction.
    Returns dictionary with updated mastery records and diagnostic roles.
    """
    tested_mastery = get_or_create_mastery(db, student_id, tested_topic_id)
    prior_p_tested = tested_mastery.p
    changes = []

    if is_correct:
        # Correct answer
        new_p = apply_correct_update(prior_p_tested)
        tested_mastery.p = new_p
        tested_mastery.status = calculate_status(new_p)
        tested_mastery.diagnostic_role = "OK"
        
        # If answering a counterexample correctly, clear any prior active root-cause on tested topic
        if is_counterexample and tested_mastery.status != "RED":
            tested_mastery.diagnostic_role = "OK"

        topic_obj = db.query(Topic).filter(Topic.id == tested_topic_id).first()
        topic_name = topic_obj.name if topic_obj else tested_topic_id

        changes.append({
            "topic_id": tested_topic_id,
            "topic_name": topic_name,
            "old_p": prior_p_tested,
            "new_p": new_p,
            "status": tested_mastery.status,
            "role": "OK"
        })

    else:
        # Incorrect answer
        # Check Careless Slip Precedence:
        # 1. mistake_type == 'careless_slip'
        # 2. time_sec < 5.0 and prior_p_tested >= 0.7
        is_careless = (
            mistake_type == "careless_slip" or 
            (time_sec < 5.0 and prior_p_tested >= 0.7)
        )

        if is_careless:
            new_p = apply_careless_slip_update(prior_p_tested)
            tested_mastery.p = new_p
            tested_mastery.status = calculate_status(new_p)
            tested_mastery.diagnostic_role = "SYMPTOM"

            topic_obj = db.query(Topic).filter(Topic.id == tested_topic_id).first()
            topic_name = topic_obj.name if topic_obj else tested_topic_id

            changes.append({
                "topic_id": tested_topic_id,
                "topic_name": topic_name,
                "old_p": prior_p_tested,
                "new_p": new_p,
                "status": tested_mastery.status,
                "role": "SYMPTOM"
            })
            # No propagation to root or prerequisites on careless slip!
        else:
            # Normal wrong answer
            new_p_tested = apply_wrong_update(prior_p_tested)
            tested_mastery.p = new_p_tested
            tested_mastery.status = calculate_status(new_p_tested)
            tested_mastery.diagnostic_role = "SYMPTOM"

            tested_obj = db.query(Topic).filter(Topic.id == tested_topic_id).first()
            tested_name = tested_obj.name if tested_obj else tested_topic_id

            changes.append({
                "topic_id": tested_topic_id,
                "topic_name": tested_name,
                "old_p": prior_p_tested,
                "new_p": new_p_tested,
                "status": tested_mastery.status,
                "role": "SYMPTOM"
            })

            # Check if root topic is different from tested topic
            if root_topic_id and root_topic_id != tested_topic_id:
                # Verify root_topic exists
                root_obj = db.query(Topic).filter(Topic.id == root_topic_id).first()
                if root_obj:
                    root_mastery = get_or_create_mastery(db, student_id, root_topic_id)
                    prior_p_root = root_mastery.p
                    new_p_root = apply_root_cause_update(prior_p_root)
                    root_mastery.p = new_p_root
                    root_mastery.status = calculate_status(new_p_root)
                    root_mastery.diagnostic_role = "ROOT CAUSE"

                    changes.append({
                        "topic_id": root_topic_id,
                        "topic_name": root_obj.name,
                        "old_p": prior_p_root,
                        "new_p": new_p_root,
                        "status": root_mastery.status,
                        "role": "ROOT CAUSE"
                    })

    db.flush()
    return {
        "changes": changes,
        "is_careless": is_careless if not is_correct else False
    }
