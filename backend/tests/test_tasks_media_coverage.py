
import pytest
from unittest.mock import MagicMock, patch
from PIL import Image

# Import the code to be tested
from app.services.media import validate_image, get_image_dimensions, create_thumbnail
from app.tasks.process_media import extract_face_embedding, generate_text_embedding_task
from app.tasks.outreach_tasks import send_ngo_alert
from app.tasks.scan_sources import scan_single_source, scan_crisis_feeds

class TestMediaServices:
    def test_validate_image_valid(self):
        with patch("PIL.Image.open") as mock_open:
            mock_img = MagicMock()
            mock_open.return_value.__enter__.return_value = mock_img
            assert validate_image("test.jpg") is True

    def test_validate_image_invalid(self):
        with patch("PIL.Image.open") as mock_open:
            mock_open.side_effect = Exception("Invalid")
            assert validate_image("test.jpg") is False

    def test_get_image_dimensions(self):
        with patch("PIL.Image.open") as mock_open:
            mock_img = MagicMock()
            mock_open.return_value.__enter__.return_value = mock_img
            mock_img.size = (100, 200)
            assert get_image_dimensions("test.jpg") == (100, 200)

    def test_create_thumbnail(self):
        with patch("PIL.Image.open") as mock_open:
            mock_img = MagicMock()
            mock_open.return_value.__enter__.return_value = mock_img
            assert create_thumbnail("in.jpg", "out.jpg") is True
            mock_img.thumbnail.assert_called()
            mock_img.save.assert_called()



class TestTasks:
    @patch("app.database.SyncSessionLocal")
    @patch("app.services.embedding.generate_face_embedding")
    def test_extract_face_embedding(self, mock_gen_emb, mock_db_cls):
        # Setup DB Mock
        mock_db = MagicMock()
        mock_db_cls.return_value = mock_db
        
        # Setup Media Asset Mock
        mock_media = MagicMock()
        mock_media.file_path = "/path/to/img.jpg"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_media
        
        # Setup Embedding Mock
        mock_emb = MagicMock()
        mock_emb.tolist.return_value = [0.1, 0.2]
        mock_gen_emb.return_value = mock_emb
        
        # Run
        res = extract_face_embedding("12345678-1234-5678-1234-567812345678")
        
        assert res["status"] == "success"
        assert mock_media.face_embedding == [0.1, 0.2]
        mock_db.commit.assert_called_once()
        mock_db.close.assert_called_once()


    @patch("app.database.SyncSessionLocal")
    @patch("app.services.embedding.generate_text_embedding")
    def test_generate_text_embedding_task(self, mock_gen_emb, mock_db_cls):
        mock_db = MagicMock()
        mock_db_cls.return_value = mock_db
        
        mock_record = MagicMock()
        mock_record.person_name = "John"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_record
        
        mock_emb = MagicMock()
        mock_emb.tolist.return_value = [0.1, 0.2]
        mock_gen_emb.return_value = mock_emb
        
        res = generate_text_embedding_task("12345678-1234-5678-1234-567812345678")
        
        assert res["status"] == "success"
        assert mock_record.text_embedding == [0.1, 0.2]

    @patch("app.database.SyncSessionLocal")
    @patch("app.services.tinyfish_client.run_sync_automation")
    def test_send_ngo_alert(self, mock_run_tinyfish, mock_db_cls):
        mock_db = MagicMock()
        mock_db_cls.return_value = mock_db
        
        mock_match = MagicMock()
        mock_match.id = "12345678-1234-5678-1234-567812345678"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_match
        
        mock_run_tinyfish.return_value = {"status": "COMPLETED", "result": {"form_found": True}, "run_id": "run1"}
        
        res = send_ngo_alert("12345678-1234-5678-1234-567812345678")
        
        assert res["status"] == "success"
        mock_db.add.assert_called() # OutreachEvent
        mock_db.commit.assert_called()

    @patch("app.database.SyncSessionLocal")
    @patch("app.services.tinyfish_client.run_sync_automation")
    def test_scan_single_source(self, mock_run_tinyfish, mock_db_cls):
        mock_db = MagicMock()
        mock_db_cls.return_value = mock_db
        
        mock_run_tinyfish.return_value = {
            "status": "COMPLETED", 
            "result": {
                "persons": [{"name": "John", "age": 30}]
            },
            "run_id": "run1"
        }
        
        res = scan_single_source("http://url.com", "goal")
        
        assert res["status"] == "success"
        assert res["records_created"] == 1
        mock_db.add.assert_called() # SourceRecord
        mock_db.commit.assert_called()

    @patch("app.database.SyncSessionLocal")
    @patch("app.services.tinyfish_client.run_sync_automation")
    def test_scan_crisis_feeds(self, mock_run_tinyfish, mock_db_cls):
        mock_db = MagicMock()
        mock_db_cls.return_value = mock_db

        mock_run_tinyfish.return_value = {
            "status": "COMPLETED", 
            "result": {
                "persons": [{"name": "John", "age": 30}]
            },
            "run_id": "run1"
        }

        scan_crisis_feeds()
        
        mock_db.add.assert_called()
        mock_db.commit.assert_called()
