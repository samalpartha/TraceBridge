"""
Live data ingestion service.

Pulls real data from:
1. FBI Wanted API (missing persons, kidnappings) - free, no auth
2. IOM Missing Migrants Project CSV (21k+ incidents with coordinates)
3. TinyFish web agent for scraping NamUs / other live sources

Stores as SourceRecords + GeoEvents for the platform to search and display.
"""
import csv
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.match import SourceRecord
from app.models.geo import GeoEvent

logger = logging.getLogger(__name__)

# ─── FBI Wanted API ──────────────────────────────────────────────────

FBI_API_BASE = "https://api.fbi.gov/wanted/v1/list"

async def fetch_fbi_missing_persons(page: int = 1, page_size: int = 20) -> dict:
    """Fetch missing persons from FBI Wanted API (no auth needed)."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            FBI_API_BASE,
            params={
                "pageSize": page_size,
                "page": page,
                "poster_classification": "missing",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_fbi_kidnappings(page: int = 1, page_size: int = 20) -> dict:
    """Fetch kidnapping/missing cases from FBI."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            FBI_API_BASE,
            params={
                "pageSize": page_size,
                "page": page,
                "poster_classification": "kidnapping",
            },
        )
        resp.raise_for_status()
        return resp.json()


def _fbi_item_to_source_record(item: dict) -> dict:
    """Transform an FBI Wanted API item into SourceRecord fields."""
    title = item.get("title", "Unknown")
    description_parts = []
    if item.get("description"):
        description_parts.append(item["description"])
    if item.get("details"):
        # Strip HTML tags roughly
        import re
        details = re.sub(r"<[^>]+>", " ", item["details"])
        details = re.sub(r"\s+", " ", details).strip()
        description_parts.append(details[:500])

    # Get first image
    images = item.get("images") or []
    photo_url = images[0]["original"] if images else None

    # Extract location from description or field offices
    location_name = None
    if item.get("description"):
        location_name = item["description"].strip()
    elif item.get("field_offices"):
        location_name = ", ".join(item["field_offices"]).title()

    # Coordinates if available
    coords = item.get("coordinates") or []
    lat = coords[0] if len(coords) >= 2 else None
    lng = coords[1] if len(coords) >= 2 else None

    subjects = item.get("subjects") or []
    source_type = "fbi_missing"
    if any("Kidnap" in s for s in subjects):
        source_type = "fbi_kidnapping"

    return {
        "source_type": source_type,
        "source_url": item.get("url", ""),
        "person_name": title,
        "age": f"{item.get('age_min', '')}-{item.get('age_max', '')}" if item.get("age_min") else None,
        "gender": item.get("sex"),
        "description": " | ".join(description_parts)[:1000] if description_parts else None,
        "photo_url": photo_url,
        "location_name": location_name,
        "location_lat": lat,
        "location_lng": lng,
        "raw_data": {
            "fbi_uid": item.get("uid"),
            "ncic": item.get("ncic"),
            "race": item.get("race"),
            "hair": item.get("hair"),
            "eyes": item.get("eyes"),
            "weight": item.get("weight"),
            "height_min": item.get("height_min"),
            "height_max": item.get("height_max"),
            "scars_and_marks": item.get("scars_and_marks"),
            "reward_max": item.get("reward_max"),
            "subjects": subjects,
            "publication": item.get("publication"),
            "modified": item.get("modified"),
        },
    }


async def ingest_fbi_data(db: Session) -> dict:
    """
    Pull all FBI missing persons + kidnapping data and upsert into DB.
    Returns counts of new/updated records.
    """
    stats = {"fbi_missing_new": 0, "fbi_kidnapping_new": 0, "fbi_total_fetched": 0, "geo_events_created": 0}

    for fetch_fn, label in [
        (fetch_fbi_missing_persons, "fbi_missing"),
        (fetch_fbi_kidnappings, "fbi_kidnapping"),
    ]:
        page = 1
        while True:
            try:
                data = await fetch_fn(page=page, page_size=50)
            except Exception as e:
                logger.error(f"FBI API error ({label} page {page}): {e}")
                break

            items = data.get("items", [])
            if not items:
                break

            stats["fbi_total_fetched"] += len(items)

            for item in items:
                fields = _fbi_item_to_source_record(item)
                fbi_uid = (fields.get("raw_data") or {}).get("fbi_uid")

                # Check if already exists by source_url
                existing = db.execute(
                    select(SourceRecord).where(SourceRecord.source_url == fields["source_url"])
                ).scalars().first()

                if existing:
                    # Update existing record
                    for k, v in fields.items():
                        if v is not None:
                            setattr(existing, k, v)
                    existing.scanned_at = datetime.now(timezone.utc)
                else:
                    # Create new
                    sr = SourceRecord(id=uuid.uuid4(), **fields)
                    db.add(sr)
                    stats[f"{label}_new"] += 1

                    # Also create a geo event if we have coordinates
                    if fields.get("location_lat") and fields.get("location_lng"):
                        geo = GeoEvent(
                            id=uuid.uuid4(),
                            event_type="fbi_report",
                            lat=fields["location_lat"],
                            lng=fields["location_lng"],
                            description=f"FBI: {fields['person_name']} - {fields.get('location_name', '')}",
                            metadata_json={"source": label, "person_name": fields["person_name"]},
                        )
                        db.add(geo)
                        stats["geo_events_created"] += 1

            total = data.get("total", 0)
            if page * 50 >= total:
                break
            page += 1

    db.commit()
    logger.info(f"FBI ingestion complete: {stats}")
    return stats


