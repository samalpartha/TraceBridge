"""
Schema validation tests — pure Pydantic, NO database dependency.
Ensures every schema serializes/deserializes correctly with proper type constraints.
No false positives: tests use exact valid/invalid data.
"""
import pytest
from pydantic import ValidationError

# Only import Pydantic schemas — no app, no database, no FastAPI
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.schemas.case import CaseCreate, CaseResponse, CaseListResponse, MediaAssetResponse
from app.schemas.match import MatchResponse, SourceRecordResponse
from app.schemas.geo import GeoEventResponse, HeatmapPoint
from app.schemas.outreach import OutreachEventResponse


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CASE SCHEMAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestCaseCreate:
    def test_valid_minimal(self):
        obj = CaseCreate(person_name="John Doe")
        assert obj.person_name == "John Doe"
        assert obj.age is None

    def test_valid_full(self):
        obj = CaseCreate(
            person_name="Jane Doe", age=30, gender="Female",
            description="Last seen wearing red jacket",
            last_known_location="NYC", last_known_lat=40.71, last_known_lng=-74.01,
            last_known_date="2026-01-15", contact_info="jane@example.com",
            reporter_id="abc-123",
        )
        assert obj.age == 30
        assert obj.last_known_lat == 40.71

    def test_missing_person_name(self):
        with pytest.raises(ValidationError) as exc_info:
            CaseCreate()
        assert "person_name" in str(exc_info.value)


class TestCaseResponse:
    def test_valid(self):
        obj = CaseResponse(id="uuid-1", person_name="Test", status="open")
        assert obj.id == "uuid-1"
        assert obj.status == "open"
        assert obj.media_assets == []

    def test_with_media(self):
        media = MediaAssetResponse(id="m1", file_path="/uploads/x.jpg", media_type="photo")
        obj = CaseResponse(id="uuid-1", person_name="Test", status="open", media_assets=[media])
        assert len(obj.media_assets) == 1
        assert obj.media_assets[0].file_path == "/uploads/x.jpg"


class TestCaseListResponse:
    def test_valid(self):
        case = CaseResponse(id="1", person_name="A", status="open")
        obj = CaseListResponse(cases=[case], total=1)
        assert obj.total == 1
        assert len(obj.cases) == 1


class TestMediaAssetResponse:
    def test_valid(self):
        obj = MediaAssetResponse(id="m1", file_path="/uploads/img.jpg", media_type="photo")
        assert obj.original_filename is None

    def test_missing_required(self):
        with pytest.raises(ValidationError):
            MediaAssetResponse(id="m1")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  MATCH SCHEMAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestMatchResponse:
    def test_valid(self):
        obj = MatchResponse(id="m1", case_id="c1", status="pending")
        assert obj.fused_score is None

    def test_with_scores(self):
        obj = MatchResponse(
            id="m1", case_id="c1", status="approved",
            vision_score=0.85, rag_score=0.72, geo_score=0.60, fused_score=0.78,
        )
        assert obj.fused_score == 0.78


class TestSourceRecordResponse:
    def test_valid(self):
        obj = SourceRecordResponse(id="sr1", source_type="fbi_missing")
        assert obj.person_name is None

    def test_full(self):
        obj = SourceRecordResponse(
            id="sr1", source_type="fbi_missing", person_name="Test",
            age="25", gender="Male", location_lat=40.71, location_lng=-74.01,
        )
        assert obj.location_lat == 40.71


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GEO SCHEMAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestGeoEventResponse:
    def test_valid(self):
        obj = GeoEventResponse(id="g1", event_type="sighting")
        assert obj.case_id is None

    def test_full(self):
        obj = GeoEventResponse(
            id="g1", event_type="sighting", case_id="c1",
            lat=40.71, lng=-74.01, description="Near park",
        )
        assert obj.lat == 40.71


class TestHeatmapPoint:
    def test_valid(self):
        obj = HeatmapPoint(lat=40.71, lng=-74.01)
        assert obj.weight == 1.0

    def test_custom_weight(self):
        obj = HeatmapPoint(lat=40.71, lng=-74.01, weight=3.5, label="Hotspot")
        assert obj.weight == 3.5

    def test_missing_required(self):
        with pytest.raises(ValidationError):
            HeatmapPoint(lat=40.71)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  OUTREACH SCHEMA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestOutreachEventResponse:
    def test_valid(self):
        obj = OutreachEventResponse(id="o1", match_id="m1", channel="email", status="sent")
        assert obj.tinyfish_run_id is None

    def test_missing_required(self):
        with pytest.raises(ValidationError):
            OutreachEventResponse(id="o1")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  AUTH INLINE SCHEMAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from app.api.auth import RegisterRequest, LoginRequest, TokenResponse

