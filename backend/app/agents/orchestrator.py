"""Multi-Agent Orchestrator - LangGraph-style state machine for search pipeline.

Coordinates Vision, RAG, Geo, and Fusion agents with parallel fan-out.
"""
import uuid
import asyncio
from typing import Dict, Any, List, Optional, AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.case import Case, MediaAsset
from app.models.match import MatchCandidate, SourceRecord
from app.agents.intake_agent import run_intake
from app.agents.vision_agent import run_vision_search
from app.agents.rag_agent import run_rag_search
from app.agents.geo_agent import run_geo_analysis
from app.agents.fusion_agent import fuse_scores, build_evidence
from app.services.llm_client import analyze_match


async def run_search_pipeline(case_id: str, db: AsyncSession) -> Dict[str, Any]:
    """Run the full multi-agent search pipeline for a case.

    Pipeline stages:
    1. Intake - extract embeddings and prepare search params
    2. Parallel fan-out - Vision + RAG + Geo search
    3. Fusion - merge and score results
    4. Store matches in database
    """
    # Stage 1: Intake
    intake = await run_intake(case_id, db)
    if intake.get("status") == "error":
        return {"status": "error", "message": intake.get("message")}

    # Stage 2: Parallel fan-out
    vision_task = run_vision_search(
        face_embedding=intake.get("face_embedding"),
        db=db,
    )
    rag_task = run_rag_search(
        person_name=intake["person_name"],
        description=intake.get("description"),
        text_embedding=intake.get("text_embedding"),
        age=intake.get("age"),
        gender=intake.get("gender"),
        location=intake.get("last_known_location"),
        db=db,
    )

    vision_result, rag_result = await asyncio.gather(vision_task, rag_task)

    # Stage 3: Geo analysis on combined candidates
    all_candidates = []
    seen_ids = set()

    for c in vision_result.get("candidates", []):
        sid = c.get("source_record_id")
        if sid and sid not in seen_ids:
            all_candidates.append(c)
            seen_ids.add(sid)

    for c in rag_result.get("candidates", []):
        sid = c.get("source_record_id")
        if sid and sid not in seen_ids:
            all_candidates.append(c)
            seen_ids.add(sid)

    geo_result = await run_geo_analysis(
        case_lat=intake.get("last_known_lat"),
        case_lng=intake.get("last_known_lng"),
        candidates=all_candidates,
    )

    # Stage 4: Fusion scoring
    fused = fuse_scores(
        vision_candidates=vision_result.get("candidates", []),
        rag_candidates=rag_result.get("candidates", []),
        geo_candidates=geo_result.get("candidates", []),
    )

    # Stage 5: Store matches that pass threshold
    matches_created = []
    for candidate in fused:
        if candidate.get("passes_threshold", False):
            evidence = build_evidence(candidate)

            # Try to generate LLM explanation
            try:
                case_info = {
                    "person_name": intake["person_name"],
                    "age": intake.get("age"),
                    "gender": intake.get("gender"),
                    "description": intake.get("description"),
                    "last_known_location": intake.get("last_known_location"),
                }
                source_info = {
                    "person_name": candidate.get("person_name"),
                    "age": candidate.get("age"),
                    "gender": candidate.get("gender"),
                    "description": candidate.get("description"),
                    "location_name": candidate.get("location_name"),
                    "source_type": candidate.get("source_type"),
                }
                explanation = await analyze_match(case_info, source_info, candidate)
                evidence["explanation"] = explanation
            except Exception as e:
                evidence["explanation"] = f"Match detected with {candidate.get('fused_score', 0):.0%} confidence across {candidate.get('modalities_agreeing', 0)} modalities."

            match_obj = MatchCandidate(
                case_id=uuid.UUID(case_id),
                source_record_id=uuid.UUID(candidate["source_record_id"]),
                vision_score=candidate.get("vision_score", 0),
                rag_score=candidate.get("rag_score", 0),
                geo_score=candidate.get("geo_score", 0),
                fused_score=candidate.get("fused_score", 0),
                evidence=evidence,
                status="pending",
            )
            db.add(match_obj)
            matches_created.append({
                "match_id": str(match_obj.id),
                "fused_score": candidate["fused_score"],
                "person_name": candidate.get("person_name"),
            })

    # Update case status
    case_result = await db.execute(
        select(Case).where(Case.id == uuid.UUID(case_id))
    )
    case = case_result.scalar_one_or_none()
    if case:
        case.status = "matched" if matches_created else "searching"

    await db.commit()

    return {
        "status": "completed",
        "case_id": case_id,
        "intake": {
            "has_photo": intake.get("has_photo", False),
            "has_text_embedding": intake.get("text_embedding") is not None,
        },
        "vision": {
            "status": vision_result.get("status"),
            "candidates_found": vision_result.get("candidates_found", 0),
        },
        "rag": {
            "status": rag_result.get("status"),
            "candidates_found": rag_result.get("candidates_found", 0),
        },
        "geo": {
            "status": geo_result.get("status"),
            "movement_prediction": geo_result.get("movement_prediction"),
        },
        "fusion": {
            "total_candidates": len(fused),
            "above_threshold": len(matches_created),
        },
        "matches": matches_created,
    }


