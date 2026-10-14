import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Question, Attempt, Topic, Mastery
from app.schemas import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    TraceNode,
    MasteryChange,
    CounterExamplePayload
)
from app.mastery import update_mastery_for_attempt, get_or_create_mastery
from app.graph import trace_prerequisite_chain
from app.llm import llm_client, translate_explanation_to_tamil

router = APIRouter(prefix="/answers", tags=["Answers"])

@router.post("", response_model=AnswerSubmitResponse)
def submit_answer(payload: AnswerSubmitRequest, db: Session = Depends(get_db)):
    """
    Submits a student's answer:
    - Verifies correctness and prevents duplicate double-penalties
    - Executes deterministic Bayesian-style mastery update
    - Traces root cause via DFS prerequisite graph
    - Serves targeted counter-example to challenge false mental model
    - Supports bilingual explanations (English / Tamil)
    """
    question = db.query(Question).filter(Question.id == payload.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    tested_topic = db.query(Topic).filter(Topic.id == question.topic_id).first()
    tested_topic_name = tested_topic.name if tested_topic else question.topic_id

    # 1. Idempotency Check: prevent duplicate score decrement if identical answer submitted repeatedly
    recent_attempt = db.query(Attempt).filter(
        Attempt.student_id == payload.student_id,
        Attempt.question_id == payload.question_id,
        Attempt.answer == payload.answer
    ).order_by(Attempt.id.desc()).first()

    # If submitted within the last 5 seconds with identical answer, treat as duplicate click
    if recent_attempt and (datetime.datetime.utcnow() - recent_attempt.created_at).total_seconds() < 5.0:
        # Fetch current mastery state without mutating
        m_curr = get_or_create_mastery(db, payload.student_id, question.topic_id)
        return AnswerSubmitResponse(
            correct=recent_attempt.correct,
            correct_answer=question.correct_option,
            mistake_type=recent_attempt.mistake_type,
            misconception=None,
            root_topic=recent_attempt.root_topic,
            root_topic_name=recent_attempt.root_topic,
            trace=[],
            mastery_changes=[MasteryChange(
                topic_id=question.topic_id,
                topic_name=tested_topic_name,
                old_p=m_curr.p,
                new_p=m_curr.p,
                status=m_curr.status,
                role=m_curr.diagnostic_role
            )],
            counter_example=None,
            explanation="Duplicate submission ignored. Retaining current score.",
            addressed_misconception=None
        )

    # 2. Determine Correctness
    is_correct = (str(payload.answer).strip().lower() == str(question.correct_option).strip().lower())

    # Find matched option details
    selected_opt = None
    if question.options:
        for opt in question.options:
            if str(opt.get("id")).strip().lower() == str(payload.answer).strip().lower():
                selected_opt = opt
                break

    mistake_type = None
    misconception = None
    root_topic_id = None
    addressed_misconception = None

    if is_correct:
        if question.is_counterexample:
            addressed_misconception = True
            explanation = "Correct! You have successfully addressed the misconception and verified the underlying concept."
        else:
            explanation = "Correct! Well done."
    else:
        # Priority 1: Option's deterministic metadata
        if selected_opt and selected_opt.get("mistake_tag"):
            mistake_type = "concept_gap"
            misconception = selected_opt.get("misconception")
            root_topic_id = selected_opt.get("root_topic")
        else:
            # Priority 2: LLM Diagnosis
            all_topics = [t.id for t in db.query(Topic).all()]
            diag = llm_client.diagnose(
                question_text=question.text,
                correct_answer=question.correct_option,
                student_answer=payload.answer,
                tested_topic_id=question.topic_id,
                available_topics=all_topics
            )
            mistake_type = diag.mistake_type
            misconception = diag.misconception
            root_topic_id = diag.root_topic

        # Scripted Q1 checks
        if question.id == 1 and str(payload.answer).strip() == "25":
            explanation = "You answered 25 because you treated the hash value as the original key. The root cause is misunderstanding modulo wrap-around. Let's test that belief with another example."
            root_topic_id = "modulo"
            mistake_type = "concept_gap"
        elif question.id == 1 and str(payload.answer).strip().replace("$", "") == "50":
            explanation = "You answered 50 because you calculated (6 + 4) * 5 = 10 * 5 = 50, performing addition before multiplication. The root cause is misunderstanding Order of Operations (PEMDAS). Let's test that belief with another example."
            root_topic_id = "order_of_operations"
            mistake_type = "concept_gap"
        else:
            root_name = db.query(Topic.name).filter(Topic.id == root_topic_id).scalar() or root_topic_id
            explanation = f"{misconception or 'Incorrect answer.'} The root cause traces back to {root_name}."

    # 3. Update Mastery deterministically
    mastery_res = update_mastery_for_attempt(
        db=db,
        student_id=payload.student_id,
        tested_topic_id=question.topic_id,
        is_correct=is_correct,
        time_sec=payload.time_sec,
        mistake_type=mistake_type,
        root_topic_id=root_topic_id,
        is_counterexample=question.is_counterexample
    )

    # 4. Generate or fetch Counter-Example if incorrect
    counter_payload = None
    if not is_correct and not question.is_counterexample:
        # Check if pre-seeded counterexample exists for this root topic
        seeded_ce = db.query(Question).filter(
            Question.topic_id == root_topic_id,
            Question.is_counterexample == True
        ).first()

        if seeded_ce:
            counter_payload = CounterExamplePayload(
                id=seeded_ce.id,
                text=seeded_ce.text,
                options=[{"id": o["id"], "text": o["text"]} for o in (seeded_ce.options or [])],
                target_topic=root_topic_id or question.topic_id,
                why_belief_fails="Values must strictly obey modulus boundary conditions."
            )
        else:
            ce_gen = llm_client.generate_counter_example(
                question_text=question.text,
                student_answer=payload.answer,
                misconception=misconception or "",
                root_topic=root_topic_id or question.topic_id
            )
            counter_payload = CounterExamplePayload(
                id=None,
                text=ce_gen.question,
                options=ce_gen.options,
                target_topic=root_topic_id or question.topic_id,
                why_belief_fails=ce_gen.why_belief_fails
            )

    # 5. Prerequisite DFS Trace
    trace_nodes = []
    if not is_correct:
        trace_raw = trace_prerequisite_chain(
            db=db,
            student_id=payload.student_id,
            tested_topic_id=question.topic_id,
            root_topic_id=root_topic_id
        )
        for t in trace_raw:
            trace_nodes.append(TraceNode(
                id=t["id"],
                name=t["name"],
                p=t["p"],
                status=t["status"],
                role=t.get("role")
            ))

    # 6. Apply Tamil Translation if requested
    if payload.language == "ta":
        explanation = translate_explanation_to_tamil(explanation)

    # 7. Record Attempt
    attempt = Attempt(
        student_id=payload.student_id,
        question_id=payload.question_id,
        answer=str(payload.answer),
        correct=is_correct,
        time_sec=payload.time_sec,
        mistake_type=mistake_type,
        root_topic=root_topic_id,
        parent_attempt_id=payload.parent_attempt_id
    )
    db.add(attempt)
    db.commit()

    # 8. Award Progress Points for verified learning achievements
    if is_correct:
        try:
            from app.routers.pet import award_learning_points
            if question.is_counterexample:
                award_learning_points(
                    db=db,
                    student_id=payload.student_id,
                    amount=25,
                    reason="Resolved Misconception via Counter-Example",
                    activity_type="recovery",
                    reference_id=f"attempt_{attempt.id}"
                )
            else:
                award_learning_points(
                    db=db,
                    student_id=payload.student_id,
                    amount=10,
                    reason="Completed Practice Problem",
                    activity_type="practice",
                    reference_id=f"attempt_{attempt.id}"
                )
            db.commit()
        except Exception:
            pass

    root_obj = db.query(Topic).filter(Topic.id == root_topic_id).first() if root_topic_id else None
    root_topic_name = root_obj.name if root_obj else root_topic_id

    changes = [MasteryChange(**c) for c in mastery_res["changes"]]

    return AnswerSubmitResponse(
        correct=is_correct,
        correct_answer=question.correct_option,
        mistake_type=mistake_type,
        misconception=misconception,
        root_topic=root_topic_id,
        root_topic_name=root_topic_name,
        trace=trace_nodes,
        mastery_changes=changes,
        counter_example=counter_payload,
        explanation=explanation,
        addressed_misconception=addressed_misconception
    )
