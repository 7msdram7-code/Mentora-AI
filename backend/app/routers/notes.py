import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, Topic, TopicPrerequisite, Question
from app.schemas import NotesDraftResponse, NotesCommitRequest
from app.extractor import (
    extract_text_from_pdf,
    extract_text_from_pptx,
    extract_text_from_image,
    generate_draft_from_extracted_pages
)
from app.graph import validate_dag

router = APIRouter(prefix="/notes", tags=["Notes"])

ALLOWED_EXTENSIONS = {".pdf", ".pptx", ".ppt", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

@router.post("", response_model=NotesDraftResponse)
async def upload_notes(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None)
):
    """
    Accepts PDF, PPTX, or image, extracts pages and text,
    and generates an editable draft topic graph with draft questions.
    """
    filename = file.filename or "notes.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported: PDF, PPTX, PNG, JPG."
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds maximum 25MB limit.")

    # Extract text by file type
    if ext == ".pdf":
        pages = extract_text_from_pdf(content)
    elif ext in {".pptx", ".ppt"}:
        pages = extract_text_from_pptx(content)
    else:
        pages = extract_text_from_image(content)

    if not pages:
        pages = [{"page": 1, "text": f"Uploaded course document: {filename}"}]

    clean_title = title or os.path.splitext(filename)[0].replace("_", " ").title()
    draft = generate_draft_from_extracted_pages(clean_title, pages)
    return draft

@router.post("/commit")
def commit_draft_subject(payload: NotesCommitRequest, db: Session = Depends(get_db)):
    """
    Validates and persists the reviewed course topic graph and questions into the database.
    """
    # Validate DAG structure
    topics_dict = [t.model_dump() for t in payload.topics]
    is_valid, error_msg = validate_dag(topics_dict)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid graph structure: {error_msg}")

    # Create Subject
    subject_id = payload.subject_id.strip() or f"sub_{uuid.uuid4().hex[:8]}"
    existing_sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if existing_sub:
        subject_id = f"{subject_id}_{uuid.uuid4().hex[:4]}"

    subject = Subject(
        id=subject_id,
        name=payload.title,
        description=payload.description
    )
    db.add(subject)
    db.flush()

    # Create Topics
    for t in payload.topics:
        topic_obj = Topic(
            id=t.id,
            subject_id=subject.id,
            name=t.name,
            pages=t.pages
        )
        db.add(topic_obj)
    db.flush()

    # Create Prerequisite Edges
    for t in payload.topics:
        for p in t.prerequisites:
            edge = TopicPrerequisite(
                topic_id=t.id,
                prerequisite_id=p
            )
            db.add(edge)
    db.flush()

    # Create Questions
    for q in payload.questions:
        q_options = [opt.model_dump() for opt in q.options]
        question_obj = Question(
            topic_id=q.topic_id,
            type="mcq",
            text=q.text,
            options=q_options,
            correct_option=q.correct_option,
            difficulty=q.difficulty,
            is_counterexample=False
        )
        db.add(question_obj)

    db.commit()

    # Award learning points for creating a new Knowledge Graph
    try:
        from app.routers.pet import award_learning_points
        award_learning_points(
            db=db,
            student_id="demo_student",
            amount=15,
            reason=f"Generated Knowledge Graph for '{subject.name}'",
            activity_type="notes",
            reference_id=f"notes_{subject.id}"
        )
        db.commit()
    except Exception:
        pass

    return {
        "status": "success",
        "subject_id": subject.id,
        "message": f"Subject '{subject.name}' successfully added with {len(payload.topics)} topics."
    }
