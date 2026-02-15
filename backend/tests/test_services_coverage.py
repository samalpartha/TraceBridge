
import pytest
import numpy as np
from unittest.mock import MagicMock, patch
from app.services.embedding import (
    generate_text_embedding,
    generate_face_embedding,
    cosine_similarity,
    get_text_model
)

class TestEmbeddingService:
    def test_cosine_similarity(self):
        a = np.array([1, 0, 0])
        b = np.array([1, 0, 0])
        assert cosine_similarity(a, b) == 1.0

        c = np.array([0, 1, 0])
        assert cosine_similarity(a, c) == 0.0

        d = np.array([0, 0, 0])
        assert cosine_similarity(a, d) == 0.0

    @patch("sentence_transformers.SentenceTransformer")
    def test_get_text_model(self, mock_st):
        # Reset the global variable to force reload
        from app.services import embedding
        embedding._text_model = None
        
        model = get_text_model()
        assert model is not None
        mock_st.assert_called_once()

    @patch("app.services.embedding.get_text_model")
    def test_generate_text_embedding(self, mock_get_model):
        # Mock model behavior
        mock_model = MagicMock()
        mock_model.encode.return_value = np.zeros(768, dtype=np.float32)
        mock_get_model.return_value = mock_model

        # Test valid text
        embedding = generate_text_embedding("hello world")
        assert embedding is not None
        assert embedding.shape == (768,)
        assert embedding.dtype == np.float32

        # Test empty text
        assert generate_text_embedding("") is None
        assert generate_text_embedding(None) is None

    @patch("app.services.embedding.get_text_model")
    def test_generate_text_embedding_padding(self, mock_get_model):
        mock_model = MagicMock()
        # Return smaller embedding
        mock_model.encode.return_value = np.zeros(100, dtype=np.float32)
        mock_get_model.return_value = mock_model

        embedding = generate_text_embedding("test")
        assert embedding.shape == (768,)

    @patch("app.services.embedding.get_text_model")
    def test_generate_text_embedding_truncating(self, mock_get_model):
        mock_model = MagicMock()
        # Return larger embedding
        mock_model.encode.return_value = np.zeros(1000, dtype=np.float32)
        mock_get_model.return_value = mock_model

        embedding = generate_text_embedding("test")
        assert embedding.shape == (768,)
    
    @patch("app.services.embedding.get_text_model")
    def test_generate_text_embedding_fallback(self, mock_get_model):
        mock_get_model.return_value = None
        embedding = generate_text_embedding("test")
        assert embedding is not None
        assert embedding.shape == (768,)

    @patch("os.path.exists")
    @patch("cv2.imread")
    def test_generate_face_embedding_no_file(self, mock_imread, mock_exists):
        mock_exists.return_value = False
        assert generate_face_embedding("missing.jpg") is None

    @patch("os.path.exists")
    @patch("cv2.imread")
    @patch("cv2.cvtColor")
    @patch("cv2.CascadeClassifier")
    def test_generate_face_embedding_with_face(self, mock_cascade, mock_cvt, mock_imread, mock_exists):
        mock_exists.return_value = True
        mock_img = np.zeros((100, 100, 3), dtype=np.uint8)
        mock_imread.return_value = mock_img
        
        # Mock cascade
        mock_detector = MagicMock()
        mock_detector.detectMultiScale.return_value = [(10, 10, 50, 50)]
        mock_cascade.return_value = mock_detector

        embedding = generate_face_embedding("face.jpg")
        assert embedding is not None
        assert embedding.shape == (512,)

    @patch("os.path.exists")
    @patch("cv2.imread")
    @patch("cv2.cvtColor")
    @patch("cv2.CascadeClassifier")
    def test_generate_face_embedding_no_face(self, mock_cascade, mock_cvt, mock_imread, mock_exists):
        mock_exists.return_value = True
        mock_img = np.zeros((100, 100, 3), dtype=np.uint8)
        mock_imread.return_value = mock_img
        
        # Mock cascade returning empty list
        mock_detector = MagicMock()
        mock_detector.detectMultiScale.return_value = []
        mock_cascade.return_value = mock_detector

        embedding = generate_face_embedding("noface.jpg")
        assert embedding is not None
        assert embedding.shape == (512,)

    @patch("os.path.exists")
    def test_generate_face_embedding_error_fallback(self, mock_exists):
        mock_exists.side_effect = Exception("OpenCV Error")
        embedding = generate_face_embedding("error.jpg")
        assert embedding is not None
        assert embedding.shape == (512,)
