"""Match candidate endpoints - view, verify, reject."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.database import get_db
from app.models.match import MatchCandidate, VerificationAction, SourceRecord

router = APIRouter()


class VerifyRequest(BaseModel):
    action: str  # approve | reject | escalate
    caseworker_id: Optional[str] = None
    notes: Optional[str] = None


def _parse_uuid(value: str, name: str = "ID") -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Invalid {name} format")


@router.get("/case/{case_id}")
async def get_matches_for_case(case_id: str, db: AsyncSession = Depends(get_db)):
    cid = _parse_uuid(case_id, "case_id")
    result = await db.execute(
        select(MatchCandidate)
        .where(MatchCandidate.case_id == cid)
        .order_by(MatchCandidate.fused_score.desc())
    )
    matches = result.scalars().all()

    # Enrich with source record data
    enriched = []
    for m in matches:
        data = {
            "id": str(m.id),
            "case_id": str(m.case_id),
            "source_record_id": str(m.source_record_id) if m.source_record_id else None,
            "vision_score": m.vision_score,
            "rag_score": m.rag_score,
            "geo_score": m.geo_score,
            "fused_score": m.fused_score,
            "evidence": m.evidence,
            "status": m.status,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "person_name": None,
            "location_name": None,
            "description": None,
            "source_type": None,
        }
        # Join source record for display fields
        if m.source_record_id:
            sr_result = await db.execute(
                select(SourceRecord).where(SourceRecord.id == m.source_record_id)
            )
            sr = sr_result.scalar_one_or_none()
            if sr:
                data["person_name"] = sr.person_name
                data["location_name"] = sr.location_name
                data["description"] = sr.description
                data["source_type"] = sr.source_type
        enriched.append(data)
    return enriched


@router.post("/{match_id}/verify")
async def verify_match(
    match_id: str, req: VerifyRequest, db: AsyncSession = Depends(get_db)
):
    mid = _parse_uuid(match_id, "match_id")
    result = await db.execute(
        select(MatchCandidate).where(MatchCandidate.id == mid)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if req.action not in ("approve", "reject", "escalate"):
        raise HTTPException(status_code=400, detail="Invalid action")

    # Map action verbs to status nouns
    status_map = {"approve": "approved", "reject": "rejected", "escalate": "escalated"}
    match.status = status_map[req.action]

    caseworker_uuid = None
    if req.caseworker_id:
        caseworker_uuid = _parse_uuid(req.caseworker_id, "caseworker_id")

    verification = VerificationAction(
        match_id=match.id,
        caseworker_id=caseworker_uuid,
        action=req.action,
        notes=req.notes,
    )
    db.add(verification)
    await db.commit()

    return {"match_id": str(match.id), "status": match.status, "action": req.action}
