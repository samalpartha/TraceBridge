
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from app.agents.intake_agent import run_intake
from app.agents.vision_agent import run_vision_search
from app.agents.rag_agent import run_rag_search
from app.models.case import Case, MediaAsset

class TestAgentsCoverage:
    
    # --- Intake Agent Tests ---
    @pytest.mark.asyncio
    @patch("app.agents.intake_agent.generate_text_embedding")
    @patch("app.agents.intake_agent.generate_face_embedding")
    async def test_run_intake_success(self, mock_face_emb, mock_text_emb):
        mock_db = AsyncMock()
        
        # Mock Case query result
        mock_case = MagicMock(spec=Case)
        mock_case.id = "12345678-1234-5678-1234-567812345678"
        mock_case.person_name = "John Doe"
        mock_case.description = "Missing person"
        mock_case.age = 30
        mock_case.gender = "Male"
        mock_case.last_known_location = "NY"
        mock_case.last_known_lat = 40.0
        mock_case.last_known_lng = -74.0
        
        mock_result_case = MagicMock()
        mock_result_case.scalar_one_or_none.return_value = mock_case
        
        # Mock MediaAsset query result
        mock_asset = MagicMock(spec=MediaAsset)
        mock_asset.media_type = "photo"
        mock_asset.face_embedding = None
        mock_asset.file_path = "photo.jpg"
        
        mock_result_media = MagicMock()
        mock_result_media.scalars.return_value.all.return_value = [mock_asset]
        
        # Configure db.execute side effects for sequential calls
        mock_db.execute.side_effect = [mock_result_case, mock_result_media]
        
        # Mock embeddings
        mock_text_emb.return_value = MagicMock(tolist=lambda: [0.1]*768)
        mock_face_emb.return_value = MagicMock(tolist=lambda: [0.2]*512)
        
        result = await run_intake("12345678-1234-5678-1234-567812345678", mock_db)
        
        assert result["person_name"] == "John Doe"
        assert result["has_photo"] is True
        assert result["text_embedding"] == [0.1]*768
        assert result["face_embedding"] == [0.2]*512
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_intake_case_not_found(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        result = await run_intake("12345678-1234-5678-1234-567812345678", mock_db)
        assert result["status"] == "error"
        assert result["message"] == "Case not found"

    # --- Vision Agent Tests ---
    @pytest.mark.asyncio
    async def test_run_vision_search_skipped(self):
        mock_db = AsyncMock()
        result = await run_vision_search(None, mock_db)
        assert result["status"] == "skipped"

    @pytest.mark.asyncio
    @patch("app.agents.vision_agent.search_by_face_embedding")
    async def test_run_vision_search_success(self, mock_search):
        mock_db = AsyncMock()
        mock_search.return_value = [{
            "id": "1", "person_name": "Match", "description": "Desc",
            "photo_url": "url", "location_name": "Loc", "location_lat": 0,
            "location_lng": 0, "source_type": "img", "similarity": 0.9
        }]
        
        result = await run_vision_search([0.1]*512, mock_db)
        assert result["status"] == "completed"
        assert result["candidates_found"] == 1
        assert result["candidates"][0]["vision_score"] == 0.9

    # --- RAG Agent Tests ---
    @pytest.mark.asyncio
    async def test_run_rag_search_skipped(self):
        result = await run_rag_search("Name", "Desc", None)
        assert result["status"] == "skipped"

    @pytest.mark.asyncio
    @patch("app.agents.rag_agent.hybrid_search")
    async def test_run_rag_search_hybrid_success(self, mock_hybrid):
        mock_db = AsyncMock()
        mock_hybrid.return_value = [{
            "id": "1", "person_name": "Match", "description": "Desc",
            "photo_url": "url", "location_name": "Loc", "location_lat": 0,
            "location_lng": 0, "source_type": "txt", "age": 30, "gender": "M",
            "rrf_score": 0.8, "vec_score": 0.7, "text_score": 0.9
        }]
        
        result = await run_rag_search("Name", "Desc", [0.1]*768, db=mock_db)
        assert result["status"] == "completed"
        assert result["search_type"] == "hybrid_rrf"
        assert result["candidates_found"] == 1
        assert result["candidates"][0]["rag_score"] == 0.8

    @pytest.mark.asyncio
    @patch("app.agents.rag_agent.hybrid_search")
    @patch("app.agents.rag_agent.search_by_text_embedding")
    async def test_run_rag_search_fallback(self, mock_vec_search, mock_hybrid):
        mock_db = AsyncMock()
        # Simulate hybrid search failure
        mock_hybrid.side_effect = Exception("Search failed")
        
        mock_vec_search.return_value = [{
            "id": "1", "person_name": "Match", "description": "Desc",
            "photo_url": "url", "location_name": "Loc", "location_lat": 0,
            "location_lng": 0, "source_type": "txt", "similarity": 0.7
        }]
        
        result = await run_rag_search("Name", "Desc", [0.1]*768, db=mock_db)
        assert result["status"] == "completed"
        assert result["search_type"] == "vector_only"
        assert result["candidates_found"] == 1
        assert result["candidates"][0]["rag_score"] == 0.7
