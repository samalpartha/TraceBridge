"""Search pipeline trigger - kicks off multi-agent orchestration."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import json
import asyncio

from app.database import get_db
from app.models.case import Case

router = APIRouter()


class SearchRequest(BaseModel):
    case_id: str


@router.post("/run")
async def run_search(req: SearchRequest, db: AsyncSession = Depends(get_db)):
    """Trigger the full multi-agent search pipeline for a case."""
    try:
        cid = uuid.UUID(req.case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid case_id format")
    result = await db.execute(
        select(Case).where(Case.id == cid)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Update status
    case.status = "searching"
    await db.commit()

    # Import and run orchestrator
    from app.agents.orchestrator import run_search_pipeline

    search_result = await run_search_pipeline(str(case.id), db)

    return search_result


@router.post("/run-stream")
async def run_search_stream(req: SearchRequest, db: AsyncSession = Depends(get_db)):
    """Stream search progress via SSE."""
    try:
        cid = uuid.UUID(req.case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid case_id format")
    result = await db.execute(
        select(Case).where(Case.id == cid)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case.status = "searching"
    await db.commit()

    async def event_stream():
        from app.agents.orchestrator import run_search_pipeline_streaming

        async for event in run_search_pipeline_streaming(str(case.id)):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
