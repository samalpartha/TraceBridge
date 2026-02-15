"""
Unit tests for backend services — scoring, text matching, fallback logic, JWT.
Pure function tests — NO database or network required.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set required env vars before importing app modules
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("DATABASE_URL_SYNC", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("BACKEND_CORS_ORIGINS", "http://localhost:3005")

import pytest

from app.api.legacy_intel import _text_score, LEGACY_RECORDS
from app.api.namus_adapter import _namus_score, NAMUS_PUBLIC_RECORDS
from app.api.tinyfish_actions import _fallback_escalation, _fallback_evidence_cards
from app.api.auth import create_access_token
import jwt


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  LEGACY INTEL SCORING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestLegacyTextScore:
    def test_empty_query(self):
        result = _text_score("", LEGACY_RECORDS[0])
        assert result["score"] == 0
        assert result["matched_descriptors"] == []

    def test_short_words_ignored(self):
        result = _text_score("a to is", LEGACY_RECORDS[0])
        assert result["score"] == 0

    def test_exact_descriptor_match(self):
        result = _text_score("scar rose tattoo", LEGACY_RECORDS[0])
        assert result["score"] > 0.5
        assert len(result["matched_descriptors"]) > 0

    def test_region_match(self):
        result = _text_score("Gulf Coast Texas", LEGACY_RECORDS[0])
        assert result["score"] > 0

    def test_narrative_relevance(self):
        result = _text_score("hurricane evacuation highway", LEGACY_RECORDS[0])
        assert result["narrative_relevance"] > 0

    def test_no_match(self):
        result = _text_score("submarine quantum computer", LEGACY_RECORDS[0])
        assert result["score"] == 0

    def test_score_bounded(self):
        result = _text_score(
            "scar rose tattoo denim jacket forearm brown short male hurricane highway",
            LEGACY_RECORDS[0],
        )
        assert result["score"] <= 1.0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  NAMUS SCORING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestNamusScore:
    def test_empty_query(self):
        result = _namus_score("", NAMUS_PUBLIC_RECORDS[0])
        assert result["score"] == 0

    def test_name_match(self):
        result = _namus_score("Alejandro Reyes Houston", NAMUS_PUBLIC_RECORDS[0])
        assert result["score"] > 0.3

    def test_clothing_match(self):
        result = _namus_score("blue work uniform silver watch", NAMUS_PUBLIC_RECORDS[0])
        assert result["score"] > 0.3
        assert "clothing_jewelry" in result["matched_fields"]

    def test_biometrics_boost(self):
        score_with_bio = _namus_score("male Houston", NAMUS_PUBLIC_RECORDS[0])
        score_less_bio = _namus_score("female Laredo", NAMUS_PUBLIC_RECORDS[4])
        assert score_with_bio["biometrics_boost"] > score_less_bio["biometrics_boost"]

    def test_score_bounded(self):
        result = _namus_score(
            "Alejandro Reyes Houston Male Hispanic compass tattoo scar surgery silver watch",
            NAMUS_PUBLIC_RECORDS[0],
        )
        assert result["score"] <= 1.0

    def test_no_match(self):
        result = _namus_score("zeppelin cryptography nebula", NAMUS_PUBLIC_RECORDS[0])
        assert result["score"] <= 0.15


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  JWT TOKEN CREATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestJWTCreation:
    def test_creates_valid_token(self):
        from app.config import settings
        token = create_access_token({"sub": "user-1", "role": "caseworker"})
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        assert decoded["sub"] == "user-1"
        assert decoded["role"] == "caseworker"
        assert "exp" in decoded

    def test_different_users_get_different_tokens(self):
        t1 = create_access_token({"sub": "user-1"})
        t2 = create_access_token({"sub": "user-2"})
        assert t1 != t2


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  TINYFISH FALLBACK LOGIC
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestFallbackEscalation:
    def test_structure(self):
        class FakeCase:
            person_name = "Alice"
            age = 28
            status = "open"
            last_known_location = "NYC"
            last_known_lat = 40.71
            last_known_lng = -74.01
            description = "Test"
            id = "fake-id"

        class FakeReq:
            case_id = "c1"
            sla_hours = 48.0
            breach_reason = "SLA exceeded"

        result = _fallback_escalation(FakeCase(), FakeReq())
        assert "alert_message" in result
        assert "Alice" in result["alert_message"]
        assert len(result["action_list"]) == 5
        assert isinstance(result["follow_up_interval_hours"], int)


class TestFallbackEvidenceCards:
    def test_empty_matches(self):
        result = _fallback_evidence_cards([])
        assert result == []

    def test_high_score_match(self):
        class FakeMatch:
            id = "fake-match-id"
            fused_score = 0.85
            vision_score = 0.9
            rag_score = 0.8
            geo_score = 0.7
            status = "pending"

        cards = _fallback_evidence_cards([FakeMatch()])
        assert len(cards) == 1
        assert cards[0]["confidence"] == "high"
        assert cards[0]["recommendation"] == "confirm"
        assert len(cards[0]["evidence"]) == 3

    def test_low_score_match(self):
        class FakeMatch:
            id = "fake-low"
            fused_score = 0.2
            vision_score = 0.1
            rag_score = 0.15
            geo_score = 0.0
            status = "pending"

        cards = _fallback_evidence_cards([FakeMatch()])
        assert cards[0]["confidence"] == "low"
        assert cards[0]["recommendation"] == "reject"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  DATA RECORD INTEGRITY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestLegacyRecordIntegrity:
    def test_all_records_have_required_fields(self):
        required = {"id", "name", "gender", "narrative", "region", "year", "status", "source", "lat", "lng"}
        for r in LEGACY_RECORDS:
            missing = required - set(r.keys())
            assert missing == set(), f"Record {r['id']} missing: {missing}"

    def test_unique_ids(self):
        ids = [r["id"] for r in LEGACY_RECORDS]
        assert len(ids) == len(set(ids))

    def test_valid_coordinates(self):
        for r in LEGACY_RECORDS:
            assert -90 <= r["lat"] <= 90
            assert -180 <= r["lng"] <= 180


class TestNamusRecordIntegrity:
    def test_all_records_have_required_fields(self):
        required = {"namus_id", "case_type", "name", "gender", "state", "lat", "lng", "provenance", "status"}
        for r in NAMUS_PUBLIC_RECORDS:
            missing = required - set(r.keys())
            assert missing == set(), f"Record {r['namus_id']} missing: {missing}"

    def test_unique_ids(self):
        ids = [r["namus_id"] for r in NAMUS_PUBLIC_RECORDS]
        assert len(ids) == len(set(ids))

    def test_provenance_structure(self):
        for r in NAMUS_PUBLIC_RECORDS:
            prov = r["provenance"]
            assert "authority" in prov
            assert prov["data_tier"] == "public"

    def test_biometrics_structure(self):
        for r in NAMUS_PUBLIC_RECORDS:
            bio = r.get("biometrics_available", {})
            for key in ["dna", "dental", "fingerprints"]:
                assert key in bio
                assert isinstance(bio[key], bool)
