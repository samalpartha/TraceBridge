"""
Legacy Intelligence API — Cold case and historical identity resolution.

Provides descriptor-based search across historical unresolved cases,
narrative similarity scoring, and identity enrichment data.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Simulated Legacy Intelligence Registry ──────────────────────────
# In production, this would be backed by pgvector + structured descriptor index.

LEGACY_RECORDS = [
    {
        "id": "LC-001",
        "name": "John Doe #47",
        "age_estimate": "30-40",
        "gender": "Male",
        "descriptors": {
            "scars": "3-inch scar left forearm",
            "tattoos": "Rose on left upper arm",
            "clothing": "Blue denim jacket, white sneakers",
            "hair": "Brown, short",
            "height": "5'10\"",
            "dental": "Missing upper left molar",
        },
        "narrative": "Found unresponsive near highway overpass after Hurricane Maria evacuation. No identification documents. Subject had blue denim jacket with faded logo. Rose tattoo on left upper arm. 3-inch surgical scar on left forearm.",
        "region": "Gulf Coast, TX",
        "year": 2017,
        "status": "Unresolved",
        "source": "Open Intelligence Registry",
        "lat": 29.71,
        "lng": -95.35,
    },
    {
        "id": "LC-002",
        "name": "Maria Doe #12",
        "age_estimate": "20-25",
        "gender": "Female",
        "descriptors": {
            "scars": "Birthmark on right shoulder",
            "tattoos": "Butterfly on ankle",
            "clothing": "Red sweater, dark jeans",
            "hair": "Black, long",
            "height": "5'4\"",
            "jewelry": "Silver cross necklace",
        },
        "narrative": "Young woman located at temporary shelter following border crossing incident. Spanish-speaking, no ID. Wearing silver cross necklace and red sweater. Small butterfly tattoo on right ankle. Birthmark on right shoulder.",
        "region": "Southwest Border, AZ",
        "year": 2019,
        "status": "Unresolved",
        "source": "Open Intelligence Registry",
        "lat": 31.95,
        "lng": -110.87,
    },
    {
        "id": "LC-003",
        "name": "David Doe #89",
        "age_estimate": "55-65",
        "gender": "Male",
        "descriptors": {
            "scars": "Burn marks on both hands",
            "clothing": "Green army jacket, work boots",
            "hair": "Gray, balding",
            "height": "5'8\"",
            "medical": "Diabetes, insulin-dependent",
        },
        "narrative": "Elderly male found disoriented near evacuation route during California wildfire. Burn marks on both hands suggest close proximity to fire. Wearing green army surplus jacket. Required immediate medical attention for diabetic episode.",
        "region": "Paradise, CA",
        "year": 2018,
        "status": "Unresolved",
        "source": "Open Intelligence Registry",
        "lat": 39.76,
        "lng": -121.62,
    },
    {
        "id": "LC-004",
        "name": "Fatima Doe #5",
        "age_estimate": "8-12",
        "gender": "Female",
        "descriptors": {
            "clothing": "Pink backpack with star patch, school uniform",
            "hair": "Dark brown, braided",
            "height": "4'6\"",
            "jewelry": "Beaded bracelet, green and white",
        },
        "narrative": "Unaccompanied minor found at transit center. Wearing school uniform and pink backpack with star patch. Speaks Arabic and limited English. Green and white beaded bracelet on right wrist.",
        "region": "New York, NY",
        "year": 2022,
        "status": "Unresolved",
        "source": "Open Intelligence Registry",
        "lat": 40.71,
        "lng": -74.01,
    },
    {
        "id": "LC-005",
        "name": "Miguel Doe #33",
        "age_estimate": "25-35",
        "gender": "Male",
        "descriptors": {
            "scars": "Knife scar across right cheek",
            "tattoos": "Familia across upper back, eagle on chest",
            "clothing": "Black hoodie, running shoes",
            "hair": "Black, buzz cut",
            "height": "5'7\"",
        },
        "narrative": "Adult male separated from group during caravan transit. Distinctive knife scar across right cheek. Familia tattoo across upper back visible. Eagle tattoo on chest. Last seen near Laredo checkpoint area.",
        "region": "Laredo, TX",
        "year": 2021,
        "status": "Unresolved",
        "source": "Open Intelligence Registry",
        "lat": 27.51,
        "lng": -99.51,
    },
    {
        "id": "LC-006",
        "name": "Elena Doe #18",
        "age_estimate": "40-50",
        "gender": "Female",
        "descriptors": {
            "scars": "Surgical scar on abdomen",
            "clothing": "Floral dress, sandals",
            "hair": "Gray-streaked, shoulder length",
            "height": "5'3\"",
            "medical": "Hypertension medication",
            "jewelry": "Gold wedding band, religious medal",
        },
        "narrative": "Middle-aged woman found wandering near highway after flooding in rural Louisiana. Appeared confused and dehydrated. Gold wedding band on left hand. Religious medal on chain. Floral dress and sandals. Required medication for high blood pressure.",
        "region": "Rural Louisiana",
        "year": 2020,
        "status": "Unresolved",
        "source": "Open Intelligence Registry",
        "lat": 30.45,
        "lng": -91.19,
    },
    {
        "id": "LC-007",
        "name": "Unknown Child #3",
        "age_estimate": "3-5",
        "gender": "Male",
        "descriptors": {
            "clothing": "Cartoon dinosaur t-shirt, blue shorts",
            "hair": "Blond, curly",
            "height": "3'2\"",
            "jewelry": "Medical alert bracelet — asthma",
        },
        "narrative": "Very young male child found alone at evacuation center during tornado aftermath. Cartoon dinosaur t-shirt. Blond curly hair. Medical alert bracelet indicating asthma. Could not provide full name or parent details.",
        "region": "Nashville, TN",
        "year": 2023,
        "status": "Unresolved",
        "source": "Open Intelligence Registry",
        "lat": 36.17,
        "lng": -86.78,
    },
]


def _text_score(query: str, record: dict) -> dict:
    """Simple text-based scoring for descriptor matching."""
    q = query.lower()
    words = [w for w in q.split() if len(w) > 2]
    if not words:
        return {"score": 0, "matched_descriptors": [], "narrative_relevance": 0}

    search_text = " ".join([
        record.get("narrative", ""),
        " ".join(record.get("descriptors", {}).values()),
        record.get("name", ""),
        record.get("region", ""),
        record.get("gender", ""),
        record.get("age_estimate", ""),
    ]).lower()

    hits = sum(1 for w in words if w in search_text)
    desc_text = " ".join(record.get("descriptors", {}).values()).lower()
    desc_hits = sum(1 for w in words if w in desc_text)
    narrative_hits = sum(1 for w in words if w in record.get("narrative", "").lower())

    base_score = hits / len(words) if words else 0
    desc_bonus = 0.15 if desc_hits > 0 else 0
    score = min(base_score + desc_bonus, 1.0)

    matched_descriptors = []
    for key, val in record.get("descriptors", {}).items():
        for w in words:
            if w in val.lower():
                matched_descriptors.append(key)
                break

    narrative_relevance = narrative_hits / len(words) if words else 0

    return {
        "score": round(score, 3),
        "matched_descriptors": matched_descriptors,
        "narrative_relevance": round(narrative_relevance, 3),
    }


class LegacySearchRequest(BaseModel):
    query: str
    min_score: float = 0.1
    limit: int = 10


@router.post("/search")
async def search_legacy_intelligence(req: LegacySearchRequest):
    """Search historical/cold case intelligence using natural language descriptors."""
    results = []
    for record in LEGACY_RECORDS:
        scoring = _text_score(req.query, record)
        if scoring["score"] >= req.min_score:
            results.append({
                **record,
                "relevance_score": scoring["score"],
                "matched_descriptors": scoring["matched_descriptors"],
                "narrative_relevance": scoring["narrative_relevance"],
            })

    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return {
        "query": req.query,
        "total_records_scanned": len(LEGACY_RECORDS),
        "matches": results[: req.limit],
        "source": "Open Intelligence Registry",
    }


@router.get("/records")
async def list_legacy_records(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    region: Optional[str] = Query(default=None),
):
    """List legacy intelligence records, optionally filtered by region."""
    records = LEGACY_RECORDS
    if region:
        records = [r for r in records if region.lower() in r["region"].lower()]
    return {
        "total": len(records),
        "records": records[offset : offset + limit],
        "source": "Open Intelligence Registry",
    }


@router.get("/geo")
async def legacy_geo_data():
    """Return geo coordinates for all legacy records — for map historical layer."""
    points = []
    for r in LEGACY_RECORDS:
        points.append({
            "id": r["id"],
            "name": r["name"],
            "lat": r["lat"],
            "lng": r["lng"],
            "year": r["year"],
            "status": r["status"],
            "region": r["region"],
            "age_estimate": r["age_estimate"],
            "gender": r["gender"],
        })
    return {"points": points, "total": len(points)}


@router.get("/stats")
async def legacy_stats():
    """Return aggregate statistics for the legacy intelligence registry."""
    total = len(LEGACY_RECORDS)
    unresolved = sum(1 for r in LEGACY_RECORDS if r["status"] == "Unresolved")
    regions = list({r["region"] for r in LEGACY_RECORDS})
    years = sorted({r["year"] for r in LEGACY_RECORDS})
    return {
        "total_records": total,
        "unresolved": unresolved,
        "resolved": total - unresolved,
        "regions": regions,
        "year_range": [min(years), max(years)] if years else [],
        "source": "Open Intelligence Registry",
    }
