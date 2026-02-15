
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from app.api.geo import get_heatmap_data, geocode_address, get_geo_events
from app.api.identity_graph import get_identity_graph, graph_summary
from app.models.case import Case, MediaAsset
from app.models.match import MatchCandidate, SourceRecord
from app.models.geo import GeoEvent

class TestGeoGraphCoverage:

    @pytest.fixture
    def mock_db(self):
        return AsyncMock()

    # --- Geo API Tests ---
    @pytest.mark.asyncio
    async def test_get_heatmap_data(self, mock_db):
        # Mock sightings result
        mock_sr = MagicMock()
        mock_sr.location_lat = 10.0
        mock_sr.location_lng = 20.0
        mock_sr.source_type = "FBI"
        mock_sr.weight = 1
        
        mock_res1 = MagicMock()
        mock_res1.all.return_value = [mock_sr]
        
        # Mock cases result
        mock_case = MagicMock()
        mock_case.last_known_lat = 15.0
        mock_case.last_known_lng = 25.0
        mock_case.person_name = "Jane"
        mock_case.status = "open"
        
        mock_res2 = MagicMock()
        mock_res2.all.return_value = [mock_case]
        
        mock_db.execute.side_effect = [mock_res1, mock_res2]
        
        response = await get_heatmap_data(mock_db)
        assert len(response["sightings"]) == 1
        assert len(response["cases"]) == 1

    @pytest.mark.asyncio
    async def test_geocode_address_success(self):
        with patch("app.api.geo.httpx.AsyncClient") as mock_client:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "status": "OK",
                "results": [
                    {
                        "formatted_address": "123 Main St",
                        "geometry": {
                            "location": {"lat": 10.0, "lng": 20.0}
                        },
                        "place_id": "pid",
                        "types": ["street_address"]
                    }
                ]
            }
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_resp
            
            with patch("app.api.geo.settings") as mock_settings:
                mock_settings.GOOGLE_API_KEY = "test_key"
                response = await geocode_address("123 Main St")
                assert response["status"] == "OK"
                assert len(response["results"]) == 1
                assert response["results"][0]["lat"] == 10.0

    @pytest.mark.asyncio
    async def test_get_geo_events(self, mock_db):
        mock_event = MagicMock(spec=GeoEvent)
        mock_event.id = "12345678-1234-5678-1234-567812345678"
        mock_event.case_id = "12345678-1234-5678-1234-567812345678"
        mock_event.event_type = "sighting"
        mock_event.lat = 10.0
        mock_event.lng = 20.0
        mock_event.description = "Test"
        mock_event.metadata_json = {}
        mock_event.created_at = MagicMock()
        mock_event.created_at.isoformat.return_value = "2023-01-01"

        mock_res = MagicMock()
        mock_res.scalars.return_value.all.return_value = [mock_event]
        mock_db.execute.return_value = mock_res
        
        response = await get_geo_events(case_id="12345678-1234-5678-1234-567812345678", db=mock_db)
        assert len(response) == 1
        assert response[0]["event_type"] == "sighting"


    # --- Identity Graph API Tests ---
    @pytest.mark.asyncio
    async def test_get_identity_graph(self, mock_db):
        # Mock Cases
        case1 = MagicMock(spec=Case)
        case1.id = "c1"
        case1.person_name = "P1"
        case1.status = "open"
        case1.age = 20
        case1.gender = "male"
        case1.description = "Blue jacket"
        case1.media_assets = [MagicMock(file_path="/p1.jpg")]
        case1.last_known_location = "Loc1"
        case1.last_known_lat = 10.0
        case1.last_known_lng = 10.0
        
        # Mock Sources
        src1 = MagicMock(spec=SourceRecord)
        src1.id = "s1"
        src1.source_type = "FBI"
        src1.person_name = "S1"
        src1.location_name = "Loc2"
        src1.geo_lat = 10.1
        src1.geo_lng = 10.1
        
        # Mock Matches
        match1 = MagicMock(spec=MatchCandidate)
        match1.case_id = "c1"
        match1.source_record_id = "s1"
        match1.fused_score = 0.9
        match1.vision_score = 0.9
        match1.rag_score = 0.9
        match1.geo_score = 0.9
        match1.status = "pending"
        
        # If identity_graph.py uses async db.execute(select(...))
        # We need to mock execute calls.
        # But if it uses db.query(...), we need to check that.
        # Assuming we fix it to use select(), we mock execute.
        
        mock_res_cases = MagicMock()
        mock_res_cases.scalars.return_value.all.return_value = [case1]
        
        mock_res_sources = MagicMock()
        mock_res_sources.scalars.return_value.all.return_value = [src1]
        
        mock_res_matches = MagicMock()
        mock_res_matches.scalars.return_value.all.return_value = [match1]

        mock_db.execute.side_effect = [mock_res_cases, mock_res_sources, mock_res_matches, MagicMock()] # + counts for summary if needed? No, separate endpoint.
        
        # Actually in the current code it uses db.query().all().
        # Since I am passing an AsyncMock, db.query will be a mock call.
        # If I want to verify the failure or fix it, I should probably mock execute.
        # Let's write the test assuming valid async code, using execute mocking above.
        
        try:
            response = await get_identity_graph(mock_db)
            assert len(response["nodes"]) > 0
            assert len(response["edges"]) > 0
        except AttributeError:
             # This will happen if code uses db.query on Mock object that doesn't behave like sync session
             # or if it fails awaiting a non-awaitable.
             pytest.fail("Identity graph endpoint likely failed due to sync/async mismatch")

    @pytest.mark.asyncio
    async def test_graph_summary(self, mock_db):
        mock_result = MagicMock()
        mock_result.scalar.side_effect = [10, 20, 5]
        mock_db.execute.return_value = mock_result
        
        response = await graph_summary(mock_db)
        assert response["person_nodes"] == 10
        assert response["sighting_nodes"] == 20
        assert response["match_edges"] == 5
