
import pytest
import os
import uuid
from unittest.mock import MagicMock, AsyncMock, patch, mock_open
from app.services.data_ingest import (
    fetch_fbi_missing_persons,
    fetch_fbi_kidnappings,
    ingest_fbi_data,
    ingest_iom_csv,
    run_full_ingestion,
    _fbi_item_to_source_record,
    parse_iom_coordinates
)
from app.models.match import SourceRecord
from app.models.geo import GeoEvent

class TestDataIngest:

    # --- FBI API Tests ---
    @pytest.mark.asyncio
    @patch("httpx.AsyncClient")
    async def test_fetch_fbi_missing_persons(self, mock_client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"items": [], "total": 0}
        mock_resp.raise_for_status.return_value = None
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_resp
        mock_client_instance.__aenter__.return_value = mock_client_instance
        mock_client.return_value = mock_client_instance

        data = await fetch_fbi_missing_persons(page=1)
        assert data == {"items": [], "total": 0}
        mock_client_instance.get.assert_called_once()

    @pytest.mark.asyncio
    @patch("httpx.AsyncClient")
    async def test_fetch_fbi_kidnappings(self, mock_client):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"items": [], "total": 0}
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_resp
        mock_client_instance.__aenter__.return_value = mock_client_instance
        mock_client.return_value = mock_client_instance

        data = await fetch_fbi_kidnappings(page=1)
        assert data == {"items": [], "total": 0}

    def test_fbi_item_to_source_record(self):
        item = {
            "title": "Jane Doe",
            "description": "Description",
            "details": "<p>Details</p>",
            "images": [{"original": "http://image.jpg"}],
            "field_offices": ["office"],
            "coordinates": [40.0, -70.0],
            "subjects": ["Kidnapping"],
            "url": "http://fbi.gov/jane",
            "uid": "123",
            "age_min": 20,
            "age_max": 30,
            "sex": "Female"
        }
        record = _fbi_item_to_source_record(item)
        assert record["person_name"] == "Jane Doe"
        assert record["source_type"] == "fbi_kidnapping"
        assert record["location_lat"] == 40.0
        assert record["location_lng"] == -70.0
        assert "Details" in record["description"]

    @pytest.mark.asyncio
    @patch("app.services.data_ingest.fetch_fbi_missing_persons")
    @patch("app.services.data_ingest.fetch_fbi_kidnappings")
    async def test_ingest_fbi_data(self, mock_kidnap, mock_missing):
        # Mock API responses
        mock_missing.return_value = {
            "items": [{
                "title": "Missing Person",
                "url": "http://missing",
                "coordinates": [10.0, 20.0]
            }],
            "total": 1
        }
        mock_kidnap.return_value = {"items": [], "total": 0}

        mock_db = MagicMock()
        # Mock existing check to return None (new record)
        mock_db.execute.return_value.scalars.return_value.first.return_value = None

        stats = await ingest_fbi_data(mock_db)
        
        assert stats["fbi_missing_new"] == 1
        assert stats["geo_events_created"] == 1
        assert mock_db.add.call_count == 2 # 1 SourceRecord + 1 GeoEvent
        mock_db.commit.assert_called_once()

    # --- IOM CSV Tests ---
    def test_parse_iom_coordinates(self):
        assert parse_iom_coordinates("10.5, -20.5") == (10.5, -20.5)
        assert parse_iom_coordinates("invalid") == (None, None)
        assert parse_iom_coordinates(None) == (None, None)

    @patch("os.path.exists")
    @patch("builtins.open", new_callable=mock_open, read_data='Incident ID,Coordinates,Number of Dead\n1,"10.0, 20.0",5')
    def test_ingest_iom_csv(self, mock_file, mock_exists):
        mock_exists.return_value = True
        mock_db = MagicMock()
        # Mock existing check
        mock_db.execute.return_value.scalars.return_value.first.return_value = None
        
        stats = ingest_iom_csv(mock_db, "dummy.csv")
        
        assert stats["records_created"] == 1
        assert stats["geo_events_created"] == 1
        mock_db.add.call_count == 2

    # --- Full Ingestion Tests ---
    @pytest.mark.asyncio
    @patch("app.services.data_ingest.ingest_fbi_data")
    @patch("app.services.data_ingest.ingest_iom_csv")
    async def test_run_full_ingestion(self, mock_iom, mock_fbi):
        mock_db = MagicMock()
        mock_fbi.return_value = {"status": "ok"}
        mock_iom.return_value = {"status": "ok"}
        
        # Test with IOM path
        with patch("os.path.exists", return_value=True):
            results = await run_full_ingestion(mock_db, "iom.csv")
            assert "fbi" in results
            assert "iom" in results
