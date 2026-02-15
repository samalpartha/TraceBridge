"""Hybrid search combining vector similarity and full-text search with RRF."""
from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def hybrid_search(
    db: AsyncSession,
    query_text: str,
    text_embedding: List[float],
    limit: int = 10,
    vector_weight: float = 0.6,
    text_weight: float = 0.4,
    k: int = 60,  # RRF constant
) -> List[Dict[str, Any]]:
    """Perform hybrid search using Reciprocal Rank Fusion (RRF).

    Combines:
    1. pgvector cosine similarity search
    2. PostgreSQL full-text search (ts_rank)
    """
    embedding_str = "[" + ",".join(str(x) for x in text_embedding) + "]"

    # RRF query combining vector and full-text search
    rrf_query = text("""
        WITH vector_results AS (
            SELECT id, person_name, description, photo_url, location_name,
                   location_lat, location_lng, source_type, source_url, age, gender,
                   1 - (text_embedding <=> :embedding::vector) as vec_score,
                   ROW_NUMBER() OVER (ORDER BY text_embedding <=> :embedding::vector) as vec_rank
            FROM source_records
            WHERE text_embedding IS NOT NULL
            LIMIT 50
        ),
        text_results AS (
            SELECT id, person_name, description, photo_url, location_name,
                   location_lat, location_lng, source_type, source_url, age, gender,
                   ts_rank(
                       to_tsvector('english', COALESCE(person_name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(location_name, '')),
                       plainto_tsquery('english', :query)
                   ) as text_score,
                   ROW_NUMBER() OVER (
                       ORDER BY ts_rank(
                           to_tsvector('english', COALESCE(person_name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(location_name, '')),
                           plainto_tsquery('english', :query)
                       ) DESC
                   ) as text_rank
            FROM source_records
            WHERE to_tsvector('english', COALESCE(person_name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(location_name, ''))
                  @@ plainto_tsquery('english', :query)
            LIMIT 50
        )
        SELECT
            COALESCE(v.id, t.id) as id,
            COALESCE(v.person_name, t.person_name) as person_name,
            COALESCE(v.description, t.description) as description,
            COALESCE(v.photo_url, t.photo_url) as photo_url,
            COALESCE(v.location_name, t.location_name) as location_name,
            COALESCE(v.location_lat, t.location_lat) as location_lat,
            COALESCE(v.location_lng, t.location_lng) as location_lng,
            COALESCE(v.source_type, t.source_type) as source_type,
            COALESCE(v.source_url, t.source_url) as source_url,
            COALESCE(v.age, t.age) as age,
            COALESCE(v.gender, t.gender) as gender,
            COALESCE(v.vec_score, 0) as vec_score,
            COALESCE(t.text_score, 0) as text_score,
            (
                :vec_weight * COALESCE(1.0 / (:k + v.vec_rank), 0) +
                :text_weight * COALESCE(1.0 / (:k + t.text_rank), 0)
            ) as rrf_score
        FROM vector_results v
        FULL OUTER JOIN text_results t ON v.id = t.id
        ORDER BY rrf_score DESC
        LIMIT :limit
    """)

    result = await db.execute(
        rrf_query,
        {
            "embedding": embedding_str,
            "query": query_text,
            "vec_weight": vector_weight,
            "text_weight": text_weight,
            "k": k,
            "limit": limit,
        },
    )
    rows = result.fetchall()

    return [
        {
            "id": str(row.id),
            "person_name": row.person_name,
            "description": row.description,
            "photo_url": row.photo_url,
            "location_name": row.location_name,
            "location_lat": row.location_lat,
            "location_lng": row.location_lng,
            "source_type": row.source_type,
            "source_url": row.source_url,
            "age": row.age,
            "gender": row.gender,
            "vec_score": float(row.vec_score),
            "text_score": float(row.text_score),
            "rrf_score": float(row.rrf_score),
        }
        for row in rows
    ]