# ─── IOM Missing Migrants CSV ───────────────────────────────────────

def parse_iom_coordinates(coord_str: str) -> tuple[Optional[float], Optional[float]]:
    """Parse 'lat, lng' string from IOM data."""
    if not coord_str or not coord_str.strip():
        return None, None
    try:
        parts = coord_str.split(",")
        if len(parts) == 2:
            return float(parts[0].strip()), float(parts[1].strip())
    except (ValueError, IndexError):
        pass
    return None, None


def ingest_iom_csv(db: Session, csv_path: str, limit: Optional[int] = None, us_only: bool = False) -> dict:
    """
    Load IOM Missing Migrants CSV into SourceRecords + GeoEvents.
    """
    stats = {"rows_read": 0, "records_created": 0, "geo_events_created": 0, "skipped": 0}

    if not os.path.exists(csv_path):
        logger.error(f"IOM CSV not found: {csv_path}")
        return stats

    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            stats["rows_read"] += 1
            if limit and stats["records_created"] >= limit:
                break

            country = row.get("Country of Incident", "")
            if us_only and "United States" not in country:
                stats["skipped"] += 1
                continue

            incident_id = row.get("Incident ID", "")
            if not incident_id:
                continue

            # Check duplicate
            existing = db.execute(
                select(SourceRecord).where(
                    SourceRecord.source_url == f"iom:{incident_id}"
                )
            ).scalars().first()
            if existing:
                stats["skipped"] += 1
                continue

            lat, lng = parse_iom_coordinates(row.get("Coordinates", ""))

            dead = row.get("Number of Dead", "0")
            missing = row.get("Minimum Estimated Number of Missing", "0")
            total = row.get("Total Number of Dead and Missing", "0")
            children = row.get("Number of Children", "")
            cause = row.get("Cause of Death", "")
            route = row.get("Migration Route", "")
            location = row.get("Location of Incident", "")
            region = row.get("Region of Incident", "")
            date = row.get("Incident Date", "")
            origin = row.get("Country of Origin", "")
            source_quality = row.get("Source Quality", "")
            info_source = row.get("Information Source", "")
            url = row.get("URL", "")

            description = (
                f"Incident: {dead} dead, {missing} missing. "
                f"Route: {route}. Cause: {cause}. "
                f"Origin: {origin}. Children: {children or 'unknown'}."
            )

            sr = SourceRecord(
                id=uuid.uuid4(),
                source_type="iom_migrants",
                source_url=f"iom:{incident_id}",
                person_name=f"IOM Incident #{incident_id}",
                description=description[:1000],
                location_name=f"{location}, {country}" if location else country,
                location_lat=lat,
                location_lng=lng,
                raw_data={
                    "incident_id": incident_id,
                    "incident_type": row.get("Incident Type", ""),
                    "incident_date": date,
                    "incident_year": row.get("Incident Year", ""),
                    "dead": dead,
                    "missing": missing,
                    "total": total,
                    "survivors": row.get("Number of Survivors", ""),
                    "children": children,
                    "females": row.get("Number of Females", ""),
                    "males": row.get("Number of Males", ""),
                    "cause_of_death": cause,
                    "migration_route": route,
                    "region": region,
                    "country_of_origin": origin,
                    "source_quality": source_quality,
                    "information_source": info_source,
                    "url": url,
                },
            )
            db.add(sr)
            stats["records_created"] += 1

            # Geo event
            if lat and lng:
                geo = GeoEvent(
                    id=uuid.uuid4(),
                    event_type="iom_incident",
                    lat=lat,
                    lng=lng,
                    description=f"IOM: {total} dead/missing near {location or country}. {cause}.",
                    metadata_json={
                        "source": "iom_migrants",
                        "incident_id": incident_id,
                        "dead": dead,
                        "missing": missing,
                        "date": date,
                        "route": route,
                    },
                )
                db.add(geo)
                stats["geo_events_created"] += 1

    db.commit()
    logger.info(f"IOM ingestion complete: {stats}")
    return stats


# ─── Combined ingestion ─────────────────────────────────────────────

async def run_full_ingestion(db: Session, iom_csv_path: Optional[str] = None) -> dict:
    """Run full data ingestion from all sources."""
    results = {}

    # FBI
    try:
        results["fbi"] = await ingest_fbi_data(db)
    except Exception as e:
        logger.error(f"FBI ingestion failed: {e}")
        results["fbi"] = {"error": str(e)}

    # IOM
    if iom_csv_path and os.path.exists(iom_csv_path):
        try:
            results["iom"] = ingest_iom_csv(db, iom_csv_path, us_only=False)
        except Exception as e:
            logger.error(f"IOM ingestion failed: {e}")
            results["iom"] = {"error": str(e)}

    return results
