"""A2 Vision Agent - Face similarity search via pgvector."""
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.vector_search import search_by_face_embedding


async def run_vision_search(
    face_embedding: Optional[List[float]],
    db: AsyncSession,
    limit: int = 10,
    min_similarity: float = 0.25,
) -> Dict[str, Any]:
    """Search for visual matches using face embedding similarity.

    Returns ranked candidates with vision scores.
    """
    if face_embedding is None:
        return {
            "status": "skipped",
            "reason": "No face embedding available",
            "candidates": [],
        }

    candidates = await search_by_face_embedding(
        db=db,
        embedding=face_embedding,
        limit=limit,
        min_similarity=min_similarity,
    )

    return {
        "status": "completed",
        "candidates_found": len(candidates),
        "candidates": [
            {
                "source_record_id": c["id"],
                "person_name": c["person_name"],
                "description": c["description"],
                "photo_url": c["photo_url"],
                "location_name": c["location_name"],
                "location_lat": c["location_lat"],
                "location_lng": c["location_lng"],
                "source_type": c["source_type"],
                "vision_score": c["similarity"],
            }
            for c in candidates
        ],
    }
