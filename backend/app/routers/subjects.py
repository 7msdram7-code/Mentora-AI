from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, Topic, TopicPrerequisite, Mastery
from app.schemas import SubjectRead, SubjectGraphResponse, SubjectGraphNode, SubjectGraphEdge
from app.mastery import get_or_create_mastery

router = APIRouter(prefix="/subjects", tags=["Subjects"])

@router.get("", response_model=List[SubjectRead])
def list_subjects(db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    result = []
    for s in subjects:
        topic_count = db.query(Topic).filter(Topic.subject_id == s.id).count()
        result.append(SubjectRead(
            id=s.id,
            name=s.name,
            description=s.description or "",
            topic_count=topic_count
        ))
    return result

@router.get("/{subject_id}/graph", response_model=SubjectGraphResponse)
def get_subject_graph(
    subject_id: str,
    student_id: str = Query("demo_student"),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    topics = db.query(Topic).filter(Topic.subject_id == subject_id).all()
    topic_ids = {t.id for t in topics}

    edges_raw = db.query(TopicPrerequisite).filter(
        TopicPrerequisite.topic_id.in_(topic_ids)
    ).all()

    # Build prereq list per topic
    prereq_dict = {t.id: [] for t in topics}
    for e in edges_raw:
        if e.topic_id in prereq_dict:
            prereq_dict[e.topic_id].append(e.prerequisite_id)

    nodes = []
    active_root_cause = None

    for t in topics:
        mastery = get_or_create_mastery(db, student_id, t.id)
        if mastery.diagnostic_role == "ROOT CAUSE" or (mastery.status == "RED" and not active_root_cause):
            active_root_cause = t.id

        nodes.append(SubjectGraphNode(
            id=t.id,
            name=t.name,
            mastery=mastery.p,
            status=mastery.status,
            diagnostic_role=mastery.diagnostic_role,
            pages=t.pages or [],
            prerequisites=prereq_dict.get(t.id, [])
        ))

    edges = []
    for e in edges_raw:
        edges.append(SubjectGraphEdge(
            id=f"{e.prerequisite_id}->{e.topic_id}",
            source=e.prerequisite_id,
            target=e.topic_id,
            label="needs"
        ))

    return SubjectGraphResponse(
        subject_id=subject.id,
        subject_name=subject.name,
        nodes=nodes,
        edges=edges,
        active_root_cause=active_root_cause
    )
