"""Embedding generation for faces and text."""
import numpy as np
from typing import Optional
import os

# Text embedding model (lazy loaded)
_text_model = None


def get_text_model():
    """Lazy load the sentence transformer model."""
    global _text_model
    if _text_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _text_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            print(f"Warning: Could not load sentence transformer: {e}")
            return None
    return _text_model


def generate_text_embedding(text: str) -> Optional[np.ndarray]:
    """Generate a text embedding using sentence-transformers."""
    if not text or not text.strip():
        return None

    model = get_text_model()
    if model is None:
        # Fallback: generate random embedding for demo
        return np.random.randn(768).astype(np.float32)

    embedding = model.encode(text, convert_to_numpy=True)

    # Pad or truncate to 768 dims
    if len(embedding) < 768:
        embedding = np.pad(embedding, (0, 768 - len(embedding)))
    elif len(embedding) > 768:
        embedding = embedding[:768]

    return embedding.astype(np.float32)


def generate_face_embedding(file_path: str) -> Optional[np.ndarray]:
    """Generate a face embedding from an image file.

    Uses a simplified approach for hackathon demo:
    - Tries to detect face and generate embedding via OpenCV DNN
    - Falls back to perceptual hash-based embedding for demo
    """
    try:
        from PIL import Image
        import cv2

        if not os.path.exists(file_path):
            return None

        # Load image
        img = cv2.imread(file_path)
        if img is None:
            return None

        # Convert to grayscale for face detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Use Haar cascade for face detection (lightweight)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) == 0:
            # No face detected - generate embedding from full image
            img_resized = cv2.resize(img, (64, 64))
            embedding = img_resized.flatten().astype(np.float32)
            # Reduce to 512 dims via simple averaging
            if len(embedding) > 512:
                chunk_size = len(embedding) // 512
                embedding = np.array([
                    embedding[i * chunk_size:(i + 1) * chunk_size].mean()
                    for i in range(512)
                ])
            embedding = embedding / (np.linalg.norm(embedding) + 1e-8)
            return embedding.astype(np.float32)

        # Extract first face
        x, y, w, h = faces[0]
        face_img = img[y:y + h, x:x + w]
        face_resized = cv2.resize(face_img, (64, 64))

        # Generate embedding from face pixels (simplified for demo)
        embedding = face_resized.flatten().astype(np.float32)
        if len(embedding) > 512:
            chunk_size = len(embedding) // 512
            embedding = np.array([
                embedding[i * chunk_size:(i + 1) * chunk_size].mean()
                for i in range(512)
            ])
        embedding = embedding / (np.linalg.norm(embedding) + 1e-8)
        return embedding.astype(np.float32)

    except Exception as e:
        print(f"Error generating face embedding: {e}")
        # Return random embedding for demo purposes
        return np.random.randn(512).astype(np.float32)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))
