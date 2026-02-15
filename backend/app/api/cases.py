"""Case management endpoints - CRUD + photo upload."""
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.case import Case, MediaAsset
from app.schemas.case import CaseResponse, CaseListResponse, CaseCreate

router = APIRouter()


@router.get("/", response_model=CaseListResponse)
async def list_cases(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    query = select(Case).order_by(Case.created_at.desc()).offset(skip).limit(limit)
    if status:
        query = query.where(Case.status == status)
    result = await db.execute(query)
    cases = result.scalars().all()

    count_q = select(func.count(Case.id))
    if status:
        count_q = count_q.where(Case.status == status)
    total = (await db.execute(count_q)).scalar()

    return CaseListResponse(cases=[CaseResponse.model_validate(c) for c in cases], total=total)


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str, db: AsyncSession = Depends(get_db)):
    try:
        cid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid case_id format")
    result = await db.execute(
        select(Case).where(Case.id == cid)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse.model_validate(case)


@router.post("/", response_model=CaseResponse)
async def create_case(
    person_name: str = Form(...),
    age: Optional[int] = Form(None),
    gender: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    last_known_location: Optional[str] = Form(None),
    last_known_lat: Optional[float] = Form(None),
    last_known_lng: Optional[float] = Form(None),
    last_known_date: Optional[str] = Form(None),
    contact_info: Optional[str] = Form(None),
    reporter_id: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    reporter_uuid = None
    if reporter_id:
        try:
            reporter_uuid = uuid.UUID(reporter_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid reporter_id format")

    case = Case(
        person_name=person_name,
        age=age,
        gender=gender,
        description=description,
        last_known_location=last_known_location,
        last_known_lat=last_known_lat,
        last_known_lng=last_known_lng,
        last_known_date=last_known_date,
        contact_info=contact_info,
        reporter_id=reporter_uuid,
        status="open",
    )
    db.add(case)
    await db.flush()

    # Handle photo upload
    if photo:
        ext = os.path.splitext(photo.filename)[1] if photo.filename else ".jpg"
        filename = f"{case.id}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        content = await photo.read()
        with open(filepath, "wb") as f:
            f.write(content)

        media = MediaAsset(
            case_id=case.id,
            file_path=f"/uploads/{filename}",
            media_type="photo",
            original_filename=photo.filename,
        )
        db.add(media)

    await db.commit()
    await db.refresh(case)
    return CaseResponse.model_validate(case)


@router.patch("/{case_id}/status")
async def update_case_status(
    case_id: str, status: str, db: AsyncSession = Depends(get_db)
):
    valid_statuses = ["open", "searching", "matched", "verified", "reunited", "closed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    try:
        cid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid case_id format")
    result = await db.execute(select(Case).where(Case.id == cid))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case.status = status
    await db.commit()
    return {"id": str(case.id), "status": case.status}


@router.get("/{case_id}/media")
async def get_case_media(case_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MediaAsset).where(MediaAsset.case_id == uuid.UUID(case_id))
    )
    media = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "file_path": m.file_path,
            "media_type": m.media_type,
            "original_filename": m.original_filename,
        }
        for m in media
    ]
