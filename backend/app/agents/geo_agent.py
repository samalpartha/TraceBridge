"""A4 Geo Intelligence Agent - Location plausibility scoring."""
import math
from typing import Dict, Any, List, Optional


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two points in km."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def location_plausibility_score(
    case_lat: Optional[float],
    case_lng: Optional[float],
    record_lat: Optional[float],
    record_lng: Optional[float],
    max_distance_km: float = 500.0,
) -> float:
    """Score how plausible a location match is based on distance.

    Returns 0-1 score where:
    - 1.0 = same location (< 1km)
    - 0.5 = moderate distance (~100km)
    - 0.0 = very far (> max_distance)
    """
    if case_lat is None or case_lng is None or record_lat is None or record_lng is None:
        return 0.5  # Unknown = neutral score

    distance = haversine_distance(case_lat, case_lng, record_lat, record_lng)

    if distance < 1:
        return 1.0
    elif distance >= max_distance_km:
        return 0.0
    else:
        # Exponential decay
        return math.exp(-distance / (max_distance_km / 3))


def predict_movement_corridor(
    origin_lat: float,
    origin_lng: float,
    sightings: List[Dict[str, float]],
) -> Dict[str, Any]:
    """Predict likely movement corridor based on origin and sightings.

    Simple model: calculate dominant direction and spread.
    """
    if not sightings:
        return {
            "direction": "unknown",
            "avg_distance_km": 0,
            "predicted_zone": None,
        }

    distances = []
    bearings = []

    for s in sightings:
        if s.get("lat") and s.get("lng"):
            d = haversine_distance(origin_lat, origin_lng, s["lat"], s["lng"])
            distances.append(d)

            # Calculate bearing
            dlng = math.radians(s["lng"] - origin_lng)
            lat1 = math.radians(origin_lat)
            lat2 = math.radians(s["lat"])
            x = math.sin(dlng) * math.cos(lat2)
            y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlng)
            bearing = math.degrees(math.atan2(x, y))
            bearings.append(bearing)

    avg_distance = sum(distances) / len(distances) if distances else 0
    avg_bearing = sum(bearings) / len(bearings) if bearings else 0

    # Map bearing to direction
    directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = round(avg_bearing / 45) % 8
    direction = directions[idx]

    return {
        "direction": direction,
        "avg_distance_km": round(avg_distance, 1),
        "avg_bearing": round(avg_bearing, 1),
        "predicted_zone": {
            "center_lat": origin_lat + (avg_distance / 111) * math.cos(math.radians(avg_bearing)),
            "center_lng": origin_lng + (avg_distance / (111 * math.cos(math.radians(origin_lat)))) * math.sin(math.radians(avg_bearing)),
            "radius_km": avg_distance * 0.5,
        },
    }


async def run_geo_analysis(
    case_lat: Optional[float],
    case_lng: Optional[float],
    candidates: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Score candidates by geographic plausibility and predict movement."""
    scored_candidates = []

    for candidate in candidates:
        geo_score = location_plausibility_score(
            case_lat, case_lng,
            candidate.get("location_lat"),
            candidate.get("location_lng"),
        )
        scored_candidates.append({
            **candidate,
            "geo_score": geo_score,
            "distance_km": (
                haversine_distance(case_lat, case_lng, candidate["location_lat"], candidate["location_lng"])
                if case_lat and case_lng and candidate.get("location_lat") and candidate.get("location_lng")
                else None
            ),
        })

    # Predict movement if we have location data
    movement = None
    if case_lat and case_lng:
        sightings = [
            {"lat": c["location_lat"], "lng": c["location_lng"]}
            for c in candidates
            if c.get("location_lat") and c.get("location_lng")
        ]
        if sightings:
            movement = predict_movement_corridor(case_lat, case_lng, sightings)

    return {
        "status": "completed",
        "candidates": scored_candidates,
        "movement_prediction": movement,
    }
