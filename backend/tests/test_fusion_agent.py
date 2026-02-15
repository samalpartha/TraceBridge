
import pytest
from app.agents.fusion_agent import fuse_scores, build_evidence

class TestFusionAgent:
    def test_fuse_scores_empty(self):
        results = fuse_scores([], [], [])
        assert results == []

    def test_fuse_scores_single_vision(self):
        vision = [{"source_record_id": "1", "vision_score": 0.9, "person_name": "Test"}]
        results = fuse_scores(vision, [], [])
        assert len(results) == 1
        assert results[0]["vision_score"] == 0.9
        assert results[0]["rag_score"] == 0.0
        assert results[0]["geo_score"] == 0.5  # Default
        assert results[0]["fused_score"] > 0

    def test_fuse_scores_agreement(self):
        vision = [{"source_record_id": "1", "vision_score": 0.9}]
        rag = [{"source_record_id": "1", "rag_score": 0.8}]
        geo = [{"source_record_id": "1", "geo_score": 0.7}]

        results = fuse_scores(vision, rag, geo)
        assert len(results) == 1
        res = results[0]
        assert res["vision_score"] == 0.9
        assert res["rag_score"] == 0.8
        assert res["geo_score"] == 0.7
        assert res["modalities_agreeing"] == 3
        assert res["passes_threshold"] is True

    def test_fuse_scores_disagreement(self):
        vision = [{"source_record_id": "1", "vision_score": 0.05}]
        rag = [{"source_record_id": "1", "rag_score": 0.05}]
        geo = [{"source_record_id": "1", "geo_score": 0.05}]

        results = fuse_scores(vision, rag, geo)
        assert len(results) == 1
        assert results[0]["passes_threshold"] is False

    def test_build_evidence(self):
        candidate = {
            "person_name": "John",
            "vision_score": 0.8,
            "rag_score": 0.2,
            "geo_score": 0.9,
            "fused_score": 0.75,
            "modalities_agreeing": 2
        }
        evidence = build_evidence(candidate)
        assert evidence["person_name"] == "John"
        assert evidence["vision_evidence"]["score"] == 0.8
        assert "Strong" in evidence["vision_evidence"]["description"]
        assert evidence["confidence_level"] == "high"
