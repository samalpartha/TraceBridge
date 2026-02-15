"""Pydantic schemas for Match endpoints."""
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class MatchResponse(BaseModel):
    id: str
    case_id: str
    source_record_id: Optional[str] = None
    vision_score: Optional[float] = None
    rag_score: Optional[float] = None
    geo_score: Optional[float] = None
    fused_score: Optional[float] = None
    evidence: Optional[Any] = None
    status: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SourceRecordResponse(BaseModel):
    id: str
    source_type: str
    source_url: Optional[str] = None
    person_name: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    location_name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    scanned_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
