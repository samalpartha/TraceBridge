
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.tinyfish_client import run_sse_automation, run_sync_automation, run_async_automation, poll_run_status
import json

class TestTinyFishClient:

    @pytest.mark.asyncio
    async def test_run_sse_automation_success(self):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            
            # Mock aiter_text to yield SSE lines
            async def async_gen():
                yield 'data: {"type": "STARTED"}\n'
                yield 'data: {"type": "COMPLETE", "status": "COMPLETED"}\n'
            
            mock_response.aiter_text.side_effect = async_gen
            
            # Mock stream context manager
            # client.stream(...) returns a context manager, it is NOT awaitable itself.
            mock_stream_ctx = AsyncMock()
            mock_stream_ctx.__aenter__.return_value = mock_response
            mock_client.stream = MagicMock(return_value=mock_stream_ctx)
            
            events = []
            async for event in run_sse_automation("http://url", "goal"):
                events.append(event)
            
            assert len(events) == 2
            assert events[0]["type"] == "STARTED"
            assert events[1]["status"] == "COMPLETED"

    @pytest.mark.asyncio
    async def test_run_sse_automation_error(self):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 500
            
            async def async_gen():
                yield "Internal Server Error"

            mock_response.aiter_text.side_effect = async_gen

            mock_stream_ctx = AsyncMock()
            mock_stream_ctx.__aenter__.return_value = mock_response
            mock_client.stream = MagicMock(return_value=mock_stream_ctx)

            events = []
            async for event in run_sse_automation("http://url", "goal"):
                events.append(event)
            
            assert len(events) == 1
            assert events[0]["status"] == "FAILED"
            assert "500" in events[0]["error"]

    def test_run_sync_automation_success(self):
        with patch("httpx.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"status": "COMPLETED"}
            mock_post.return_value = mock_resp
            
            res = run_sync_automation("http://url", "goal")
            assert res["status"] == "COMPLETED"

    def test_run_sync_automation_error(self):
        with patch("httpx.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 500
            mock_resp.text = "Error"
            mock_post.return_value = mock_resp
            
            res = run_sync_automation("http://url", "goal")
            assert res["status"] == "FAILED"

    @pytest.mark.asyncio
    async def test_run_async_automation_success(self):
         with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client
            
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"run_id": "123"}
            mock_client.post.return_value = mock_resp
            
            res = await run_async_automation("http://url", "goal")
            assert res["run_id"] == "123"

    @pytest.mark.asyncio
    async def test_poll_run_status(self):
         with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client
            
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"status": "RUNNING"}
            mock_client.get.return_value = mock_resp
            
            res = await poll_run_status("123")
            assert res["status"] == "RUNNING"
