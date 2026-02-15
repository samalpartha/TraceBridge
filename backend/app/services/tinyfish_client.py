"""TinyFish Web Agent API client - SSE streaming, sync, and async modes.

Following cookbook patterns from https://github.com/tinyfish-io/tinyfish-cookbook
API Docs: https://docs.mino.ai/

Endpoints:
  POST /run-sse   - SSE streaming (real-time UI)
  POST /run       - Synchronous (blocks until done)
  POST /run-async - Start, returns run_id for polling
  GET  /runs/{id} - Poll async status
"""
import httpx
import json
import logging
from typing import AsyncGenerator, Optional, Dict, Any

from app.config import settings

logger = logging.getLogger(__name__)

TINYFISH_BASE = settings.TINYFISH_BASE_URL
TINYFISH_HEADERS = {
    "X-API-Key": settings.TINYFISH_API_KEY,
    "Content-Type": "application/json",
}


def _build_payload(
    url: str,
    goal: str,
    stealth: bool = False,
    proxy_config: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Build TinyFish API request payload."""
    payload: Dict[str, Any] = {
        "url": url,
        "goal": goal,
        "browser_profile": "stealth" if stealth else "lite",
    }
    if proxy_config:
        payload["proxy_config"] = proxy_config
    return payload


async def run_sse_automation(
    url: str,
    goal: str,
    stealth: bool = False,
    proxy_config: Optional[Dict] = None,
    timeout: int = 120,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Stream TinyFish automation results via SSE.

    Yields event dicts with types: STARTED, STREAMING_URL, PROGRESS, HEARTBEAT, COMPLETE
    """
    payload = _build_payload(url, goal, stealth, proxy_config)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{TINYFISH_BASE}/run-sse",
                headers=TINYFISH_HEADERS,
                json=payload,
            ) as response:
                if response.status_code != 200:
                    error_body = ""
                    async for chunk in response.aiter_text():
                        error_body += chunk
                    logger.error(f"TinyFish SSE error {response.status_code}: {error_body}")
                    yield {"type": "COMPLETE", "status": "FAILED", "error": f"API error {response.status_code}"}
                    return

                buffer = ""
                async for chunk in response.aiter_text():
                    buffer += chunk
                    lines = buffer.split("\n")
                    buffer = lines[-1]  # keep incomplete line

                    for line in lines[:-1]:
                        if line.startswith("data: "):
                            try:
                                event = json.loads(line[6:])
                                yield event
                                if event.get("type") == "COMPLETE":
                                    return
                            except json.JSONDecodeError:
                                continue
    except httpx.TimeoutException:
        logger.error(f"TinyFish SSE timeout after {timeout}s for {url}")
        yield {"type": "COMPLETE", "status": "FAILED", "error": "Timeout"}
    except Exception as e:
        logger.error(f"TinyFish SSE error: {e}")
        yield {"type": "COMPLETE", "status": "FAILED", "error": str(e)}


def run_sync_automation(
    url: str,
    goal: str,
    stealth: bool = False,
    proxy_config: Optional[Dict] = None,
    timeout: int = 120,
) -> Dict[str, Any]:
    """Synchronous TinyFish call - blocks until completion. Use in Celery tasks or thread pool."""
    payload = _build_payload(url, goal, stealth, proxy_config)

    try:
        resp = httpx.post(
            f"{TINYFISH_BASE}/run",
            headers=TINYFISH_HEADERS,
            json=payload,
            timeout=timeout,
        )
        if resp.status_code != 200:
            logger.error(f"TinyFish sync error {resp.status_code}: {resp.text}")
            return {"status": "FAILED", "error": f"API error {resp.status_code}"}
        return resp.json()
    except httpx.TimeoutException:
        logger.error(f"TinyFish sync timeout for {url}")
        return {"status": "FAILED", "error": "Timeout"}
    except Exception as e:
        logger.error(f"TinyFish sync error: {e}")
        return {"status": "FAILED", "error": str(e)}


async def run_async_automation(
    url: str,
    goal: str,
    stealth: bool = False,
) -> Dict[str, Any]:
    """Start TinyFish automation asynchronously. Returns run_id for polling."""
    payload = _build_payload(url, goal, stealth)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{TINYFISH_BASE}/run-async",
                headers=TINYFISH_HEADERS,
                json=payload,
            )
            if resp.status_code != 200:
                return {"error": f"API error {resp.status_code}"}
            return resp.json()
    except Exception as e:
        return {"error": str(e)}


async def poll_run_status(run_id: str) -> Dict[str, Any]:
    """Poll the status of an async TinyFish run."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://agent.tinyfish.ai/v1/runs/{run_id}",
                headers=TINYFISH_HEADERS,
            )
            return resp.json()
    except Exception as e:
        return {"error": str(e)}
