
import pytest
from unittest.mock import MagicMock, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.vector_search import search_by_face_embedding, search_by_text_embedding

class TestVectorSearch:
    @pytest.mark.asyncio
    async def test_search_by_face_embedding(self):
        mock_db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        
        # Mock row data
        mock_row = MagicMock()
        mock_row.id = "123"
        mock_row.person_name = "Test Person"
        mock_row.description = "Test Description"
        mock_row.photo_url = "http://example.com/photo.jpg"
        mock_row.location_name = "New York"
        mock_row.location_lat = 40.7128
        mock_row.location_lng = -74.0060
        mock_row.source_type = "image"
        mock_row.source_url = "http://example.com"
        mock_row.similarity = 0.95

        mock_result.fetchall.return_value = [mock_row]
        mock_db.execute.return_value = mock_result

        results = await search_by_face_embedding(mock_db, [0.1]*128)
        
        assert len(results) == 1
        assert results[0]["person_name"] == "Test Person"
        assert results[0]["similarity"] == 0.95

    @pytest.mark.asyncio
    async def test_search_by_text_embedding(self):
        mock_db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        
        # Mock row data
        mock_row = MagicMock()
        mock_row.id = "456"
        mock_row.person_name = "Text Person"
        mock_row.description = "Text Description"
        mock_row.photo_url = "http://example.com/text.jpg"
        mock_row.location_name = "London"
        mock_row.location_lat = 51.5074
        mock_row.location_lng = -0.1278
        mock_row.source_type = "text"
        mock_row.source_url = "http://example.com/text"
        mock_row.similarity = 0.85

        mock_result.fetchall.return_value = [mock_row]
        mock_db.execute.return_value = mock_result

        results = await search_by_text_embedding(mock_db, [0.1]*128)
        
        assert len(results) == 1
        assert results[0]["person_name"] == "Text Person"
        assert results[0]["similarity"] == 0.85

    @pytest.mark.asyncio
    async def test_search_by_face_embedding_empty(self):
        mock_db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.fetchall.return_value = []
        mock_db.execute.return_value = mock_result

        results = await search_by_face_embedding(mock_db, [0.1]*128)
        assert len(results) == 0    
