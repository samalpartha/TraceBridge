"""Pydantic schemas for Outreach endpoints."""
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class OutreachEventResponse(BaseModel):
    id: str
    match_id: str
    channel: str
    tinyfish_run_id: Optional[str] = None
    status: str
    response_data: Optional[Any] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
