"""Pydantic schemas for Geo endpoints."""
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class GeoEventResponse(BaseModel):
    id: str
    case_id: Optional[str] = None
    event_type: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    description: Optional[str] = None
    metadata: Optional[Any] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    weight: float = 1.0
    label: Optional[str] = None
