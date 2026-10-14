import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import TeachbackSession, TeachbackMessage, Topic, Mastery
from app.schemas import (
    TeachbackStartRequest,
    TeachbackStartResponse,
    TeachbackMessageRequest,
    TeachbackMessageResponse,
    TeachbackFinishRequest,
    TeachbackFinishResponse,
    KnowledgeGap
)
from app.llm import llm_client
from app.mastery import clamp_p, calculate_status

router = APIRouter(prefix="/teachback", tags=["Teach-back"])

@router.post("/start", response_model=TeachbackStartResponse)
def start_teachback(payload: TeachbackStartRequest, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == payload.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    session_id = f"tb_{uuid.uuid4().hex[:12]}"
    session = TeachbackSession(
        id=session_id,
        student_id=payload.student_id,
        topic_id=payload.topic_id,
        status="active"
    )
    db.add(session)

    # Initial friendly junior prompt
    if payload.language == "ta":
        first_msg = f"வணக்கம்! நான் {topic.name} பற்றி புரிந்து கொள்ள முயற்சிக்கிறேன். ஆனால் எனக்கு ஒரு சந்தேகம் உள்ளது: நாம் ஏன் நேரடியாக எண்களை சேமிக்காமல் hash function மற்றும் modulo பயன்படுத்துகிறோம்? சுலபமாக விளக்க முடியுமா?"
    else:
        first_msg = f"Hi! I'm trying to understand {topic.name}. Could you explain to me like I'm a beginner: why do we actually need this, and what happens when we calculate indices?"

    initial_msg_obj = TeachbackMessage(
        session_id=session_id,
        sender="junior",
        message=first_msg
    )
    db.add(initial_msg_obj)
    db.commit()

    return TeachbackStartResponse(
        session_id=session_id,
        student_id=payload.student_id,
        topic_id=topic.id,
        topic_name=topic.name,
        junior_message=first_msg
    )

@router.post("/message", response_model=TeachbackMessageResponse)
def send_teachback_message(payload: TeachbackMessageRequest, db: Session = Depends(get_db)):
    session = db.query(TeachbackSession).filter(TeachbackSession.id == payload.session_id).first()
    if not session or session.status != "active":
        raise HTTPException(status_code=404, detail="Active teach-back session not found")

    topic = db.query(Topic).filter(Topic.id == session.topic_id).first()
    topic_name = topic.name if topic else session.topic_id

    # Record user message
    user_msg_obj = TeachbackMessage(
        session_id=session.id,
        sender="user",
        message=payload.user_message
    )
    db.add(user_msg_obj)
    db.flush()

    # Fetch history
    history_objs = db.query(TeachbackMessage).filter(
        TeachbackMessage.session_id == session.id
    ).order_by(TeachbackMessage.created_at.asc()).all()

    conv_history = [{"sender": m.sender, "message": m.message} for m in history_objs]

    # Generate junior reply
    reply = llm_client.teachback_chat(
        topic_name=topic_name,
        conversation_history=conv_history,
        language=payload.language
    )

    junior_msg_obj = TeachbackMessage(
        session_id=session.id,
        sender="junior",
        message=reply
    )
    db.add(junior_msg_obj)
    db.commit()

    return TeachbackMessageResponse(
        session_id=session.id,
        reply=reply
    )

@router.post("/finish", response_model=TeachbackFinishResponse)
def finish_teachback(payload: TeachbackFinishRequest, db: Session = Depends(get_db)):
    session = db.query(TeachbackSession).filter(TeachbackSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    topic = db.query(Topic).filter(Topic.id == session.topic_id).first()
    topic_name = topic.name if topic else session.topic_id

    history_objs = db.query(TeachbackMessage).filter(
        TeachbackMessage.session_id == session.id
    ).order_by(TeachbackMessage.created_at.asc()).all()

    conv_history = [{"sender": m.sender, "message": m.message} for m in history_objs]

    eval_result = llm_client.teachback_finish(
        topic_id=session.topic_id,
        topic_name=topic_name,
        conversation_history=conv_history
    )

    # Documented deterministic penalty:
    # If gaps identified, deduct 0.05 per gap (max 0.10) on the topic
    if eval_result.gaps:
        penalty = min(0.10, 0.05 * len(eval_result.gaps))
        m = db.query(Mastery).filter(
            Mastery.student_id == session.student_id,
            Mastery.topic_id == session.topic_id
        ).first()
        if m:
            m.p = clamp_p(m.p - penalty)
            m.status = calculate_status(m.p)

    session.status = "completed"
    session.score = eval_result.score
    session.gaps = [g.model_dump() for g in eval_result.gaps]
    db.commit()

    # Award learning points for TeachBack explanation
    try:
        from app.routers.pet import award_learning_points
        pts = 20 + (10 if eval_result.score >= 80 else 0)
        award_learning_points(
            db=db,
            student_id=session.student_id,
            amount=pts,
            reason=f"Completed TeachBack on {topic_name} (Score: {eval_result.score})",
            activity_type="teachback",
            reference_id=f"tb_{session.id}"
        )
        db.commit()
    except Exception:
        pass

    suggested = [session.topic_id]
    if eval_result.gaps:
        for g in eval_result.gaps:
            if g.topic_id not in suggested:
                suggested.append(g.topic_id)

    return TeachbackFinishResponse(
        session_id=session.id,
        score=eval_result.score,
        gaps=[KnowledgeGap(**g.model_dump()) for g in eval_result.gaps],
        feedback=eval_result.feedback,
        suggested_topics=suggested
    )
