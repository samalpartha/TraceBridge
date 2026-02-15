
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from app.agents.orchestrator import run_search_pipeline, run_search_pipeline_streaming
from app.models.case import Case

class TestOrchestrator:
    @pytest.mark.asyncio
    @patch("app.agents.orchestrator.run_intake")
    @patch("app.agents.orchestrator.run_vision_search")
    @patch("app.agents.orchestrator.run_rag_search")
    @patch("app.agents.orchestrator.run_geo_analysis")
    @patch("app.agents.orchestrator.fuse_scores")
    @patch("app.agents.orchestrator.analyze_match")
    async def test_run_search_pipeline_success(
        self, mock_analyze, mock_fuse, mock_geo, mock_rag, mock_vision, mock_intake
    ):
        # Mock dependencies
        mock_intake.return_value = {
            "status": "completed",
            "person_name": "Test",
            "face_embedding": [0.1]*512,
            "text_embedding": [0.1]*768,
            "description": "Test Desc",
            "age": 25,
            "gender": "M",
            "last_known_location": "NY",
            "last_known_lat": 40.0,
            "last_known_lng": -74.0
        }
        
        mock_vision.return_value = {
            "status": "completed",
            "candidates": [{"source_record_id": "12345678-1234-5678-1234-567812345678", "vision_score": 0.9}]
        }
        mock_rag.return_value = {
            "status": "completed",
            "candidates": [{"source_record_id": "12345678-1234-5678-1234-567812345678", "rag_score": 0.8}]
        }
        mock_geo.return_value = {
            "status": "completed",
            "candidates": [{"source_record_id": "12345678-1234-5678-1234-567812345678", "geo_score": 0.7}]
        }
        
        mock_fuse.return_value = [{
            "source_record_id": "12345678-1234-5678-1234-567812345678",
            "fused_score": 0.85,
            "passes_threshold": True,
            "modalities_agreeing": 3,
            "person_name": "Match"
        }]

        mock_analyze.return_value = "AI Explanation"

        # Mock DB
        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_case_result = MagicMock()
        mock_case_result.scalar_one_or_none.return_value = MagicMock(spec=Case)
        mock_db.execute.return_value = mock_case_result

        result = await run_search_pipeline("12345678-1234-5678-1234-567812345678", mock_db)

        # Asserts
        assert result["status"] == "completed"
        assert len(result["matches"]) == 1
        assert result["matches"][0]["person_name"] == "Match"
        
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()


    @pytest.mark.asyncio
    @patch("app.agents.orchestrator.run_intake")
    async def test_run_search_pipeline_intake_error(self, mock_intake):
        mock_intake.return_value = {"status": "error", "message": "Failed"}
        mock_db = AsyncMock()
        
        result = await run_search_pipeline("12345678-1234-5678-1234-567812345678", mock_db)
        assert result["status"] == "error"
        assert result["message"] == "Failed"

    @pytest.mark.asyncio
    @patch("app.agents.orchestrator.AsyncSessionLocal")
    @patch("app.agents.orchestrator.run_intake")
    @patch("app.agents.orchestrator.run_vision_search")
    @patch("app.agents.orchestrator.run_rag_search")
    @patch("app.agents.orchestrator.run_geo_analysis")
    @patch("app.agents.orchestrator.fuse_scores")
    async def test_run_search_pipeline_streaming(
        self, mock_fuse, mock_geo, mock_rag, mock_vision, mock_intake, mock_session_cls
    ):
         # Mock dependencies
        mock_intake.return_value = {
            "status": "completed",
            "person_name": "Test"
        }
        mock_vision.return_value = {"status": "completed", "candidates": []}
        mock_rag.return_value = {"status": "completed", "candidates": []}
        mock_geo.return_value = {"status": "completed", "movement_prediction": None}
        mock_fuse.return_value = []
        
        mock_db = AsyncMock()
        mock_db.add = MagicMock() # .add is synchronous
        mock_case_result = MagicMock()
        mock_case_result.scalar_one_or_none.return_value = MagicMock(spec=Case)
        mock_db.execute.return_value = mock_case_result
        
        mock_session_cls.return_value.__aenter__.return_value = mock_db
        
        events = []
        async for event in run_search_pipeline_streaming("12345678-1234-5678-1234-567812345678"):
            events.append(event)
            
        assert len(events) > 0
        assert events[0]["type"] == "PIPELINE_STARTED"
        assert events[-1]["type"] == "PIPELINE_COMPLETE"
