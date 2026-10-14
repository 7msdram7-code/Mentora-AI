from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.seed import seed_database
from app.routers import (
    health,
    subjects,
    questions,
    answers,
    notes,
    teachback,
    revision,
    demo,
    progress,
    pet
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed default subject
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="MistakeMirror API",
    description="AI-powered diagnostic tutor tracing student mistakes to prerequisite root causes.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api
app.include_router(health.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(answers.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(teachback.router, prefix="/api")
app.include_router(revision.router, prefix="/api")
app.include_router(demo.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
app.include_router(pet.router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "MistakeMirror API is running. Access interactive docs at /docs",
        "docs": "/docs",
        "health": "/api/health"
    }
