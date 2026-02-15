"""LiteLLM wrapper for universal LLM access."""
import os
import litellm
from typing import Optional, List, Dict, Any

from app.config import settings

# Configure LiteLLM for Google Gemini
os.environ["GEMINI_API_KEY"] = settings.OPENAI_API_KEY or ""
litellm.api_key = settings.OPENAI_API_KEY


async def chat_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 2000,
    response_format: Optional[Dict] = None,
) -> str:
    """Send a chat completion request via LiteLLM."""
    model = model or settings.LITELLM_MODEL

    kwargs: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        kwargs["response_format"] = response_format

    response = await litellm.acompletion(**kwargs)
    return response.choices[0].message.content


async def generate_json(
    prompt: str,
    system_prompt: str = "You are a helpful AI assistant. Always respond with valid JSON.",
    model: Optional[str] = None,
) -> str:
    """Generate a JSON response from a prompt."""
    return await chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        model=model,
        temperature=0.3,
        response_format={"type": "json_object"},
    )


async def analyze_match(
    case_info: Dict,
    source_info: Dict,
    scores: Dict,
) -> str:
    """Generate an explanation for why a match was found."""
    prompt = f"""Analyze this potential match between a missing person case and a source record.

MISSING PERSON CASE:
- Name: {case_info.get('person_name', 'Unknown')}
- Age: {case_info.get('age', 'Unknown')}
- Gender: {case_info.get('gender', 'Unknown')}
- Description: {case_info.get('description', 'None')}
- Last Known Location: {case_info.get('last_known_location', 'Unknown')}

SOURCE RECORD (Potential Match):
- Name: {source_info.get('person_name', 'Unknown')}
- Age: {source_info.get('age', 'Unknown')}
- Gender: {source_info.get('gender', 'Unknown')}
- Description: {source_info.get('description', 'None')}
- Location: {source_info.get('location_name', 'Unknown')}
- Source: {source_info.get('source_type', 'Unknown')}

MATCH SCORES:
- Vision (face similarity): {scores.get('vision_score', 0):.2f}
- Text (name/description): {scores.get('rag_score', 0):.2f}
- Geo (location proximity): {scores.get('geo_score', 0):.2f}
- Fused (weighted total): {scores.get('fused_score', 0):.2f}

Provide a brief, clear explanation (2-3 sentences) of why this match was flagged, what evidence supports it, and any caveats. Be sensitive - this involves missing persons."""

    return await chat_completion(
        messages=[
            {"role": "system", "content": "You are a humanitarian aid AI assistant helping with family reunification. Be accurate, compassionate, and clear."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=300,
    )
