
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import HTTPException
from app.api.tinyfish_actions import (
    generate_outreach_plan,
    trigger_source_scan,
    verification_assist,
    trigger_escalation,
    generate_agency_pack,
    call_center_assist,
    trigger_closure,
    _get_case,
    OutreachPlanRequest,
    SourceScanRequest,
    VerifyAssistRequest,
    EscalationRequest,
    AgencyPackRequest,
    CallAssistRequest,
    ClosureRequest
)
from app.models.case import Case
from app.models.match import MatchCandidate

class TestTinyfishActions:
    
    @pytest.fixture
    def mock_db(self):
        return AsyncMock()

    @pytest.fixture
    def mock_case(self):
        case = MagicMock(spec=Case)
        case.id = "12345678-1234-5678-1234-567812345678"
        case.person_name = "John Doe"
        case.age = 30
        case.status = "open"
        case.last_known_location = "NY"
        case.last_known_lat = 40.0
        case.last_known_lng = -74.0
        case.description = "Desc"
        return case

    @pytest.mark.asyncio
    async def test_get_case_success(self, mock_db, mock_case):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_case
        mock_db.execute.return_value = mock_result
        
        case = await _get_case("12345678-1234-5678-1234-567812345678", mock_db)
        assert case == mock_case

    @pytest.mark.asyncio
    async def test_get_case_not_found(self, mock_db):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        with pytest.raises(HTTPException) as exc:
            await _get_case("12345678-1234-5678-1234-567812345678", mock_db)
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_case_invalid_id(self, mock_db):
        with pytest.raises(HTTPException) as exc:
            await _get_case("invalid-id", mock_db)
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    @patch("app.api.tinyfish_actions.run_sync_automation")
    @patch("app.api.tinyfish_actions._get_case")
    async def test_generate_outreach_plan(self, mock_get_case, mock_run, mock_db, mock_case):
        mock_get_case.return_value = mock_case
        mock_run.return_value = {"plan": "test"}
        
        req = OutreachPlanRequest(case_id="cid")
        result = await generate_outreach_plan(req, mock_db)
        
        assert result["workflow"] == "outreach_plan"
        assert result["tinyfish_result"] == {"plan": "test"}

    @pytest.mark.asyncio
    @patch("app.api.tinyfish_actions.run_async_automation")
    async def test_trigger_source_scan(self, mock_run, mock_db):
        mock_run.return_value = {"run_id": "123"}
        
        req = SourceScanRequest(source="fbi")
        result = await trigger_source_scan(req)
        
        assert result["workflow"] == "source_scan"
        assert "fbi" in result["results"]

    @pytest.mark.asyncio
    @patch("app.api.tinyfish_actions.run_sync_automation")
    @patch("app.api.tinyfish_actions._get_case")
    async def test_verification_assist(self, mock_get_case, mock_run, mock_db, mock_case):
        mock_get_case.return_value = mock_case
        mock_run.return_value = {"cards": []}
        
        # Mock matches query
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result
        
        req = VerifyAssistRequest(case_id="cid")
        result = await verification_assist(req, mock_db)
        
        assert result["workflow"] == "verify_assist"
        assert result["tinyfish_result"] == {"cards": []}

    @pytest.mark.asyncio
    @patch("app.api.tinyfish_actions.run_sync_automation")
    @patch("app.api.tinyfish_actions._get_case")
    async def test_trigger_escalation(self, mock_get_case, mock_run, mock_db, mock_case):
        mock_get_case.return_value = mock_case
        mock_run.return_value = {"action": "escalate"}
        
        req = EscalationRequest(case_id="cid", sla_hours=24)
        result = await trigger_escalation(req, mock_db)
        
        assert result["workflow"] == "escalation"
        assert result["tinyfish_result"] == {"action": "escalate"}

    @pytest.mark.asyncio
    @patch("app.api.tinyfish_actions.run_sync_automation")
    @patch("app.api.tinyfish_actions._get_case")
    async def test_generate_agency_pack(self, mock_get_case, mock_run, mock_db, mock_case):
        mock_get_case.return_value = mock_case
        mock_run.return_value = {"pack": "data"}
        
        req = AgencyPackRequest(case_id="cid")
        result = await generate_agency_pack(req, mock_db)
        
        assert result["workflow"] == "agency_pack"
        assert result["tinyfish_result"] == {"pack": "data"}

    @pytest.mark.asyncio
    @patch("app.api.tinyfish_actions._get_case")
    async def test_call_center_assist(self, mock_get_case, mock_db, mock_case):
        mock_get_case.return_value = mock_case
        
        req = CallAssistRequest(case_id="cid", call_type="inquiry")
        result = await call_center_assist(req, mock_db)
        
        assert result["workflow"] == "call_assist"
        assert "Opening: 'Thank you for calling" in result["script"]

    @pytest.mark.asyncio
    @patch("app.api.tinyfish_actions.run_sync_automation")
    @patch("app.api.tinyfish_actions._get_case")
    async def test_trigger_closure(self, mock_get_case, mock_run, mock_db, mock_case):
        mock_get_case.return_value = mock_case
        mock_run.return_value = {"notifications": []}
        
        req = ClosureRequest(case_id="cid")
        result = await trigger_closure(req, mock_db)
        
        assert result["workflow"] == "closure"
        assert result["person_name"] == "John Doe"
