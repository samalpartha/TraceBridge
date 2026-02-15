"""Background tasks for outreach workflows."""
from app.tasks.celery_app import celery_app


@celery_app.task(name="outreach_tasks.send_ngo_alert")
def send_ngo_alert(match_id: str, target_url: str = None, message: str = None):
    """Send an alert to an NGO portal via TinyFish browser automation."""
    from app.services.tinyfish_client import run_sync_automation
    from app.database import SyncSessionLocal
    from app.models.match import MatchCandidate
    from app.models.outreach import OutreachEvent
    import uuid

    db = SyncSessionLocal()
    try:
        match = db.query(MatchCandidate).filter(MatchCandidate.id == uuid.UUID(match_id)).first()
        if not match:
            return {"status": "error", "message": "Match not found"}

        if not target_url:
            target_url = "https://familylinks.icrc.org/en/pages/home.aspx"

        goal = f"""
        Navigate to this humanitarian organization page and look for a way to report a found person or submit a reunification request.
        If there is a form, describe the form fields found.
        If there is contact information, extract it.
        Report the result as JSON: {{ "form_found": true/false, "contact_info": "...", "submission_method": "...", "notes": "..." }}
        Additional context: {message or 'Potential match found for missing person case.'}
        """

        result = run_sync_automation(url=target_url, goal=goal, stealth=True)

        event = OutreachEvent(
            match_id=match.id,
            channel="tinyfish",
            tinyfish_run_id=result.get("run_id"),
            status="completed" if result.get("status") == "COMPLETED" else "failed",
            response_data=result.get("result"),
        )
        db.add(event)
        db.commit()

        return {
            "status": "success",
            "outreach_id": str(event.id),
            "result": result.get("result"),
        }
    finally:
        db.close()
