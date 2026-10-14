import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    topics = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(String, primary_key=True)  # stable string identifier
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False)
    name = Column(String, nullable=False)
    pages = Column(JSON, default=list)  # list of int page numbers
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subject = relationship("Subject", back_populates="topics")
    questions = relationship("Question", back_populates="topic", cascade="all, delete-orphan")
    
    # Direct prerequisites for this topic
    prerequisite_edges = relationship(
        "TopicPrerequisite",
        foreign_keys="TopicPrerequisite.topic_id",
        back_populates="topic",
        cascade="all, delete-orphan"
    )
    
    # Topics that depend on this topic
    dependent_edges = relationship(
        "TopicPrerequisite",
        foreign_keys="TopicPrerequisite.prerequisite_id",
        back_populates="prerequisite_topic",
        cascade="all, delete-orphan"
    )


class TopicPrerequisite(Base):
    __tablename__ = "topic_prerequisites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=False)
    prerequisite_id = Column(String, ForeignKey("topics.id"), nullable=False)

    topic = relationship("Topic", foreign_keys=[topic_id], back_populates="prerequisite_edges")
    prerequisite_topic = relationship("Topic", foreign_keys=[prerequisite_id], back_populates="dependent_edges")

    __table_args__ = (
        UniqueConstraint("topic_id", "prerequisite_id", name="uq_topic_prerequisite"),
    )


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=False)
    type = Column(String, default="mcq")  # "mcq" or "short"
    text = Column(Text, nullable=False)
    options = Column(JSON, default=list)  # list of {id, text, mistake_tag, misconception, root_topic}
    correct_option = Column(String, nullable=False)
    difficulty = Column(String, default="medium")
    is_counterexample = Column(Boolean, default=False)
    counter_belief_target = Column(String, nullable=True)

    topic = relationship("Topic", back_populates="questions")
    attempts = relationship("Attempt", back_populates="question")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    answer = Column(String, nullable=False)
    correct = Column(Boolean, nullable=False)
    time_sec = Column(Float, default=0.0)
    mistake_type = Column(String, nullable=True)  # concept_gap, careless_slip, wrong_mental_model, missing_prerequisite
    root_topic = Column(String, nullable=True)
    parent_attempt_id = Column(Integer, ForeignKey("attempts.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    question = relationship("Question", back_populates="attempts")
    parent_attempt = relationship("Attempt", remote_side=[id])


class Mastery(Base):
    __tablename__ = "mastery"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, nullable=False, index=True)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=False, index=True)
    p = Column(Float, default=0.5, nullable=False)
    status = Column(String, default="AMBER", nullable=False)  # RED, AMBER, GREEN
    diagnostic_role = Column(String, nullable=True)  # ROOT CAUSE, SYMPTOM, OK
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    topic = relationship("Topic")

    __table_args__ = (
        UniqueConstraint("student_id", "topic_id", name="uq_student_topic_mastery"),
    )


class TeachbackSession(Base):
    __tablename__ = "teachback_sessions"

    id = Column(String, primary_key=True)
    student_id = Column(String, nullable=False, index=True)
    topic_id = Column(String, ForeignKey("topics.id"), nullable=False)
    status = Column(String, default="active")  # active, completed
    score = Column(Integer, nullable=True)
    gaps = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    topic = relationship("Topic")
    messages = relationship("TeachbackMessage", back_populates="session", cascade="all, delete-orphan")


class TeachbackMessage(Base):
    __tablename__ = "teachback_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("teachback_sessions.id"), nullable=False)
    sender = Column(String, nullable=False)  # user, junior
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("TeachbackSession", back_populates="messages")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    student_id = Column(String, primary_key=True)
    display_name = Column(String, default="Alex Chen")
    avatar_url = Column(String, default="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80")
    points_balance = Column(Integer, default=150, nullable=False)
    total_earned_points = Column(Integer, default=150, nullable=False)
    level = Column(Integer, default=2, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class PetProfile(Base):
    __tablename__ = "pet_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, ForeignKey("student_profiles.student_id"), unique=True, nullable=False)
    pet_name = Column(String, default="Lumi", nullable=False)
    pet_type = Column(String, default="mirror_sprite", nullable=False)
    color_theme = Column(String, default="violet", nullable=False)  # violet, emerald, cyan, gold, pink
    equipped_outfit = Column(String, nullable=True)  # cosmetic ID
    equipped_accessory = Column(String, nullable=True)  # cosmetic ID
    equipped_effect = Column(String, nullable=True)  # cosmetic ID
    happiness = Column(Integer, default=85, nullable=False)
    last_interacted_at = Column(DateTime, default=datetime.datetime.utcnow)


class PetCosmetic(Base):
    __tablename__ = "pet_cosmetics"

    id = Column(String, primary_key=True)  # e.g., 'outfit_scholar', 'acc_wizard_hat'
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # outfit, accessory, effect, color
    price = Column(Integer, default=50, nullable=False)
    milestone_requirement = Column(String, nullable=True)  # e.g., 'resolve_counterexample', 'teachback_champ'
    description = Column(Text, default="")
    icon = Column(String, default="Sparkles")
    mesh_config = Column(JSON, default=dict)


class StudentInventory(Base):
    __tablename__ = "student_inventories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, nullable=False, index=True)
    cosmetic_id = Column(String, ForeignKey("pet_cosmetics.id"), nullable=False)
    acquired_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "cosmetic_id", name="uq_student_cosmetic"),
    )


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # positive = earned, negative = spent
    reason = Column(String, nullable=False)
    activity_type = Column(String, nullable=False)  # practice, recovery, teachback, notes, purchase
    reference_id = Column(String, nullable=True)  # idempotency key e.g. "attempt_1"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

