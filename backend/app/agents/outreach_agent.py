"""A6 Outreach Agent - TinyFish-powered NGO outreach workflows."""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional, AsyncGenerator

from app.services.tinyfish_client import run_sse_automation, run_sync_automation
from app.models.match import MatchCandidate

_executor = ThreadPoolExecutor(max_workers=2)


def _build_goal(person_name: str, fused_score: float, message: Optional[str]) -> str:
    return f"""
    You are helping with a humanitarian family reunification case.

    Navigate to this page and find:
    1. Any contact forms or submission methods for reporting a found person
    2. Phone numbers or email addresses for family tracing services
    3. Any online tools for submitting reunification requests

    Context: A potential match has been found for a missing person case.
    Person name: {person_name}
    Confidence: {fused_score:.0%}

    Additional message: {message or 'Please gather contact information for follow-up.'}

    Return the result as JSON:
    {{
        "contact_methods": [{{"type": "form|phone|email|portal", "value": "..."}}],
        "page_title": "...",
        "next_steps": "...",
        "submission_possible": true/false
    }}
    """


def _get_person_name(match: MatchCandidate) -> str:
    """Extract person_name from evidence or match metadata."""
    evidence = match.evidence or {}
    return evidence.get("person_name") or evidence.get("matched_person_name") or "Unknown person"


async def run_tinyfish_outreach(
    match: MatchCandidate,
    target_url: Optional[str] = None,
    message: Optional[str] = None,
) -> Dict[str, Any]:
    """Run TinyFish outreach to an NGO portal.

    Uses thread pool to avoid blocking the event loop with sync httpx calls.
    """
    if not target_url:
        target_url = "https://familylinks.icrc.org/en/pages/home.aspx"

    person_name = _get_person_name(match)
    goal = _build_goal(person_name, match.fused_score or 0, message)

    try:
        # Run sync automation in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            _executor,
            lambda: run_sync_automation(url=target_url, goal=goal, stealth=True),
        )

        return {
            "status": result.get("status", "FAILED"),
            "run_id": result.get("run_id"),
            "result": result.get("result"),
            "target_url": target_url,
        }
    except Exception as e:
        return {
            "status": "FAILED",
            "run_id": None,
            "result": None,
            "target_url": target_url,
            "error": str(e),
        }


async def run_tinyfish_outreach_stream(
    match: MatchCandidate,
    target_url: Optional[str] = None,
    message: Optional[str] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Stream TinyFish outreach progress via SSE."""
    if not target_url:
        target_url = "https://familylinks.icrc.org/en/pages/home.aspx"

    person_name = _get_person_name(match)
    goal = _build_goal(person_name, match.fused_score or 0, message)

    yield {"type": "OUTREACH_STARTED", "target_url": target_url, "match_id": str(match.id)}

    try:
        async for event in run_sse_automation(url=target_url, goal=goal, stealth=True):
            if event.get("type") == "STREAMING_URL":
                yield {"type": "BROWSER_URL", "streaming_url": event.get("streamingUrl", "")}
            elif event.get("type") == "PROGRESS":
                yield {"type": "OUTREACH_PROGRESS", "message": event.get("purpose", "")}
            elif event.get("type") == "COMPLETE":
                yield {
                    "type": "OUTREACH_COMPLETE",
                    "status": event.get("status", "COMPLETED"),
                    "result": event.get("resultJson"),
                    "run_id": event.get("runId"),
                }
    except Exception as e:
        yield {
            "type": "OUTREACH_ERROR",
            "error": str(e),
        }
