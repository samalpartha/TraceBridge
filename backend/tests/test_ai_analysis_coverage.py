
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.api.ai_analysis import analyze_case, suggest_description, AnalyzeRequest, _gemini_chat
from app.models.case import Case
from app.models.match import MatchCandidate

class TestAIAnalysis:
    @pytest.mark.asyncio
    async def test_gemini_chat(self):
        with patch("litellm.acompletion") as mock_complete:
            mock_resp = MagicMock()
            mock_resp.choices = [MagicMock(message=MagicMock(content="Analysis result"))]
            mock_complete.return_value = mock_resp
            
            res = await _gemini_chat("system", "user")
            assert res == "Analysis result"

    @pytest.mark.asyncio
    async def test_analyze_case_with_id(self):
        with patch("app.api.ai_analysis._gemini_chat") as mock_chat:
            mock_chat.return_value = "Risk Level: LOW"
            
            mock_db = AsyncMock()
            
            # Case mock
            mock_case = Case(
                id="12345678-1234-5678-1234-567812345678",
                person_name="John",
                age=30,
                status="missing",
                last_known_location="NY",
                created_at="2023-01-01"
            )
            mock_db.execute.return_value.scalar_one_or_none.return_value = mock_case
            
            # Match mock
            mock_match = MatchCandidate(id="987", fused_score=0.8, status="pending")
            # Second execute call returns match scalars
            mock_match_res = MagicMock()
            mock_match_res.scalars.return_value.all.return_value = [mock_match]
            
            # Use side_effect for execute to handle multiple calls
            # 1. Case query -> returns Result with scalar_one_or_none
            # 2. Match query -> returns Result with scalars().all()
            
            mock_case_res = MagicMock()
            mock_case_res.scalar_one_or_none.return_value = mock_case
            
            mock_db.execute.side_effect = [mock_case_res, mock_match_res]
            
            req = AnalyzeRequest(case_id="12345678-1234-5678-1234-567812345678", analysis_type="risk")
            res = await analyze_case(req, db=mock_db)
            
            assert res["result"] == "Risk Level: LOW"
            assert res["case_id"] == "12345678-1234-5678-1234-567812345678"

    @pytest.mark.asyncio
    async def test_analyze_case_with_description(self):
         with patch("app.api.ai_analysis._gemini_chat") as mock_chat:
            mock_chat.return_value = "Detailed analysis"
            
            req = AnalyzeRequest(description="A missing person...", analysis_type="summary")
            res = await analyze_case(req, db=AsyncMock())
            
            assert res["result"] == "Detailed analysis"

    @pytest.mark.asyncio
    async def test_suggest_description(self):
         with patch("app.api.ai_analysis._gemini_chat") as mock_chat:
            mock_chat.return_value = "Structured description"
            
            res = await suggest_description(partial_info="He was wearing a red hat")
            assert res["suggestion"] == "Structured description"
