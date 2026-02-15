"""A1 Intake Agent - Parse and prepare case data for search pipeline."""
import os
import uuid
from typing import Dict, Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.case import Case, MediaAsset
from app.services.embedding import generate_text_embedding, generate_face_embedding


async def run_intake(case_id: str, db: AsyncSession) -> Dict[str, Any]:
    """Process a case for search - extract embeddings and prepare search parameters."""
    result = await db.execute(
        select(Case).where(Case.id == uuid.UUID(case_id))
    )
    case = result.scalar_one_or_none()
    if not case:
        return {"status": "error", "message": "Case not found"}

    intake_result: Dict[str, Any] = {
        "case_id": case_id,
        "person_name": case.person_name,
        "age": case.age,
        "gender": case.gender,
        "description": case.description,
        "last_known_location": case.last_known_location,
        "last_known_lat": case.last_known_lat,
        "last_known_lng": case.last_known_lng,
        "has_photo": False,
        "face_embedding": None,
        "text_embedding": None,
    }

    # Generate text embedding from case description
    search_text = f"{case.person_name} {case.age or ''} {case.gender or ''} {case.description or ''} {case.last_known_location or ''}"
    text_emb = generate_text_embedding(search_text)
    if text_emb is not None:
        intake_result["text_embedding"] = text_emb.tolist()

    # Get face embedding from media assets
    media_result = await db.execute(
        select(MediaAsset).where(
            MediaAsset.case_id == uuid.UUID(case_id),
            MediaAsset.media_type == "photo",
        )
    )
    media_assets = media_result.scalars().all()

    for media in media_assets:
        if media.face_embedding is not None:
            intake_result["face_embedding"] = list(media.face_embedding)
            intake_result["has_photo"] = True
            break
        else:
            # Try to generate embedding from file - resolve to absolute path
            basename = os.path.basename(media.file_path)
            file_path = os.path.join(settings.UPLOAD_DIR, basename)
            embedding = generate_face_embedding(file_path)
            if embedding is not None:
                media.face_embedding = embedding.tolist()
                await db.commit()
                intake_result["face_embedding"] = embedding.tolist()
                intake_result["has_photo"] = True
                break

    return intake_result
