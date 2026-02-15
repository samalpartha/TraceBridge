"""Dashboard KPI endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.case import Case
from app.models.match import MatchCandidate, SourceRecord
from app.models.outreach import OutreachEvent

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Return KPI stats for the dashboard."""
    # Total cases
    total_cases = (await db.execute(select(func.count(Case.id)))).scalar() or 0

    # Cases by status
    status_result = await db.execute(
        select(Case.status, func.count(Case.id)).group_by(Case.status)
    )
    status_counts = {row[0]: row[1] for row in status_result.all()}

    # Total matches found
    total_matches = (await db.execute(select(func.count(MatchCandidate.id)))).scalar() or 0

    # Approved matches
    approved = (
        await db.execute(
            select(func.count(MatchCandidate.id)).where(MatchCandidate.status == "approved")
        )
    ).scalar() or 0

    # Source records indexed
    total_sources = (await db.execute(select(func.count(SourceRecord.id)))).scalar() or 0

    # Outreach events
    total_outreach = (await db.execute(select(func.count(OutreachEvent.id)))).scalar() or 0

    # Reunification rate
    reunited = status_counts.get("reunited", 0)
    reunion_rate = (reunited / total_cases * 100) if total_cases > 0 else 0

    return {
        "total_cases": total_cases,
        "status_counts": status_counts,
        "active_cases": status_counts.get("open", 0) + status_counts.get("searching", 0),
        "total_matches": total_matches,
        "approved_matches": approved,
        "total_source_records": total_sources,
        "total_outreach_events": total_outreach,
        "reunification_rate": round(reunion_rate, 1),
        "reunited_count": reunited,
    }
