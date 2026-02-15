"""A3 RAG Records Agent - Hybrid text search across source records."""
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.hybrid_search import hybrid_search
from app.services.vector_search import search_by_text_embedding


async def run_rag_search(
    person_name: str,
    description: Optional[str],
    text_embedding: Optional[List[float]],
    age: Optional[int] = None,
    gender: Optional[str] = None,
    location: Optional[str] = None,
    db: AsyncSession = None,
    limit: int = 10,
) -> Dict[str, Any]:
    """Search source records using hybrid (vector + full-text) search.

    Combines:
    - Semantic similarity via text embeddings
    - Full-text search via PostgreSQL tsvector
    - Reciprocal Rank Fusion for final ranking
    """
    # Build search query from case details
    query_parts = [person_name]
    if age:
        query_parts.append(f"age {age}")
    if gender:
        query_parts.append(gender)
    if description:
        query_parts.append(description)
    if location:
        query_parts.append(location)
    query_text = " ".join(query_parts)

    if text_embedding is not None:
        # Full hybrid search with RRF
        try:
            candidates = await hybrid_search(
                db=db,
                query_text=query_text,
                text_embedding=text_embedding,
                limit=limit,
            )
            return {
                "status": "completed",
                "search_type": "hybrid_rrf",
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
                        "age": c.get("age"),
                        "gender": c.get("gender"),
                        "rag_score": c["rrf_score"],
                        "vec_score": c["vec_score"],
                        "text_score": c["text_score"],
                    }
                    for c in candidates
                ],
            }
        except Exception as e:
            # Fall back to vector-only search
            print(f"Hybrid search failed, falling back to vector: {e}")

    # Vector-only fallback
    if text_embedding is not None:
        candidates = await search_by_text_embedding(
            db=db,
            embedding=text_embedding,
            limit=limit,
        )
        return {
            "status": "completed",
            "search_type": "vector_only",
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
                    "rag_score": c["similarity"],
                }
                for c in candidates
            ],
        }

    return {
        "status": "skipped",
        "reason": "No text embedding available",
        "candidates": [],
    }
