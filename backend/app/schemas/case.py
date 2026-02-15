"""Pydantic schemas for Case endpoints."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CaseCreate(BaseModel):
    person_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    description: Optional[str] = None
    last_known_location: Optional[str] = None
    last_known_lat: Optional[float] = None
    last_known_lng: Optional[float] = None
    last_known_date: Optional[str] = None
    contact_info: Optional[str] = None
    reporter_id: Optional[str] = None


class MediaAssetResponse(BaseModel):
    id: str
    file_path: str
    media_type: str
    original_filename: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if hasattr(obj, "id"):
            return cls(
                id=str(obj.id),
                file_path=obj.file_path,
                media_type=obj.media_type,
                original_filename=obj.original_filename,
            )
        return super().model_validate(obj, **kwargs)


class CaseResponse(BaseModel):
    id: str
    person_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    description: Optional[str] = None
    last_known_location: Optional[str] = None
    last_known_lat: Optional[float] = None
    last_known_lng: Optional[float] = None
    last_known_date: Optional[str] = None
    contact_info: Optional[str] = None
    status: str
    reporter_id: Optional[str] = None
    media_assets: List[MediaAssetResponse] = []
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if hasattr(obj, "id"):
            media = []
            if hasattr(obj, "media_assets") and obj.media_assets:
                media = [MediaAssetResponse.model_validate(m) for m in obj.media_assets]
            return cls(
                id=str(obj.id),
                person_name=obj.person_name,
                age=obj.age,
                gender=obj.gender,
                description=obj.description,
                last_known_location=obj.last_known_location,
                last_known_lat=obj.last_known_lat,
                last_known_lng=obj.last_known_lng,
                last_known_date=obj.last_known_date,
                contact_info=obj.contact_info,
                status=obj.status,
                reporter_id=str(obj.reporter_id) if obj.reporter_id else None,
                media_assets=media,
                created_at=obj.created_at,
            )
        return super().model_validate(obj, **kwargs)


class CaseListResponse(BaseModel):
    cases: List[CaseResponse]
    total: int
