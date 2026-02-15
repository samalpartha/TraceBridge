"""A5 Match Fusion Agent - Multi-modal score fusion."""
from typing import Dict, Any, List
from collections import defaultdict


# Fusion weights
VISION_WEIGHT = 0.45
RAG_WEIGHT = 0.30
GEO_WEIGHT = 0.20
META_WEIGHT = 0.05

# Minimum threshold for escalation
MIN_FUSED_SCORE = 0.25
MIN_MODALITIES_AGREE = 1  # At least N modalities must have score > 0


def fuse_scores(
    vision_candidates: List[Dict[str, Any]],
    rag_candidates: List[Dict[str, Any]],
    geo_candidates: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Fuse multi-modal match scores using weighted combination.

    Candidates from different agents are merged by source_record_id,
    and a final fused score is computed.
    """
    # Merge candidates by source_record_id
    merged: Dict[str, Dict[str, Any]] = {}

    for c in vision_candidates:
        sid = c.get("source_record_id")
        if sid:
            if sid not in merged:
                merged[sid] = {
                    "source_record_id": sid,
                    "person_name": c.get("person_name"),
                    "description": c.get("description"),
                    "photo_url": c.get("photo_url"),
                    "location_name": c.get("location_name"),
                    "location_lat": c.get("location_lat"),
                    "location_lng": c.get("location_lng"),
                    "source_type": c.get("source_type"),
                    "vision_score": 0.0,
                    "rag_score": 0.0,
                    "geo_score": 0.0,
                }
            merged[sid]["vision_score"] = c.get("vision_score", 0.0)

    for c in rag_candidates:
        sid = c.get("source_record_id")
        if sid:
            if sid not in merged:
                merged[sid] = {
                    "source_record_id": sid,
                    "person_name": c.get("person_name"),
                    "description": c.get("description"),
                    "photo_url": c.get("photo_url"),
                    "location_name": c.get("location_name"),
                    "location_lat": c.get("location_lat"),
                    "location_lng": c.get("location_lng"),
                    "source_type": c.get("source_type"),
                    "vision_score": 0.0,
                    "rag_score": 0.0,
                    "geo_score": 0.0,
                }
            merged[sid]["rag_score"] = c.get("rag_score", 0.0)

    # Apply geo scores to all merged candidates
    geo_map = {c.get("source_record_id"): c.get("geo_score", 0.5) for c in geo_candidates}
    for sid, candidate in merged.items():
        candidate["geo_score"] = geo_map.get(sid, 0.5)

    # Compute fused scores
    results = []
    for sid, candidate in merged.items():
        vs = candidate["vision_score"]
        rs = candidate["rag_score"]
        gs = candidate["geo_score"]

        # Count agreeing modalities
        modalities = sum(1 for s in [vs, rs, gs] if s > 0.1)

        # Weighted fusion
        fused = (
            VISION_WEIGHT * vs
            + RAG_WEIGHT * rs
            + GEO_WEIGHT * gs
            + META_WEIGHT * (modalities / 3.0)  # Bonus for multi-modal agreement
        )

        candidate["fused_score"] = round(fused, 4)
        candidate["modalities_agreeing"] = modalities
        candidate["passes_threshold"] = fused >= MIN_FUSED_SCORE and modalities >= MIN_MODALITIES_AGREE

        results.append(candidate)

    # Sort by fused score descending
    results.sort(key=lambda x: x["fused_score"], reverse=True)

    return results


def build_evidence(candidate: Dict[str, Any]) -> Dict[str, Any]:
    """Build evidence breakdown for a match candidate."""
    evidence: Dict[str, Any] = {
        "person_name": candidate.get("person_name"),
        "location_name": candidate.get("location_name"),
        "source_type": candidate.get("source_type"),
        "vision_evidence": {
            "score": candidate.get("vision_score", 0),
            "description": (
                "Strong facial similarity detected"
                if candidate.get("vision_score", 0) > 0.6
                else "Moderate visual similarity"
                if candidate.get("vision_score", 0) > 0.3
                else "Low or no visual match"
            ),
        },
        "rag_evidence": {
            "score": candidate.get("rag_score", 0),
            "description": (
                "Strong text/record match"
                if candidate.get("rag_score", 0) > 0.6
                else "Partial text match"
                if candidate.get("rag_score", 0) > 0.3
                else "Weak or no text match"
            ),
        },
        "geo_evidence": {
            "score": candidate.get("geo_score", 0),
            "distance_km": candidate.get("distance_km"),
            "description": (
                "Very close to last known location"
                if candidate.get("geo_score", 0) > 0.7
                else "Reasonable proximity"
                if candidate.get("geo_score", 0) > 0.3
                else "Far from last known location"
            ),
        },
        "modalities_agreeing": candidate.get("modalities_agreeing", 0),
        "confidence_level": (
            "high"
            if candidate.get("fused_score", 0) > 0.6
            else "medium"
            if candidate.get("fused_score", 0) > 0.35
            else "low"
        ),
    }
    return evidence
