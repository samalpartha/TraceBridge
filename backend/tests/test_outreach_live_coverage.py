
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.agents.outreach_agent import run_tinyfish_outreach, run_tinyfish_outreach_stream
from app.api.live_feed import get_live_feed, get_external_data_stats, trigger_ingestion, get_fbi_missing, get_fbi_kidnappings
from app.models.match import MatchCandidate, SourceRecord

class TestOutreachAgent:
    @pytest.mark.asyncio
    async def test_run_tinyfish_outreach(self):
        with patch("app.agents.outreach_agent.run_sync_automation") as mock_run:
            mock_run.return_value = {"status": "COMPLETED", "result": {}, "run_id": "123"}
            
            match = MatchCandidate(id="123", evidence={"person_name": "John"})
            res = await run_tinyfish_outreach(match)
            
            assert res["status"] == "COMPLETED"
            assert res["run_id"] == "123"

    @pytest.mark.asyncio
    async def test_run_tinyfish_outreach_error(self):
         with patch("app.agents.outreach_agent.run_sync_automation") as mock_run:
            mock_run.side_effect = Exception("Error")
            
            match = MatchCandidate(id="123", evidence={"person_name": "John"})
            res = await run_tinyfish_outreach(match)
            
            assert res["status"] == "FAILED"
            assert "Error" in res["error"]

    @pytest.mark.asyncio
    async def test_run_tinyfish_outreach_stream(self):
        with patch("app.agents.outreach_agent.run_sse_automation") as mock_run:
            async def async_gen(*args, **kwargs):
                yield {"type": "STREAMING_URL", "streamingUrl": "http://stream"}
                yield {"type": "PROGRESS", "purpose": "Working..."}
                yield {"type": "COMPLETE", "status": "COMPLETED", "resultJson": {}, "runId": "123"}
            
            mock_run.side_effect = async_gen
            
            match = MatchCandidate(id="123", evidence={"person_name": "John"}, fused_score=0.9)
            events = []
            async for event in run_tinyfish_outreach_stream(match):
                events.append(event)
            
            assert len(events) == 4 # STARTED, URL, PROGRESS, COMPLETE
            assert events[0]["type"] == "OUTREACH_STARTED"
            assert events[3]["type"] == "OUTREACH_COMPLETE"


class TestLiveFeed:
    @pytest.mark.asyncio
    async def test_get_live_feed(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [
            SourceRecord(id="123", source_type="fbi", person_name="John")
        ]
        # First call is count (scalar), second is query (scalars)
        # But wait, db.execute returns a Result object.
        # mock_db.execute.return_value.scalar.return_value = 10 (for count)
        # mock_db.execute.return_value.scalars.return_value.all.return_value = [...] (for query)
        
        # We need to distinguish between the two calls or make the mock flexible.
        # Side effect for execute?
        
        mock_count_res = MagicMock()
        mock_count_res.scalar.return_value = 10
        
        mock_query_res = MagicMock()
        mock_query_res.scalars.return_value.all.return_value = [
            SourceRecord(id="123", source_type="fbi", person_name="John", scanned_at=None, created_at=None)
        ]
        
        mock_db.execute.side_effect = [mock_count_res, mock_query_res]

        res = await get_live_feed(page=1, page_size=10, source_type="fbi", db=mock_db)
        
        assert res["total"] == 10
        assert len(res["items"]) == 1
        assert res["items"][0]["person_name"] == "John"

    @pytest.mark.asyncio
    async def test_get_external_data_stats(self):
        mock_db = AsyncMock()
        
        # db.execute is called 5 times.
        # 1. type_counts -> .all() returning list of (type, count)
        # 2. geo_records -> .scalar()
        # 3. photo_records -> .scalar()
        # 4. latest_scan -> .scalar()
        # 5. geo_events_total -> .scalar()
        
        mock_res1 = MagicMock()
        mock_res1.all.return_value = [("fbi_missing", 5), ("iom_migrants", 3)]
        
        mock_res2 = MagicMock() # geo
        mock_res2.scalar.return_value = 2
        
        mock_res3 = MagicMock() # photo
        mock_res3.scalar.return_value = 4
        
        mock_res4 = MagicMock() # time
        mock_res4.scalar.return_value = None
        
        mock_res5 = MagicMock() # events
        mock_res5.scalar.return_value = 1
        
        mock_db.execute.side_effect = [mock_res1, mock_res2, mock_res3, mock_res4, mock_res5]
        
        res = await get_external_data_stats(db=mock_db)
        
        assert res["total_records"] == 8
        assert res["geo_records"] == 2

    @pytest.mark.asyncio
    async def test_trigger_ingestion(self):
         # Mock loop.run_in_executor
         # The function _run_sync_ingest is defined inside trigger_ingestion.
         # We can patch asyncio.get_event_loop().run_in_executor to execute the function immediately?
         # Or just mock the return value of run_in_executor.
         
         with patch("asyncio.get_event_loop") as mock_loop:
             mock_loop.return_value.run_in_executor = AsyncMock(return_value={"fbi": "success"})
             
             res = await trigger_ingestion(sources="fbi")
             assert res["status"] == "completed"
             assert res["results"]["fbi"] == "success"

    @pytest.mark.asyncio
    async def test_get_fbi_missing(self):
        with patch("app.api.live_feed.fetch_fbi_missing_persons") as mock_fetch:
            mock_fetch.return_value = {"items": []}
            res = await get_fbi_missing(page=1)
            assert res["items"] == []

    @pytest.mark.asyncio
    async def test_get_fbi_kidnappings(self):
        with patch("app.api.live_feed.fetch_fbi_kidnappings") as mock_fetch:
            mock_fetch.return_value = {"items": []}
            res = await get_fbi_kidnappings(page=1)
            assert res["items"] == []
