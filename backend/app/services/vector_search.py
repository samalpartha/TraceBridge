"""Vector similarity search using pgvector."""
import uuid
from typing import List, Dict, Any, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.match import SourceRecord
from app.models.case import MediaAsset


async def search_by_face_embedding(
    db: AsyncSession,
    embedding: List[float],
    limit: int = 10,
    min_similarity: float = 0.3,
) -> List[Dict[str, Any]]:
    """Search source records by face embedding similarity."""
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

    query = text(f"""
        SELECT id, person_name, description, photo_url, location_name,
               location_lat, location_lng, source_type, source_url,
               1 - (face_embedding <=> :embedding::vector) as similarity
        FROM source_records
        WHERE face_embedding IS NOT NULL
        ORDER BY face_embedding <=> :embedding::vector
        LIMIT :limit
    """)

    result = await db.execute(query, {"embedding": embedding_str, "limit": limit})
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
            "similarity": float(row.similarity),
        }
        for row in rows
        if row.similarity >= min_similarity
    ]


async def search_by_text_embedding(
    db: AsyncSession,
    embedding: List[float],
    limit: int = 10,
    min_similarity: float = 0.3,
) -> List[Dict[str, Any]]:
    """Search source records by text embedding similarity."""
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

    query = text(f"""
        SELECT id, person_name, description, photo_url, location_name,
               location_lat, location_lng, source_type, source_url,
               1 - (text_embedding <=> :embedding::vector) as similarity
        FROM source_records
        WHERE text_embedding IS NOT NULL
        ORDER BY text_embedding <=> :embedding::vector
        LIMIT :limit
    """)

    result = await db.execute(query, {"embedding": embedding_str, "limit": limit})
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
            "similarity": float(row.similarity),
        }
        for row in rows
        if row.similarity >= min_similarity
    ]
