"""Background tasks for scanning crisis sources via TinyFish."""
from app.tasks.celery_app import celery_app


@celery_app.task(name="scan_sources.scan_crisis_feeds")
def scan_crisis_feeds():
    """Periodic task to scan crisis data sources for new sightings."""
    from app.services.tinyfish_client import run_sync_automation
    from app.database import SyncSessionLocal
    from app.models.match import SourceRecord
    import json

    # Demo crisis source URLs
    sources = [
        {
            "url": "https://www.icrc.org/en/what-we-do/restoring-family-links",
            "goal": "Find any listed missing persons or family reunification cases. Return JSON: { persons: [{ name, age, gender, location, description, photo_url }] }",
            "source_type": "registry",
        },
    ]

    db = SyncSessionLocal()
    try:
        for source in sources:
            try:
                result = run_sync_automation(
                    url=source["url"],
                    goal=source["goal"],
                    stealth=True,
                )
                if result.get("status") == "COMPLETED" and result.get("result"):
                    persons = result["result"].get("persons", [])
                    for person in persons:
                        record = SourceRecord(
                            source_type=source["source_type"],
                            source_url=source["url"],
                            person_name=person.get("name"),
                            age=person.get("age"),
                            gender=person.get("gender"),
                            description=person.get("description"),
                            photo_url=person.get("photo_url"),
                            location_name=person.get("location"),
                            raw_data=person,
                            tinyfish_run_id=result.get("run_id"),
                        )
                        db.add(record)
                    db.commit()
            except Exception as e:
                print(f"Error scanning {source['url']}: {e}")
                continue
    finally:
        db.close()


@celery_app.task(name="scan_sources.scan_single_source")
def scan_single_source(url: str, goal: str, source_type: str = "news"):
    """Scan a single source URL with TinyFish."""
    from app.services.tinyfish_client import run_sync_automation
    from app.database import SyncSessionLocal
    from app.models.match import SourceRecord

    result = run_sync_automation(url=url, goal=goal, stealth=True)

    db = SyncSessionLocal()
    try:
        if result.get("status") == "COMPLETED" and result.get("result"):
            persons = result["result"].get("persons", [])
            records = []
            for person in persons:
                record = SourceRecord(
                    source_type=source_type,
                    source_url=url,
                    person_name=person.get("name"),
                    age=person.get("age"),
                    gender=person.get("gender"),
                    description=person.get("description"),
                    photo_url=person.get("photo_url"),
                    location_name=person.get("location"),
                    raw_data=person,
                    tinyfish_run_id=result.get("run_id"),
                )
                db.add(record)
                records.append(str(record.id))
            db.commit()
            return {"status": "success", "records_created": len(records)}
    finally:
        db.close()

    return {"status": "no_results"}
