
import pytest
from app.agents.geo_agent import (
    haversine_distance,
    location_plausibility_score,
    predict_movement_corridor,
    run_geo_analysis
)

class TestGeoAgent:
    def test_haversine_distance(self):
        # NY to London
        # NY: 40.7128, -74.0060
        # London: 51.5074, -0.1278
        dist = haversine_distance(40.7128, -74.0060, 51.5074, -0.1278)
        assert 5500 < dist < 5600 

        # Same point
        dist = haversine_distance(0, 0, 0, 0)
        assert dist == 0

    def test_location_plausibility_score(self):
        # Same location
        score = location_plausibility_score(40, -74, 40, -74)
        assert score == 1.0

        # Far location
        score = location_plausibility_score(40, -74, 40, 100)
        assert score == 0.0

        # Missing data
        score = location_plausibility_score(None, None, 40, -74)
        assert score == 0.5

    def test_predict_movement_corridor(self):
        origin_lat = 40.0
        origin_lng = -74.0
        sightings = [
            {"lat": 41.0, "lng": -74.0}, # North
            {"lat": 42.0, "lng": -74.0}  # Further North
        ]
        
        result = predict_movement_corridor(origin_lat, origin_lng, sightings)
        assert result["direction"] == "N"
        assert result["avg_distance_km"] > 0
        assert result["predicted_zone"] is not None

    def test_predict_movement_corridor_empty(self):
        result = predict_movement_corridor(0, 0, [])
        assert result["direction"] == "unknown"

    @pytest.mark.asyncio
    async def test_run_geo_analysis(self):
        candidates = [
            {"id": "1", "location_lat": 40.0, "location_lng": -74.0},
            {"id": "2", "location_lat": 41.0, "location_lng": -74.0},
        ]
        
        # Test with case location
        result = await run_geo_analysis(40.0, -74.0, candidates)
        assert result["status"] == "completed"
        assert len(result["candidates"]) == 2
        assert result["candidates"][0]["geo_score"] == 1.0
        assert result["candidates"][0]["distance_km"] == 0.0
        assert result["movement_prediction"] is not None

        # Test without case location
        result = await run_geo_analysis(None, None, candidates)
        assert result["status"] == "completed"
        assert result["movement_prediction"] is None
