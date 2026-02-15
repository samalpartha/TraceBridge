"""
TinyFish Action Endpoints — 7 workflow types wired to the TraceBridge UI.

Each endpoint wraps a TinyFish automation call (SSE or sync) with
domain-specific goals, and returns structured results for the frontend.
"""
import uuid
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.config import settings
from app.models.case import Case
from app.models.match import MatchCandidate
from app.services.tinyfish_client import (
    run_sse_automation,
    run_sync_automation,
    run_async_automation,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────

def _case_context(case: Case) -> str:
    return (
        f"Person: {case.person_name}, Age: {case.age}, Status: {case.status}\n"
        f"Last known: {case.last_known_location} ({case.last_known_lat}, {case.last_known_lng})\n"
        f"Description: {case.description or 'N/A'}\n"
    )


async def _get_case(case_id: str, db: AsyncSession) -> Case:
    try:
        cid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(400, "Invalid case_id")
    result = await db.execute(select(Case).where(Case.id == cid))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(404, "Case not found")
    return case


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. OUTREACH PLAN — multi-channel contact plan + message drafts
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class OutreachPlanRequest(BaseModel):
    case_id: str
    match_summary: Optional[str] = None


@router.post("/outreach-plan")
async def generate_outreach_plan(req: OutreachPlanRequest, db: AsyncSession = Depends(get_db)):
    """Generate a multi-channel outreach plan with drafted messages for each channel."""
    case = await _get_case(req.case_id, db)
    ctx = _case_context(case)
    match_info = req.match_summary or "Verified match found — ready for outreach."

    goal = (
        f"You are a crisis reunification outreach coordinator. Based on this case:\n{ctx}\n"
        f"Match info: {match_info}\n\n"
        f"Generate a JSON outreach plan with these keys:\n"
        f"1. 'contact_plan': array of {{ 'target': string, 'type': 'shelter'|'hospital'|'police'|'ngo'|'hotline', 'priority': 1-5 }}\n"
        f"2. 'messages': object with keys 'email', 'sms', 'whatsapp', 'call_script' — each a string draft\n"
        f"3. 'next_steps': array of 3-5 action strings\n"
        f"Return ONLY valid JSON."
    )

    try:
        result = run_sync_automation(
            url="https://agent.tinyfish.ai",
            goal=goal,
            timeout=60,
        )
        return {
            "workflow": "outreach_plan",
            "case_id": req.case_id,
            "tinyfish_result": result,
            "fallback": _fallback_outreach_plan(case),
        }
    except Exception as e:
        logger.error(f"Outreach plan failed: {e}")
        return {
            "workflow": "outreach_plan",
            "case_id": req.case_id,
            "tinyfish_result": None,
            "fallback": _fallback_outreach_plan(case),
        }


def _fallback_outreach_plan(case: Case) -> dict:
    """Deterministic fallback when TinyFish is unavailable."""
    name = case.person_name
    loc = case.last_known_location or "last known area"
    age_str = f", age {case.age}" if case.age else ""
    return {
        "contact_plan": [
            {"target": f"Nearest shelter to {loc}", "type": "shelter", "priority": 1},
            {"target": f"Local hospital intake desk", "type": "hospital", "priority": 2},
            {"target": f"Local police department", "type": "police", "priority": 3},
            {"target": f"Red Cross / ICRC regional office", "type": "ngo", "priority": 4},
            {"target": f"National missing persons hotline", "type": "hotline", "priority": 5},
        ],
        "messages": {
            "email": f"Subject: URGENT — Missing Person Lead: {name}\n\nWe have a verified match for {name}{age_str}, last seen near {loc}. Please check your intake records and respond to this case immediately. Case reference available in TraceBridge system.",
            "sms": f"URGENT TraceBridge Alert: Verified match for {name}{age_str} near {loc}. Please check intake records and respond ASAP. Ref: TraceBridge case.",
            "whatsapp": f"Hi, this is TraceBridge crisis reunification. We have a verified match for {name}{age_str}. Last seen near {loc}. Can you check if this person is in your facility? Thank you.",
            "call_script": f"Hello, I'm calling from TraceBridge, a crisis reunification platform. We have a verified lead on a missing person named {name}{age_str}. They were last seen near {loc}. Could you check if anyone matching this description has been through your facility recently? I can provide a photo and additional details. This is time-sensitive.",
        },
        "next_steps": [
            "Send email to nearest shelter",
            "Call local hospital intake desk",
            "Alert local police with case reference",
            "Notify Red Cross regional coordinator",
            "Set 4-hour follow-up reminder",
        ],
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. SOURCE SCAN — trigger TinyFish to pull records from approved sources
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class SourceScanRequest(BaseModel):
    source: str = "all"  # fbi | iom | namus | shelters | all
    re_score: bool = True


@router.post("/scan-sources")
async def trigger_source_scan(req: SourceScanRequest):
    """Trigger TinyFish to scan approved data sources and ingest new records."""
    sources = {
        "fbi": {"url": "https://api.fbi.gov/wanted/v1/list", "goal": "Scrape the FBI Most Wanted list, extract names, photos, descriptions, and locations. Return structured JSON."},
        "iom": {"url": "https://missingmigrants.iom.int/downloads", "goal": "Download the latest Missing Migrants CSV data. Extract incident records with dates, locations, and descriptions. Return structured JSON."},
        "namus": {"url": "https://www.namus.gov/MissingPersons/Search", "goal": "Search NamUs for recent missing person cases. Extract names, photos, last known locations, and case numbers. Return structured JSON."},
        "shelters": {"url": "https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html", "goal": "Scan Red Cross open shelter listings. Extract shelter names, addresses, capacities, and current status. Return structured JSON."},
    }

    targets = sources if req.source == "all" else {req.source: sources.get(req.source)}
    results = {}

    for key, config in targets.items():
        if not config:
            continue
        try:
            result = await run_async_automation(
                url=config["url"],
                goal=config["goal"],
            )
            results[key] = {"status": "started", "run_id": result.get("run_id"), **result}
        except Exception as e:
            results[key] = {"status": "failed", "error": str(e)}

    return {
        "workflow": "source_scan",
        "sources_triggered": list(results.keys()),
        "results": results,
        "re_score_queued": req.re_score,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. VERIFICATION ASSIST — generate evidence cards for caseworker review
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class VerifyAssistRequest(BaseModel):
    case_id: str
    match_id: Optional[str] = None


@router.post("/verify-assist")
async def verification_assist(req: VerifyAssistRequest, db: AsyncSession = Depends(get_db)):
    """Generate AI-powered evidence cards and decision support for caseworker verification."""
    case = await _get_case(req.case_id, db)
    ctx = _case_context(case)

    matches_ctx = ""
    match_query = select(MatchCandidate).where(MatchCandidate.case_id == case.id)
    if req.match_id:
        match_query = match_query.where(MatchCandidate.id == uuid.UUID(req.match_id))
    result = await db.execute(match_query.limit(5))
    matches = result.scalars().all()

    for m in matches:
        matches_ctx += (
            f"- Match {str(m.id)[:8]}: fused={m.fused_score:.2f}, "
            f"vision={m.vision_score or 0:.2f}, rag={m.rag_score or 0:.2f}, "
            f"geo={m.geo_score or 0:.2f}, status={m.status}\n"
        )

    goal = (
        f"You are a verification assistant for TraceBridge. Analyze this case and its matches:\n"
        f"Case: {ctx}\nMatches:\n{matches_ctx}\n\n"
        f"For each match, produce a JSON array of evidence_cards, each with:\n"
        f"  'match_id', 'confidence': 'high'|'medium'|'low',\n"
        f"  'evidence': [{{ 'type': string, 'detail': string, 'strength': 1-10 }}],\n"
        f"  'red_flags': [string], 'recommendation': 'confirm'|'reject'|'need_more'\n"
        f"Return ONLY valid JSON array."
    )

    try:
        result = run_sync_automation(
            url="https://agent.tinyfish.ai",
            goal=goal,
            timeout=60,
        )
        return {
            "workflow": "verify_assist",
            "case_id": req.case_id,
            "tinyfish_result": result,
            "match_count": len(matches),
            "fallback": _fallback_evidence_cards(matches),
        }
    except Exception as e:
        return {
            "workflow": "verify_assist",
            "case_id": req.case_id,
            "tinyfish_result": None,
            "fallback": _fallback_evidence_cards(matches),
        }


def _fallback_evidence_cards(matches) -> list:
    cards = []
    for m in matches:
        fused = m.fused_score or 0
        conf = "high" if fused > 0.7 else "medium" if fused > 0.4 else "low"
        evidence = []
        if m.vision_score and m.vision_score > 0.3:
            evidence.append({"type": "Face Match", "detail": f"Visual similarity {m.vision_score:.0%}", "strength": min(10, int(m.vision_score * 12))})
        if m.rag_score and m.rag_score > 0.3:
            evidence.append({"type": "Records Match", "detail": f"Text similarity {m.rag_score:.0%}", "strength": min(10, int(m.rag_score * 12))})
        if m.geo_score and m.geo_score > 0.3:
            evidence.append({"type": "Geo Proximity", "detail": f"Location plausibility {m.geo_score:.0%}", "strength": min(10, int(m.geo_score * 12))})
        cards.append({
            "match_id": str(m.id)[:8],
            "confidence": conf,
            "evidence": evidence,
            "red_flags": ["Low visual score" if (m.vision_score or 0) < 0.3 else None, "No geo data" if (m.geo_score or 0) == 0 else None],
            "recommendation": "confirm" if fused > 0.7 else "need_more" if fused > 0.4 else "reject",
        })
    return cards


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. ESCALATION — SLA breach triggers notification and action list
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class EscalationRequest(BaseModel):
    case_id: str
    sla_hours: float
    breach_reason: str = "SLA exceeded"


@router.post("/escalate")
async def trigger_escalation(req: EscalationRequest, db: AsyncSession = Depends(get_db)):
    """Trigger TinyFish escalation workflow when SLA is breached."""
    case = await _get_case(req.case_id, db)
    ctx = _case_context(case)

    goal = (
        f"URGENT ESCALATION for TraceBridge case.\n{ctx}\n"
        f"SLA breached: {req.sla_hours} hours open. Reason: {req.breach_reason}\n\n"
        f"Generate an escalation notification package as JSON:\n"
        f"1. 'alert_message': brief urgent message for on-call coordinator\n"
        f"2. 'action_list': 5 prioritized actions to take NOW\n"
        f"3. 'notify_roles': array of roles to notify (e.g. 'field_coordinator', 'supervisor')\n"
        f"4. 'follow_up_interval_hours': recommended check-in interval\n"
        f"Return ONLY valid JSON."
    )

    try:
        result = run_sync_automation(
            url="https://agent.tinyfish.ai",
            goal=goal,
            timeout=45,
        )
        return {"workflow": "escalation", "case_id": req.case_id, "tinyfish_result": result, "fallback": _fallback_escalation(case, req)}
    except Exception:
        return {"workflow": "escalation", "case_id": req.case_id, "tinyfish_result": None, "fallback": _fallback_escalation(case, req)}


def _fallback_escalation(case: Case, req: EscalationRequest) -> dict:
    return {
        "alert_message": f"CRITICAL: Case for {case.person_name} has exceeded SLA at {req.sla_hours}h. Immediate attention required.",
        "action_list": [
            "Assign dedicated field coordinator immediately",
            "Expand search radius by 50km",
            "Re-run AI matching with relaxed thresholds",
            "Contact all shelters within 100km radius",
            "Escalate to regional supervisor",
        ],
        "notify_roles": ["field_coordinator", "supervisor", "ai_ops"],
        "follow_up_interval_hours": 2,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. AGENCY PACK — generate shareable packet for partner organizations
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class AgencyPackRequest(BaseModel):
    case_id: str
    receiving_agency: str = "Red Cross"
    redact_sensitive: bool = True


@router.post("/agency-pack")
async def generate_agency_pack(req: AgencyPackRequest, db: AsyncSession = Depends(get_db)):
    """Generate a shareable coordination packet for a partner agency."""
    case = await _get_case(req.case_id, db)
    ctx = _case_context(case)

    goal = (
        f"Generate a multi-agency coordination packet for {req.receiving_agency}.\n"
        f"Case data:\n{ctx}\n"
        f"{'Redact exact coordinates and sensitive details.' if req.redact_sensitive else 'Include full details.'}\n\n"
        f"Return JSON with:\n"
        f"1. 'summary': 3-sentence case briefing\n"
        f"2. 'last_seen': location description (redacted if needed)\n"
        f"3. 'identifiers': array of {{ 'type', 'value' }} (name, age, features)\n"
        f"4. 'consent_status': 'family_reported' (assumed)\n"
        f"5. 'checklist': 5-7 action items for the receiving agency\n"
        f"6. 'contact_back': 'TraceBridge Operations — respond to this case ID'\n"
        f"Return ONLY valid JSON."
    )

    try:
        result = run_sync_automation(url="https://agent.tinyfish.ai", goal=goal, timeout=60)
        return {"workflow": "agency_pack", "case_id": req.case_id, "agency": req.receiving_agency, "tinyfish_result": result, "fallback": _fallback_agency_pack(case, req)}
    except Exception:
        return {"workflow": "agency_pack", "case_id": req.case_id, "agency": req.receiving_agency, "tinyfish_result": None, "fallback": _fallback_agency_pack(case, req)}


def _fallback_agency_pack(case: Case, req: AgencyPackRequest) -> dict:
    loc = case.last_known_location or "Unknown"
    if req.redact_sensitive and case.last_known_lat:
        loc = f"Approximate area: {loc} (exact coordinates redacted)"
    identifiers = [{"type": "Name", "value": case.person_name}]
    if case.age:
        identifiers.append({"type": "Age", "value": str(case.age)})
    if case.description:
        identifiers.append({"type": "Description", "value": case.description[:200]})
    return {
        "summary": f"TraceBridge is coordinating the search for {case.person_name}, last reported near {case.last_known_location or 'unknown location'}. This case has been reported by family and is actively being investigated through our multi-agent AI pipeline. Your assistance in checking local facilities is requested.",
        "last_seen": loc,
        "identifiers": identifiers,
        "consent_status": "family_reported",
        "checklist": [
            f"Check intake records for anyone matching {case.person_name}",
            "Review recent admissions in the past 72 hours",
            "Share case photo with frontline staff (if provided)",
            "Check neighboring facility records",
            "Respond to TraceBridge with findings within 24 hours",
            "Preserve any evidence or records",
            "Contact TraceBridge Operations if a match is found",
        ],
        "contact_back": f"TraceBridge Operations — Case ID: {str(case.id)[:8]}",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. CALL CENTER ASSIST — real-time call script + entity capture
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CallAssistRequest(BaseModel):
    case_id: str
    call_type: str = "inquiry"  # inquiry | follow_up | verification | family_update
    notes: Optional[str] = None


@router.post("/call-assist")
async def call_center_assist(req: CallAssistRequest, db: AsyncSession = Depends(get_db)):
    """Generate a real-time call script and structured note template."""
    case = await _get_case(req.case_id, db)
    ctx = _case_context(case)

    scripts = {
        "inquiry": f"Opening: 'Thank you for calling TraceBridge. I'm looking at case for {case.person_name}.'\nPurpose: Gather new information about potential sighting.\nKey questions: Where? When? Physical description? Who reported?\nClosing: Confirm next steps, provide case reference.",
        "follow_up": f"Opening: 'Hi, I'm following up on the TraceBridge case for {case.person_name}.'\nPurpose: Check status of previous outreach.\nKey questions: Were records checked? Any matches found? Timeline for response?\nClosing: Set next follow-up date.",
        "verification": f"Opening: 'I'm calling to verify a potential match for {case.person_name}.'\nPurpose: Confirm identity details.\nKey questions: Can you confirm name, age, physical features? When was this person seen? Current status?\nClosing: Request photo or documentation if possible.",
        "family_update": f"Opening: 'Hello, I'm calling with an update on your TraceBridge case for {case.person_name}.'\nPurpose: Update family on progress.\nKey points: Search status, number of leads, next steps.\nClosing: Reassure, provide timeline estimate, offer counseling resources.",
    }

    note_template = {
        "call_type": req.call_type,
        "case_ref": str(case.id)[:8],
        "person": case.person_name,
        "fields_to_capture": [
            "Caller name and relationship",
            "New information provided",
            "Location details",
            "Time/date of sighting",
            "Physical description match",
            "Action items from call",
            "Follow-up required (Y/N)",
            "Next contact date",
        ],
    }

    return {
        "workflow": "call_assist",
        "case_id": req.case_id,
        "call_type": req.call_type,
        "script": scripts.get(req.call_type, scripts["inquiry"]),
        "note_template": note_template,
        "suggested_next_calls": _suggest_next_calls(case),
    }


def _suggest_next_calls(case: Case) -> list:
    calls = []
    if case.status == "open":
        calls.append({"target": "Nearest shelter", "reason": "No outreach yet", "priority": "high"})
        calls.append({"target": "Local police non-emergency", "reason": "File awareness report", "priority": "high"})
    if case.status in ("searching", "matched"):
        calls.append({"target": "Hospital intake", "reason": "Check recent admissions", "priority": "medium"})
        calls.append({"target": "NGO field office", "reason": "Coordinate search area", "priority": "medium"})
    calls.append({"target": "Family member", "reason": "Provide status update", "priority": "medium"})
    return calls


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. CLOSURE — post-reunification workflow steps
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ClosureRequest(BaseModel):
    case_id: str
    reunification_details: Optional[str] = None


@router.post("/closure")
async def trigger_closure(req: ClosureRequest, db: AsyncSession = Depends(get_db)):
    """Trigger post-reunification closure workflow."""
    case = await _get_case(req.case_id, db)

    closure_steps = [
        {"step": 1, "action": "Confirm identity match", "detail": "Verify the reunited person's identity with photo ID, family confirmation, or biometric match.", "status": "pending"},
        {"step": 2, "action": "Confirm guardian/family", "detail": "Verify the receiving family member's identity and relationship.", "status": "pending"},
        {"step": 3, "action": "Record reunification details", "detail": f"Location, date/time, witnesses, and method of reunification for {case.person_name}.", "status": "pending"},
        {"step": 4, "action": "Send closure notifications", "detail": "Notify all partner agencies, shelters, and organizations that were contacted.", "status": "pending"},
        {"step": 5, "action": "Archive case evidence", "detail": "Preserve all match evidence, verification logs, and communication records.", "status": "pending"},
        {"step": 6, "action": "Generate lessons learned", "detail": "Document what worked, time-to-reunion, AI accuracy, and improvement opportunities.", "status": "pending"},
        {"step": 7, "action": "Update impact metrics", "detail": "Record successful reunion in ops dashboard, update cost savings and time metrics.", "status": "pending"},
    ]

    # Try TinyFish for automated closure notifications
    goal = (
        f"Generate closure notification messages for TraceBridge case: {case.person_name}.\n"
        f"Details: {req.reunification_details or 'Reunification confirmed.'}\n"
        f"Return JSON with 'notifications': array of {{ 'recipient': string, 'channel': string, 'message': string }}"
    )

    tinyfish_result = None
    try:
        tinyfish_result = run_sync_automation(url="https://agent.tinyfish.ai", goal=goal, timeout=45)
    except Exception:
        pass

    fallback_notifications = [
        {"recipient": "Reporting family", "channel": "phone", "message": f"Wonderful news — {case.person_name} has been located and reunification is being arranged. A caseworker will contact you shortly with details."},
        {"recipient": "Partner shelters", "channel": "email", "message": f"TraceBridge case {str(case.id)[:8]}: {case.person_name} has been reunited. Please close any active lookouts. Thank you for your assistance."},
        {"recipient": "Law enforcement", "channel": "system", "message": f"TraceBridge missing person case resolved: {case.person_name}. Reunification confirmed. Case can be archived."},
        {"recipient": "Internal ops", "channel": "dashboard", "message": f"Case closed: {case.person_name}. Update KPIs and archive evidence."},
    ]

    return {
        "workflow": "closure",
        "case_id": req.case_id,
        "person_name": case.person_name,
        "closure_steps": closure_steps,
        "notifications": fallback_notifications,
        "tinyfish_result": tinyfish_result,
        "lessons_template": {
            "time_to_first_lead_hours": None,
            "time_to_reunion_hours": None,
            "ai_agents_used": ["Vision", "RAG", "Geo", "Fusion", "Outreach"],
            "key_signal": "Which agent/source produced the breakthrough?",
            "improvement_note": "",
        },
    }
