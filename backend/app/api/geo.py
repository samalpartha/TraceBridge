"""Geo intelligence endpoints - heatmap data, sightings, movement corridors, Google Geocoding."""
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings
from app.models.match import SourceRecord
from app.models.case import Case
from app.models.geo import GeoEvent

router = APIRouter()


@router.get("/heatmap")
async def get_heatmap_data(db: AsyncSession = Depends(get_db)):
    """Return lat/lng points for crisis heatmap overlay."""
    # Source record locations (sightings)
    result = await db.execute(
        select(
            SourceRecord.location_lat,
            SourceRecord.location_lng,
            SourceRecord.source_type,
            func.count(SourceRecord.id).label("weight"),
        )
        .where(SourceRecord.location_lat.isnot(None))
        .group_by(SourceRecord.location_lat, SourceRecord.location_lng, SourceRecord.source_type)
    )
    sightings = [
        {"lat": r.location_lat, "lng": r.location_lng, "type": r.source_type, "weight": r.weight}
        for r in result.all()
    ]

    # Case last-known locations
    result2 = await db.execute(
        select(Case.last_known_lat, Case.last_known_lng, Case.person_name, Case.status)
        .where(Case.last_known_lat.isnot(None))
    )
    cases = [
        {"lat": r.last_known_lat, "lng": r.last_known_lng, "name": r.person_name, "status": r.status}
        for r in result2.all()
    ]

    return {"sightings": sightings, "cases": cases}


@router.get("/geocode")
async def geocode_address(address: str = Query(..., min_length=2)):
    """
    Geocode an address using Google Geocoding API.
    Returns lat/lng coordinates and formatted address.
    """
    api_key = settings.GOOGLE_API_KEY or settings.GOOGLE_MAPS_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="Google API key not configured")

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": api_key},
        )
        data = resp.json()

    if data.get("status") != "OK" or not data.get("results"):
        return {"results": [], "status": data.get("status", "UNKNOWN")}

    results = []
    for r in data["results"][:3]:
        loc = r.get("geometry", {}).get("location", {})
        results.append({
            "formatted_address": r.get("formatted_address", ""),
            "lat": loc.get("lat"),
            "lng": loc.get("lng"),
            "place_id": r.get("place_id", ""),
            "types": r.get("types", []),
        })

    return {"results": results, "status": "OK"}


@router.get("/events")
async def get_geo_events(case_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Return geo events for timeline/map."""
    query = select(GeoEvent).order_by(GeoEvent.created_at.desc()).limit(100)
    if case_id:
        try:
            cid = uuid.UUID(case_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid case_id format")
        query = query.where(GeoEvent.case_id == cid)
    result = await db.execute(query)
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "case_id": str(e.case_id) if e.case_id else None,
            "event_type": e.event_type,
            "lat": e.lat,
            "lng": e.lng,
            "description": e.description,
            "metadata": e.metadata_json,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]
