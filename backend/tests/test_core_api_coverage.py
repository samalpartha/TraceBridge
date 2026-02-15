
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import UploadFile
from app.models.case import Case, MediaAsset
from app.models.match import MatchCandidate, SourceRecord
from app.models.user import User
from app.api.cases import list_cases, get_case, create_case, update_case_status, get_case_media
from app.api.matches import get_matches_for_case, verify_match, VerifyRequest
from app.api.auth import register, login, get_me, RegisterRequest, LoginRequest
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class TestCoreAPI:

    @pytest.fixture
    def mock_db(self):
        return AsyncMock()

    # --- Cases API Tests ---
    @pytest.mark.asyncio
    async def test_list_cases(self, mock_db):
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [
            Case(id="12345678-1234-5678-1234-567812345678", person_name="John", status="open")
        ]
        mock_db.execute.side_effect = [mock_result, MagicMock(scalar=lambda: 1)]
        
        response = await list_cases(status="open", db=mock_db)
        assert len(response.cases) == 1
        assert response.total == 1

    @pytest.mark.asyncio
    async def test_get_case_success(self, mock_db):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = Case(id="12345678-1234-5678-1234-567812345678", person_name="John", status="open")
        mock_db.execute.return_value = mock_result
        
        response = await get_case("12345678-1234-5678-1234-567812345678", mock_db)
        assert response.person_name == "John"

    @pytest.mark.asyncio
    async def test_create_case(self, mock_db):
        # Mock file upload
        mock_file = AsyncMock(spec=UploadFile)
        mock_file.filename = "photo.jpg"
        mock_file.read.return_value = b"img_data"
        
        mock_db.add = MagicMock()

        with patch("builtins.open", new_callable=MagicMock):
            response = await create_case(
                person_name="John",
                age=30,
                gender=None,
                description=None,
                last_known_location=None,
                last_known_lat=None,
                last_known_lng=None,
                last_known_date=None,
                contact_info=None,
                reporter_id=None,
                photo=mock_file,
                db=mock_db
            )
        
        assert response.person_name == "John"
        assert mock_db.add.call_count == 2 # Case + MediaAsset
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_case_status(self, mock_db):
        mock_case = MagicMock(spec=Case)
        mock_case.id = "12345678-1234-5678-1234-567812345678"
        mock_case.status = "open"
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_case
        mock_db.execute.return_value = mock_result
        
        response = await update_case_status("12345678-1234-5678-1234-567812345678", "closed", mock_db)
        assert response["status"] == "closed"
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_case_media(self, mock_db):
        mock_result = MagicMock()
        mock_asset = MagicMock(spec=MediaAsset)
        mock_asset.id = "12345678-1234-5678-1234-567812345678"
        mock_asset.file_path = "/path"
        mock_asset.media_type = "photo"
        mock_result.scalars.return_value.all.return_value = [mock_asset]
        mock_db.execute.return_value = mock_result
        
        response = await get_case_media("12345678-1234-5678-1234-567812345678", mock_db)
        assert len(response) == 1
        assert response[0]["file_path"] == "/path"

    # --- Matches API Tests ---
    @pytest.mark.asyncio
    async def test_get_matches_for_case(self, mock_db):
        # Mock matches
        match = MagicMock(spec=MatchCandidate)
        match.id = "12345678-1234-5678-1234-567812345678"
        match.case_id = "12345678-1234-5678-1234-567812345678"
        match.source_record_id = "12345678-1234-5678-1234-567812345678"
        match.vision_score = 0.9
        
        mock_matches_res = MagicMock()
        mock_matches_res.scalars.return_value.all.return_value = [match]
        
        # Mock source record
        sr = MagicMock(spec=SourceRecord)
        sr.person_name = "Match Name"
        mock_sr_res = MagicMock()
        mock_sr_res.scalar_one_or_none.return_value = sr
        
        mock_db.execute.side_effect = [mock_matches_res, mock_sr_res]
        
        response = await get_matches_for_case("12345678-1234-5678-1234-567812345678", mock_db)
        assert len(response) == 1
        assert response[0]["person_name"] == "Match Name"

    @pytest.mark.asyncio
    async def test_verify_match(self, mock_db):
        match = MagicMock(spec=MatchCandidate)
        match.id = "12345678-1234-5678-1234-567812345678"
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = match
        mock_db.execute.return_value = mock_result
        
        req = VerifyRequest(action="approve", notes="Looks good")
        mock_db.add = MagicMock()
        response = await verify_match("12345678-1234-5678-1234-567812345678", req, mock_db)
        
        assert response["status"] == "approved"
        mock_db.commit.assert_called_once()
        assert mock_db.add.call_count == 1 # VerificationAction

    # --- Auth API Tests ---
    @pytest.mark.asyncio
    async def test_register_success(self, mock_db):
        mock_db.add = MagicMock()
        # Existing check
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        req = RegisterRequest(email="new@test.com", password="pw", full_name="User")
        response = await register(req, mock_db)
        
        assert response.user_id is not None
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_login_success(self, mock_db):
        user = MagicMock(spec=User)
        user.id = "12345678-1234-5678-1234-567812345678"
        user.email = "test@test.com"
        user.hashed_password = pwd_context.hash("pw")
        user.role = "family"
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = user
        mock_db.execute.return_value = mock_result
        
        req = LoginRequest(email="test@test.com", password="pw")
        response = await login(req, mock_db)
        assert response.access_token is not None

    @pytest.mark.asyncio
    async def test_get_me(self):
        user = MagicMock(spec=User)
        user.id = "12345678-1234-5678-1234-567812345678"
        user.email = "test@test.com"
        
        response = await get_me(user)
        assert response["email"] == "test@test.com"
