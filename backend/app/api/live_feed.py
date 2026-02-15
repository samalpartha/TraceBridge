"""
Live data feed API endpoints.

Provides:
- /api/live/feed - Recent ingested records with pagination
- /api/live/stats - External data source statistics  
- /api/live/ingest - Trigger data ingestion (FBI + IOM)
- /api/live/fbi - Direct proxy to FBI Wanted API
"""
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, SyncSessionLocal
from app.models.match import SourceRecord
from app.models.geo import GeoEvent
from app.services.data_ingest import (
    ingest_fbi_data,
    ingest_iom_csv,
    fetch_fbi_missing_persons,
    fetch_fbi_kidnappings,
)

router = APIRouter()

_executor = ThreadPoolExecutor(max_workers=2)


@router.get("/feed")
async def get_live_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source_type: str = Query(None, description="Filter by source: fbi_missing, fbi_kidnapping, iom_migrants"),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated live data feed of ingested records."""
    query = select(SourceRecord).order_by(desc(SourceRecord.scanned_at))

    if source_type:
        query = query.where(SourceRecord.source_type == source_type)

    # Count
    count_query = select(func.count(SourceRecord.id))
    if source_type:
        count_query = count_query.where(SourceRecord.source_type == source_type)
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    results = (await db.execute(query.offset(offset).limit(page_size))).scalars().all()

    items = []
    for r in results:
        items.append({
            "id": str(r.id),
            "source_type": r.source_type,
            "source_url": r.source_url,
            "person_name": r.person_name,
            "description": r.description,
            "photo_url": r.photo_url,
            "location_name": r.location_name,
            "location_lat": r.location_lat,
            "location_lng": r.location_lng,
            "age": r.age,
            "gender": r.gender,
            "raw_data": r.raw_data,
            "scanned_at": r.scanned_at.isoformat() if r.scanned_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }


@router.get("/stats")
async def get_external_data_stats(db: AsyncSession = Depends(get_db)):
    """Get statistics about ingested external data."""
    # Count by source type
    type_counts = await db.execute(
        select(SourceRecord.source_type, func.count(SourceRecord.id))
        .group_by(SourceRecord.source_type)
    )
    source_breakdown = {row[0]: row[1] for row in type_counts.all()}

    # Total records
    total_records = sum(source_breakdown.values())

    # Records with coordinates
    geo_records = (
        await db.execute(
            select(func.count(SourceRecord.id)).where(
                SourceRecord.location_lat.isnot(None),
                SourceRecord.location_lng.isnot(None),
            )
        )
    ).scalar() or 0

    # Records with photos
    photo_records = (
        await db.execute(
            select(func.count(SourceRecord.id)).where(
                SourceRecord.photo_url.isnot(None)
            )
        )
    ).scalar() or 0

    # Most recent scan time
    latest_scan = (
        await db.execute(
            select(func.max(SourceRecord.scanned_at))
        )
    ).scalar()

    # Geo events count
    geo_events_total = (await db.execute(select(func.count(GeoEvent.id)))).scalar() or 0

    return {
        "total_records": total_records,
        "source_breakdown": source_breakdown,
        "geo_records": geo_records,
        "photo_records": photo_records,
        "geo_events_total": geo_events_total,
        "last_ingestion": latest_scan.isoformat() if latest_scan else None,
        "sources": [
            {
                "name": "FBI Wanted API",
                "type": "fbi_missing",
                "status": "active",
                "description": "Missing persons and kidnapping cases from FBI",
                "count": source_breakdown.get("fbi_missing", 0) + source_breakdown.get("fbi_kidnapping", 0),
                "url": "https://api.fbi.gov/wanted/v1/list",
                "auth": "None required",
            },
            {
                "name": "IOM Missing Migrants",
                "type": "iom_migrants",
                "status": "active",
                "description": "Global missing migrants incidents from IOM (2014-2026)",
                "count": source_breakdown.get("iom_migrants", 0),
                "url": "https://missingmigrants.iom.int",
                "auth": "Open data (CC BY 4.0)",
            },
        ],
    }


@router.post("/ingest")
async def trigger_ingestion(
    sources: str = Query("all", description="all | fbi | iom"),
):
    """
    Trigger data ingestion from external sources.
    Runs in background thread to avoid blocking.
    """
    def _run_sync_ingest():
        db = SyncSessionLocal()
        results = {}
        try:
            if sources in ("all", "fbi"):
                # Run async FBI ingest in a new event loop
                loop = asyncio.new_event_loop()
                try:
                    results["fbi"] = loop.run_until_complete(ingest_fbi_data(db))
                finally:
                    loop.close()

            if sources in ("all", "iom"):
                csv_path = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                    "..", "data", "external", "iom_all_data.csv"
                )
                csv_path = os.path.abspath(csv_path)
                if os.path.exists(csv_path):
                    results["iom"] = ingest_iom_csv(db, csv_path, limit=2000)
                else:
                    results["iom"] = {"error": f"CSV not found at {csv_path}"}
        except Exception as e:
            results["error"] = str(e)
        finally:
            db.close()
        return results

    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(_executor, _run_sync_ingest)

    return {
        "status": "completed",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }


@router.get("/fbi/missing")
async def get_fbi_missing(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    """Direct proxy to FBI Wanted API for missing persons."""
    try:
        data = await fetch_fbi_missing_persons(page=page, page_size=page_size)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"FBI API error: {str(e)}")


@router.get("/fbi/kidnappings")
async def get_fbi_kidnappings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    """Direct proxy to FBI Wanted API for kidnapping cases."""
    try:
        data = await fetch_fbi_kidnappings(page=page, page_size=page_size)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"FBI API error: {str(e)}")
