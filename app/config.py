from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    LANCEDB_URI: str = "/app/data/lancedb"
    VOYAGE_API_KEY: str
    GEMINI_API_KEY: str
    REDIS_URL: str = "redis://redis:6379/0"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    MAX_UPLOAD_SIZE: int = 52428800
    DEFAULT_RETRIEVAL_TOP_K: int = 5
    CHAT_HISTORY_LIMIT: int = 10
    PAGE_RENDER_DPI: int = 150
    PAGE_RENDER_FMT: str = "png"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
