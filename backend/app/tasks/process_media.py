"""Background tasks for media processing - embedding extraction."""
from app.tasks.celery_app import celery_app


@celery_app.task(name="process_media.extract_face_embedding")
def extract_face_embedding(media_asset_id: str):
    """Extract face embedding from an uploaded photo."""
    from app.database import SyncSessionLocal
    from app.models.case import MediaAsset
    from app.services.embedding import generate_face_embedding
    import uuid

    db = SyncSessionLocal()
    try:
        media = db.query(MediaAsset).filter(MediaAsset.id == uuid.UUID(media_asset_id)).first()
        if not media:
            return {"status": "error", "message": "Media asset not found"}

        # Generate face embedding
        file_path = media.file_path.lstrip("/")
        embedding = generate_face_embedding(file_path)

        if embedding is not None:
            media.face_embedding = embedding.tolist()
            db.commit()
            return {"status": "success", "media_id": media_asset_id}
        else:
            return {"status": "no_face_detected", "media_id": media_asset_id}
    finally:
        db.close()


@celery_app.task(name="process_media.generate_text_embedding")
def generate_text_embedding_task(source_record_id: str):
    """Generate text embedding for a source record."""
    from app.database import SyncSessionLocal
    from app.models.match import SourceRecord
    from app.services.embedding import generate_text_embedding
    import uuid

    db = SyncSessionLocal()
    try:
        record = db.query(SourceRecord).filter(SourceRecord.id == uuid.UUID(source_record_id)).first()
        if not record:
            return {"status": "error", "message": "Source record not found"}

        text = f"{record.person_name or ''} {record.description or ''} {record.location_name or ''}"
        embedding = generate_text_embedding(text)

        if embedding is not None:
            record.text_embedding = embedding.tolist()
            db.commit()
            return {"status": "success", "record_id": source_record_id}
    finally:
        db.close()

    return {"status": "error"}
