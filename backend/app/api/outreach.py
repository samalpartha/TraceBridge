"""Outreach endpoints - trigger TinyFish automations and alerts."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import json

from app.database import get_db
from app.models.match import MatchCandidate
from app.models.outreach import OutreachEvent

router = APIRouter()


class OutreachRequest(BaseModel):
    match_id: str
    channel: str = "tinyfish"  # tinyfish | email | sms
    target_url: Optional[str] = None
    message: Optional[str] = None


@router.post("/trigger")
async def trigger_outreach(req: OutreachRequest, db: AsyncSession = Depends(get_db)):
    """Trigger an outreach workflow for an approved match."""
    try:
        mid = uuid.UUID(req.match_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid match_id format")

    result = await db.execute(
        select(MatchCandidate).where(MatchCandidate.id == mid)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if req.channel == "tinyfish":
        from app.agents.outreach_agent import run_tinyfish_outreach
        try:
            outreach_result = await run_tinyfish_outreach(match, req.target_url, req.message)
        except Exception as e:
            outreach_result = {"status": "FAILED", "error": str(e)}

        event = OutreachEvent(
            match_id=match.id,
            channel="tinyfish",
            tinyfish_run_id=outreach_result.get("run_id"),
            status=outreach_result.get("status", "sent"),
            response_data=outreach_result,
        )
        db.add(event)
        await db.commit()

        return {"status": "sent", "outreach_id": str(event.id), "result": outreach_result}
    else:
        # Email/SMS placeholder
        event = OutreachEvent(
            match_id=match.id,
            channel=req.channel,
            status="sent",
            response_data={"message": req.message},
        )
        db.add(event)
        await db.commit()
        return {"status": "sent", "outreach_id": str(event.id)}


@router.post("/trigger-stream")
async def trigger_outreach_stream(req: OutreachRequest, db: AsyncSession = Depends(get_db)):
    """Stream outreach progress via SSE (TinyFish browser automation)."""
    try:
        mid = uuid.UUID(req.match_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid match_id format")
    result = await db.execute(
        select(MatchCandidate).where(MatchCandidate.id == mid)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    async def event_stream():
        from app.agents.outreach_agent import run_tinyfish_outreach_stream
        async for event in run_tinyfish_outreach_stream(match, req.target_url, req.message):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/history/{match_id}")
async def get_outreach_history(match_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OutreachEvent)
        .where(OutreachEvent.match_id == uuid.UUID(match_id))
        .order_by(OutreachEvent.created_at.desc())
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "channel": e.channel,
            "status": e.status,
            "tinyfish_run_id": e.tinyfish_run_id,
            "response_data": e.response_data,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]
