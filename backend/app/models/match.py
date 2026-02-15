"""MatchCandidate, VerificationAction, and SourceRecord models."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.database import Base
from app.config import settings


class SourceRecord(Base):
    """Records from external sources - shelters, hospitals, registries, news."""
    __tablename__ = "source_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_type = Column(String(50), nullable=False, index=True)
    # shelter | hospital | registry | news | social_media
    source_url = Column(String(1000), nullable=True)
    person_name = Column(String(255), nullable=True, index=True)
    age = Column(String(20), nullable=True)
    gender = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    photo_url = Column(String(1000), nullable=True)
    location_name = Column(String(500), nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    text_embedding = Column(Vector(settings.TEXT_EMBEDDING_DIM), nullable=True)
    face_embedding = Column(Vector(settings.FACE_EMBEDDING_DIM), nullable=True)
    raw_data = Column(JSONB, nullable=True)
    tinyfish_run_id = Column(String(255), nullable=True)

    scanned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MatchCandidate(Base):
    """A potential match between a case and a source record."""
    __tablename__ = "match_candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False)
    source_record_id = Column(UUID(as_uuid=True), ForeignKey("source_records.id"), nullable=True)

    vision_score = Column(Float, nullable=True, default=0.0)
    rag_score = Column(Float, nullable=True, default=0.0)
    geo_score = Column(Float, nullable=True, default=0.0)
    fused_score = Column(Float, nullable=True, default=0.0)

    evidence = Column(JSONB, nullable=True)
    # { vision_evidence: {...}, rag_evidence: {...}, geo_evidence: {...}, explanation: "..." }

    status = Column(String(50), nullable=False, default="pending")
    # pending | approved | rejected | escalated

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    case = relationship("Case", back_populates="match_candidates")
    source_record = relationship("SourceRecord")
    verifications = relationship("VerificationAction", back_populates="match")


class VerificationAction(Base):
    """Caseworker verification actions on match candidates."""
    __tablename__ = "verification_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("match_candidates.id"), nullable=False)
    caseworker_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)  # approve | reject | escalate
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    match = relationship("MatchCandidate", back_populates="verifications")
