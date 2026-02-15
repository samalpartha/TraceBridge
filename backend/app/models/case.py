"""Case and MediaAsset models."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.database import Base
from app.config import settings


class Case(Base):
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    person_name = Column(String(255), nullable=False, index=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    last_known_location = Column(String(500), nullable=True)
    last_known_lat = Column(Float, nullable=True)
    last_known_lng = Column(Float, nullable=True)
    last_known_date = Column(String(50), nullable=True)
    contact_info = Column(String(500), nullable=True)
    status = Column(String(50), nullable=False, default="open", index=True)
    # open | searching | matched | verified | reunited | closed

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    media_assets = relationship("MediaAsset", back_populates="case", lazy="selectin")
    match_candidates = relationship("MatchCandidate", back_populates="case", lazy="selectin")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    media_type = Column(String(20), nullable=False, default="photo")  # photo | video
    original_filename = Column(String(255), nullable=True)
    face_embedding = Column(Vector(settings.FACE_EMBEDDING_DIM), nullable=True)
    metadata_json = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    case = relationship("Case", back_populates="media_assets")