class TestRegisterRequest:
    def test_valid(self):
        obj = RegisterRequest(email="test@example.com", password="secret", full_name="Test User")
        assert obj.role == "family"

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="not-an-email", password="secret", full_name="Test")

    def test_custom_role(self):
        obj = RegisterRequest(email="test@example.com", password="s", full_name="T", role="caseworker")
        assert obj.role == "caseworker"


class TestLoginRequest:
    def test_valid(self):
        obj = LoginRequest(email="test@example.com", password="pass")
        assert obj.email == "test@example.com"

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            LoginRequest(email="bad", password="pass")


class TestTokenResponse:
    def test_valid(self):
        obj = TokenResponse(access_token="abc.def.ghi", user_id="uid-1", role="family")
        assert obj.token_type == "bearer"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  MATCH INLINE SCHEMAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from app.api.matches import VerifyRequest

class TestVerifyRequest:
    def test_valid(self):
        obj = VerifyRequest(action="approve")
        assert obj.caseworker_id is None

    def test_with_notes(self):
        obj = VerifyRequest(action="reject", notes="Low confidence")
        assert obj.notes == "Low confidence"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  AI ANALYSIS INLINE SCHEMA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from app.api.ai_analysis import AnalyzeRequest

class TestAnalyzeRequest:
    def test_defaults(self):
        obj = AnalyzeRequest()
        assert obj.analysis_type == "risk"

    def test_custom(self):
        obj = AnalyzeRequest(case_id="c1", analysis_type="match")
        assert obj.analysis_type == "match"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  LEGACY INTEL INLINE SCHEMA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from app.api.legacy_intel import LegacySearchRequest

class TestLegacySearchRequest:
    def test_valid(self):
        obj = LegacySearchRequest(query="scar tattoo male")
        assert obj.min_score == 0.1
        assert obj.limit == 10

    def test_custom_threshold(self):
        obj = LegacySearchRequest(query="rose tattoo", min_score=0.5, limit=5)
        assert obj.min_score == 0.5

    def test_missing_query(self):
        with pytest.raises(ValidationError):
            LegacySearchRequest()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  NAMUS INLINE SCHEMA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from app.api.namus_adapter import NamusSearchRequest

class TestNamusSearchRequest:
    def test_valid(self):
        obj = NamusSearchRequest(query="compass tattoo houston")
        assert obj.min_score == 0.1

    def test_missing_query(self):
        with pytest.raises(ValidationError):
            NamusSearchRequest()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  TINYFISH ACTION INLINE SCHEMAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from app.api.tinyfish_actions import (
    OutreachPlanRequest, SourceScanRequest, VerifyAssistRequest,
    EscalationRequest, AgencyPackRequest, CallAssistRequest, ClosureRequest,
)

class TestOutreachPlanRequest:
    def test_valid(self):
        obj = OutreachPlanRequest(case_id="c1")
        assert obj.match_summary is None

class TestSourceScanRequest:
    def test_defaults(self):
        obj = SourceScanRequest()
        assert obj.source == "all"
        assert obj.re_score is True

class TestVerifyAssistRequest:
    def test_valid(self):
        obj = VerifyAssistRequest(case_id="c1")
        assert obj.match_id is None

class TestEscalationRequest:
    def test_valid(self):
        obj = EscalationRequest(case_id="c1", sla_hours=48.0)
        assert obj.breach_reason == "SLA exceeded"

class TestAgencyPackRequest:
    def test_defaults(self):
        obj = AgencyPackRequest(case_id="c1")
        assert obj.receiving_agency == "Red Cross"
        assert obj.redact_sensitive is True

class TestCallAssistRequest:
    def test_defaults(self):
        obj = CallAssistRequest(case_id="c1")
        assert obj.call_type == "inquiry"

    def test_custom(self):
        obj = CallAssistRequest(case_id="c1", call_type="family_update", notes="Good news")
        assert obj.notes == "Good news"

class TestClosureRequest:
    def test_valid(self):
        obj = ClosureRequest(case_id="c1")
        assert obj.reunification_details is None
