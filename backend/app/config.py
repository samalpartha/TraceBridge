from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "TraceBridge"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://reunite:reunite@localhost:5432/reuniteai"
    DATABASE_URL_SYNC: str = "postgresql://reunite:reunite@localhost:5432/reuniteai"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    SECRET_KEY: str = "change-me-to-a-random-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # TinyFish
    TINYFISH_API_KEY: str = ""
    TINYFISH_BASE_URL: str = "https://agent.tinyfish.ai/v1/automation"

    # LLM – Google Gemini via LiteLLM
    OPENAI_API_KEY: Optional[str] = None
    LITELLM_MODEL: str = "gemini/gemini-2.0-flash"

    # Storage
    UPLOAD_DIR: str = "./uploads"

    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3005"

    # Google
    GOOGLE_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""

    # Embedding dimensions
    FACE_EMBEDDING_DIM: int = 512
    TEXT_EMBEDDING_DIM: int = 768

    model_config = {"env_file": ".env", "extra": "allow"}


settings = Settings()