async def run_search_pipeline_streaming(case_id: str) -> AsyncGenerator[Dict[str, Any], None]:
    """Stream search pipeline progress via SSE events."""
    async with AsyncSessionLocal() as db:
        yield {"type": "PIPELINE_STARTED", "case_id": case_id, "stage": "intake"}

        # Stage 1: Intake
        intake = await run_intake(case_id, db)
        if intake.get("status") == "error":
            yield {"type": "PIPELINE_ERROR", "message": intake.get("message")}
            return

        yield {
            "type": "INTAKE_COMPLETE",
            "has_photo": intake.get("has_photo", False),
            "has_text_embedding": intake.get("text_embedding") is not None,
        }

        # Stage 2: Parallel agents
        yield {"type": "AGENTS_STARTED", "agents": ["vision", "rag"]}

        vision_result, rag_result = await asyncio.gather(
            run_vision_search(face_embedding=intake.get("face_embedding"), db=db),
            run_rag_search(
                person_name=intake["person_name"],
                description=intake.get("description"),
                text_embedding=intake.get("text_embedding"),
                age=intake.get("age"),
                gender=intake.get("gender"),
                location=intake.get("last_known_location"),
                db=db,
            ),
        )

        yield {
            "type": "VISION_COMPLETE",
            "status": vision_result.get("status"),
            "candidates_found": vision_result.get("candidates_found", 0),
        }
        yield {
            "type": "RAG_COMPLETE",
            "status": rag_result.get("status"),
            "candidates_found": rag_result.get("candidates_found", 0),
        }

        # Stage 3: Geo
        yield {"type": "GEO_STARTED"}
        all_candidates = []
        seen_ids = set()
        for c in vision_result.get("candidates", []):
            sid = c.get("source_record_id")
            if sid and sid not in seen_ids:
                all_candidates.append(c)
                seen_ids.add(sid)
        for c in rag_result.get("candidates", []):
            sid = c.get("source_record_id")
            if sid and sid not in seen_ids:
                all_candidates.append(c)
                seen_ids.add(sid)

        geo_result = await run_geo_analysis(
            case_lat=intake.get("last_known_lat"),
            case_lng=intake.get("last_known_lng"),
            candidates=all_candidates,
        )

        yield {
            "type": "GEO_COMPLETE",
            "movement_prediction": geo_result.get("movement_prediction"),
        }

        # Stage 4: Fusion
        yield {"type": "FUSION_STARTED"}
        fused = fuse_scores(
            vision_candidates=vision_result.get("candidates", []),
            rag_candidates=rag_result.get("candidates", []),
            geo_candidates=geo_result.get("candidates", []),
        )

        matches_created = []
        for candidate in fused:
            if candidate.get("passes_threshold", False):
                evidence = build_evidence(candidate)
                evidence["explanation"] = f"Match detected with {candidate.get('fused_score', 0):.0%} confidence across {candidate.get('modalities_agreeing', 0)} modalities."

                match_obj = MatchCandidate(
                    case_id=uuid.UUID(case_id),
                    source_record_id=uuid.UUID(candidate["source_record_id"]),
                    vision_score=candidate.get("vision_score", 0),
                    rag_score=candidate.get("rag_score", 0),
                    geo_score=candidate.get("geo_score", 0),
                    fused_score=candidate.get("fused_score", 0),
                    evidence=evidence,
                    status="pending",
                )
                db.add(match_obj)
                matches_created.append({
                    "match_id": str(match_obj.id),
                    "fused_score": candidate["fused_score"],
                    "person_name": candidate.get("person_name"),
                    "evidence": evidence,
                })

        case_result = await db.execute(select(Case).where(Case.id == uuid.UUID(case_id)))
        case = case_result.scalar_one_or_none()
        if case:
            case.status = "matched" if matches_created else "searching"
        await db.commit()

        yield {
            "type": "PIPELINE_COMPLETE",
            "total_candidates": len(fused),
            "matches_above_threshold": len(matches_created),
            "matches": matches_created,
        }
