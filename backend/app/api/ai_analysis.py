"""
AI Analysis endpoints powered by Google Gemini via LiteLLM.
Provides case analysis, risk assessment, and match evaluation.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.config import settings
from app.models.case import Case
from app.models.match import MatchCandidate

router = APIRouter()


async def _gemini_chat(system_prompt: str, user_prompt: str) -> str:
    """Call Google Gemini via LiteLLM for text analysis."""
    import litellm

    # Configure Google Gemini
    litellm.api_key = settings.GOOGLE_API_KEY or settings.OPENAI_API_KEY
    model = settings.LITELLM_MODEL  # "gemini/gemini-2.0-flash"

    try:
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,
            max_tokens=1500,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {str(e)}")


class AnalyzeRequest(BaseModel):
    case_id: Optional[str] = None
    description: Optional[str] = None
    analysis_type: str = "risk"  # risk | match | recommend | summary


@router.post("/analyze")
async def analyze_case(req: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    """
    AI-powered case analysis using Google Gemini.
    Supports: risk assessment, match evaluation, action recommendation, case summary.
    """
    case_context = ""
    if req.case_id:
        try:
            cid = uuid.UUID(req.case_id)
        except ValueError:
            raise HTTPException(400, "Invalid case_id format")
        result = await db.execute(select(Case).where(Case.id == cid))
        case = result.scalar_one_or_none()
        if not case:
            raise HTTPException(404, "Case not found")
        case_context = (
            f"Person: {case.person_name}, Age: {case.age}, Status: {case.status}\n"
            f"Last known location: {case.last_known_location} ({case.last_known_lat}, {case.last_known_lng})\n"
            f"Description: {case.description or 'N/A'}\n"
            f"Reported: {case.created_at}\n"
        )

        # Fetch matches
        match_result = await db.execute(
            select(MatchCandidate).where(MatchCandidate.case_id == cid).limit(5)
        )
        matches = match_result.scalars().all()
        if matches:
            case_context += "\nExisting matches:\n"
            for m in matches:
                case_context += f"  - Fused score: {m.fused_score:.2f}, Status: {m.status}, Vision: {m.vision_score or 0:.2f}, RAG: {m.rag_score or 0:.2f}, Geo: {m.geo_score or 0:.2f}\n"
    elif req.description:
        case_context = f"User description: {req.description}\n"
    else:
        raise HTTPException(400, "Provide case_id or description")

    system_prompts = {
        "risk": (
            "You are TraceBridge's risk assessment engine, specialized in missing person cases. "
            "Analyze the case information and provide:\n"
            "1. Risk level (CRITICAL / HIGH / MEDIUM / LOW) with reasoning\n"
            "2. Key risk factors\n"
            "3. Time sensitivity assessment\n"
            "4. Recommended priority actions\n"
            "Be specific, data-driven, and concise. Format with clear headers."
        ),
        "match": (
            "You are TraceBridge's match evaluation engine. Analyze the case and any existing matches. "
            "Provide:\n"
            "1. Match quality assessment\n"
            "2. Confidence analysis for each match\n"
            "3. Suggested verification steps\n"
            "4. Potential false positive indicators\n"
            "Be specific and actionable."
        ),
        "recommend": (
            "You are TraceBridge's operational advisor for missing person reunification. "
            "Based on the case data, recommend:\n"
            "1. Immediate next actions (ranked by priority)\n"
            "2. Search strategy (geographic, temporal, source-based)\n"
            "3. Agency coordination suggestions\n"
            "4. Communication approach for family\n"
            "Be practical and crisis-appropriate."
        ),
        "summary": (
            "You are TraceBridge's case briefing generator. "
            "Create a concise executive summary of this missing person case covering:\n"
            "1. Case overview (2-3 sentences)\n"
            "2. Current status and progress\n"
            "3. Key findings\n"
            "4. Outstanding actions\n"
            "Format for rapid review by field workers."
        ),
    }

    system = system_prompts.get(req.analysis_type, system_prompts["risk"])
    user_msg = f"Analyze this missing person case:\n\n{case_context}"

    analysis = await _gemini_chat(system, user_msg)

    return {
        "analysis_type": req.analysis_type,
        "model": settings.LITELLM_MODEL,
        "result": analysis,
        "case_id": req.case_id,
    }


@router.post("/suggest-description")
async def suggest_description(
    partial_info: str = Body(..., embed=True),
):
    """
    Given partial info about a missing person, use Gemini to generate a structured report description.
    Useful for case intake when reporters are distressed and need help articulating details.
    """
    system = (
        "You are a compassionate crisis intake assistant for TraceBridge, a missing persons platform. "
        "Given partial information about a missing person, help structure it into a clear, "
        "professional missing person description. Include any inferred details clearly marked as "
        "[INFERRED]. Keep the tone calm, professional, and optimistic. "
        "Format: Physical Description, Last Known Details, Distinguishing Features, Additional Notes."
    )
    result = await _gemini_chat(system, f"Partial information provided:\n{partial_info}")
    return {"suggestion": result, "model": settings.LITELLM_MODEL}


@router.get("/health")
async def ai_health():
    """Check AI service availability."""
    has_key = bool(settings.GOOGLE_API_KEY or settings.OPENAI_API_KEY)
    return {
        "model": settings.LITELLM_MODEL,
        "api_key_configured": has_key,
        "provider": "Google Gemini" if "gemini" in settings.LITELLM_MODEL else "OpenAI",
    }
