"""Seed the database with demo data for hackathon presentation."""
import json
import os
import sys
import uuid
import numpy as np

# Add parent dir to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import sync_engine, SyncSessionLocal, Base
from app.models.user import User
from app.models.case import Case, MediaAsset
from app.models.match import SourceRecord, MatchCandidate
from app.models.geo import GeoEvent
from app.models.outreach import OutreachEvent, AuditLog
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
if not os.path.exists(DATA_DIR):
    # In Docker prod, backend/ is under /app, but data/ is at /app/data
    DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
if not os.path.exists(DATA_DIR):
    DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


def random_embedding(dim):
    """Generate a random normalized embedding for demo."""
    emb = np.random.randn(dim).astype(np.float32)
    emb = emb / (np.linalg.norm(emb) + 1e-8)
    return emb.tolist()


def seed():
    print("Creating tables...")
    # Enable pgvector extension
    with sync_engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    Base.metadata.create_all(bind=sync_engine)

    db = SyncSessionLocal()

    try:
        # Check if already seeded
        existing = db.query(User).first()
        if existing:
            print("Database already seeded. Skipping.")
            return

        print("Seeding users...")
        # Create demo users
        users = [
            User(
                email="admin@tracebridge.ai",
                hashed_password=pwd_context.hash("admin123"),
                full_name="Admin User",
                role="ngo_admin",
                org_name="TraceBridge",
            ),
            User(
                email="caseworker@redcross.org",
                hashed_password=pwd_context.hash("worker123"),
                full_name="Sarah Chen",
                role="caseworker",
                org_name="American Red Cross",
            ),
            User(
                email="maria.rivera@email.com",
                hashed_password=pwd_context.hash("family123"),
                full_name="Maria Rivera",
                role="family",
            ),
            User(
                email="tom.jenkins@email.com",
                hashed_password=pwd_context.hash("family123"),
                full_name="Tom Jenkins",
                role="family",
            ),
        ]
        for u in users:
            db.add(u)
        db.flush()

        print("Seeding cases...")
        # Load demo cases
        cases_path = os.path.join(DATA_DIR, "demo_cases.json")
        with open(cases_path) as f:
            demo_cases = json.load(f)

        case_objects = []
        reporter_map = {
            "Marcus Rivera": users[2].id,   # mother
            "Sarah Jenkins": users[3].id,   # son
        }

        for c in demo_cases:
            case = Case(
                person_name=c["person_name"],
                age=c.get("age"),
                gender=c.get("gender"),
                description=c.get("description"),
                last_known_location=c.get("last_known_location"),
                last_known_lat=c.get("last_known_lat"),
                last_known_lng=c.get("last_known_lng"),
                last_known_date=c.get("last_known_date"),
                contact_info=c.get("contact_info"),
                status=c.get("status", "open"),
                reporter_id=reporter_map.get(c["person_name"]),
            )
            db.add(case)
            case_objects.append(case)
        db.flush()

        # Add face embeddings to cases (simulated)
        for case in case_objects:
            media = MediaAsset(
                case_id=case.id,
                file_path=f"/uploads/demo_{case.person_name.lower().replace(' ', '_')}.jpg",
                media_type="photo",
                original_filename=f"{case.person_name}.jpg",
                face_embedding=random_embedding(512),
            )
            db.add(media)

        print("Seeding source records (sightings)...")
        # Load demo sightings
        sightings_path = os.path.join(DATA_DIR, "demo_sightings.json")
        with open(sightings_path) as f:
            demo_sightings = json.load(f)

        source_records = []
        for s in demo_sightings:
            record = SourceRecord(
                source_type=s["source_type"],
                source_url=s.get("source_url"),
                person_name=s.get("person_name"),
                age=s.get("age"),
                gender=s.get("gender"),
                description=s.get("description"),
                photo_url=s.get("photo_url"),
                location_name=s.get("location_name"),
                location_lat=s.get("location_lat"),
                location_lng=s.get("location_lng"),
                raw_data=s,
                text_embedding=random_embedding(768),
                face_embedding=random_embedding(512),
            )
            db.add(record)
            source_records.append(record)
        db.flush()

        print("Seeding match candidates...")
        # Marcus Rivera -> Marcus R. at Houston Convention Center (high confidence)
        match1 = MatchCandidate(
            case_id=case_objects[0].id,  # Marcus Rivera
            source_record_id=source_records[0].id,  # Marcus R. at Convention Center
            vision_score=0.78,
            rag_score=0.85,
            geo_score=0.62,
            fused_score=0.76,
            evidence={
                "person_name": "Marcus R.",
                "matched_person_name": "Marcus R.",
                "location_name": "George R. Brown Convention Center, Houston, TX",
                "source_type": "shelter",
                "vision_evidence": {"score": 0.78, "description": "Strong facial similarity detected"},
                "rag_evidence": {"score": 0.85, "description": "Strong text/record match - name Marcus/Marcus R., age 8, red Texans hoodie, birthmark on right cheek"},
                "geo_evidence": {"score": 0.62, "distance_km": 24, "description": "Within Houston metro area - Greenspoint to downtown, 24km"},
                "modalities_agreeing": 3,
                "confidence_level": "high",
                "explanation": "High-confidence match. The name Marcus/Marcus R., age 8, physical description (short black hair, red Texans hoodie, birthmark on right cheek), and the movement pattern from Greenspoint flood zone toward downtown Houston shelters are highly consistent. Three modalities agree on this match with a combined score of 76%.",
            },
            status="pending",
        )
        db.add(match1)

        # Marcus -> Hospital record (medium confidence)
        match2 = MatchCandidate(
            case_id=case_objects[0].id,
            source_record_id=source_records[1].id,  # Unknown boy at Memorial Hermann
            vision_score=0.65,
            rag_score=0.72,
            geo_score=0.58,
            fused_score=0.65,
            evidence={
                "person_name": "Unknown boy (Marcus?)",
                "matched_person_name": "Unknown boy (Marcus?)",
                "location_name": "Memorial Hermann Hospital, Houston, TX",
                "source_type": "hospital",
                "vision_evidence": {"score": 0.65, "description": "Moderate visual similarity"},
                "rag_evidence": {"score": 0.72, "description": "Partial text match - name Marcus, age ~8, red hoodie, birthmark on cheek"},
                "geo_evidence": {"score": 0.58, "distance_km": 29, "description": "Within Houston metro - Memorial Hermann to Greenspoint"},
                "modalities_agreeing": 3,
                "confidence_level": "medium",
                "explanation": "Moderate-confidence match. Hospital admission record for a boy matching Marcus's description. The same red Texans hoodie and cheek birthmark are noted. This may be the same person as the Convention Center sighting, treated at Memorial Hermann before transfer to Red Cross shelter.",
            },
            status="pending",
        )
        db.add(match2)

        # Emma Chen -> Red Cross Chico
        match3 = MatchCandidate(
            case_id=case_objects[3].id,  # Emma Chen
            source_record_id=source_records[6].id,  # Emma C. at Red Cross Chico
            vision_score=0.82,
            rag_score=0.90,
            geo_score=0.95,
            fused_score=0.87,
            evidence={
                "person_name": "Emma C.",
                "matched_person_name": "Emma C.",
                "location_name": "Red Cross Shelter, Chico, CA",
                "source_type": "registry",
                "vision_evidence": {"score": 0.82, "description": "Strong facial similarity detected"},
                "rag_evidence": {"score": 0.90, "description": "Strong text match - Emma, age 5, purple Frozen shirt, stuffed panda, black hair with pink bow, brown eyes"},
                "geo_evidence": {"score": 0.95, "distance_km": 3.5, "description": "Very close to last known location - Paradise to Chico evacuation route, 3.5km"},
                "modalities_agreeing": 3,
                "confidence_level": "high",
                "explanation": "Very high-confidence match. The Red Cross shelter in Chico has a girl matching Emma perfectly: name 'Emma C.', age 5, black hair with pink bow, brown eyes, purple Frozen t-shirt, and notably the stuffed panda. Found wandering near the Paradise evacuation route - exactly matching the Camp Fire displacement pattern. All three modalities strongly agree.",
            },
            status="pending",
        )
        db.add(match3)

        # James Mitchell -> Already reunited
        match4 = MatchCandidate(
            case_id=case_objects[4].id,  # James Mitchell
            source_record_id=source_records[4].id,  # James at Gatlinburg Community Center
            vision_score=0.91,
            rag_score=0.95,
            geo_score=0.98,
            fused_score=0.94,
            evidence={
                "person_name": "James Mitchell",
                "matched_person_name": "James Mitchell",
                "location_name": "Gatlinburg Community Center, Gatlinburg, TN",
                "source_type": "shelter",
                "vision_evidence": {"score": 0.91, "description": "Strong facial similarity detected"},
                "rag_evidence": {"score": 0.95, "description": "Strong text match - James Mitchell, 45, park ranger, glasses, gray-streaked beard"},
                "geo_evidence": {"score": 0.98, "distance_km": 0.2, "description": "Same location - Gatlinburg community center"},
                "modalities_agreeing": 3,
                "confidence_level": "high",
                "explanation": "Confirmed identity match. James Mitchell was located at the Gatlinburg Community Center after the Smoky Mountains wildfire evacuation. Identity verified by Red Cross staff and fellow park rangers. Family reunification process completed successfully.",
            },
            status="approved",
        )
        db.add(match4)

        print("Seeding geo events...")
        # Geo events for movement tracking
        geo_events = [
            GeoEvent(case_id=case_objects[0].id, event_type="last_known", lat=29.9622, lng=-95.4174, description="Last seen in Greenspoint area before flooding"),
            GeoEvent(case_id=case_objects[0].id, event_type="sighting", lat=29.7106, lng=-95.4015, description="Hospital admission at Memorial Hermann"),
            GeoEvent(case_id=case_objects[0].id, event_type="sighting", lat=29.7520, lng=-95.3563, description="Registered at Convention Center shelter"),
            GeoEvent(case_id=case_objects[3].id, event_type="last_known", lat=39.7596, lng=-121.6219, description="Last seen near Paradise on Skyway evacuation route"),
            GeoEvent(case_id=case_objects[3].id, event_type="sighting", lat=39.7284, lng=-121.8363, description="Found at Red Cross shelter in Chico"),
            GeoEvent(case_id=case_objects[4].id, event_type="last_known", lat=35.7137, lng=-83.5138, description="Gatlinburg Community Center"),
            GeoEvent(case_id=case_objects[4].id, event_type="shelter_registration", lat=35.9606, lng=-83.9207, description="Registered at Knoxville civic auditorium"),
        ]
        for ge in geo_events:
            db.add(ge)

        db.flush()  # Flush to get match IDs assigned

        print("Seeding outreach event...")
        # Demo outreach for James (reunited case)
        outreach = OutreachEvent(
            match_id=match4.id,
            channel="tinyfish",
            tinyfish_run_id="demo_run_james_001",
            status="completed",
            response_data={
                "contact_methods": [
                    {"type": "phone", "value": "+1-865-555-0234"},
                    {"type": "email", "value": "gatlinburg-shelter@redcross.org"},
                ],
                "page_title": "American Red Cross - Safe and Well",
                "next_steps": "Family contacted. Reunification at Gatlinburg Community Center.",
                "submission_possible": True,
            },
        )
        db.add(outreach)

        print("Seeding audit logs...")
        audit = AuditLog(
            user_id=users[1].id,
            action="match_approved",
            entity_type="match_candidate",
            entity_id=str(match4.id),
            metadata_json={"reason": "Identity confirmed by Red Cross staff and fellow park rangers"},
        )
        db.add(audit)

        db.commit()
        print("Demo data seeded successfully!")
        print(f"  - {len(users)} users")
        print(f"  - {len(case_objects)} cases")
        print(f"  - {len(source_records)} source records")
        print(f"  - 4 match candidates")
        print(f"  - {len(geo_events)} geo events")
        print(f"  - 1 outreach event")
        print(f"\nDemo credentials:")
        print(f"  Admin:      admin@tracebridge.ai / admin123")
        print(f"  Caseworker: caseworker@redcross.org / worker123")
        print(f"  Family:     maria.rivera@email.com / family123")

    except Exception as e:
        db.rollback()
        print(f"Error seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
