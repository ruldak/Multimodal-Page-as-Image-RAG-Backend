from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.core.embedding import VoyageMultimodalEmbedding
from app.core.llm import GeminiMultimodalClient
from app.core.vector_store import LanceDBManager
from app.config import settings
import redis
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/health", tags=["health"])

@router.get("")
async def health_check():
    checks = {}

    # PostgreSQL
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        checks["postgresql"] = "ok"
    except Exception as e:
        logger.warning(f"PostgreSQL health check failed: {e}")
        checks["postgresql"] = "error"

    # LanceDB
    try:
        lancedb = LanceDBManager(uri=settings.LANCEDB_URI)
        checks["lancedb"] = "ok"
    except Exception as e:
        logger.warning(f"LanceDB health check failed: {e}")
        checks["lancedb"] = "error"

    # Redis
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")
        checks["redis"] = "error"

    # Voyage API
    try:
        embedder = VoyageMultimodalEmbedding(api_key=settings.VOYAGE_API_KEY)
        embedder._get_text_embedding("test")
        checks["voyage_api"] = "ok"
    except Exception as e:
        logger.warning(f"Voyage API health check failed: {e}")
        checks["voyage_api"] = "error"

    # Gemini API
    try:
        gemini = GeminiMultimodalClient(api_key=settings.GEMINI_API_KEY)
        # Light check: just verify API key is configured
        checks["gemini_api"] = "ok"
    except Exception as e:
        logger.warning(f"Gemini API health check failed: {e}")
        checks["gemini_api"] = "error"

    status = "healthy" if all(v == "ok" for v in checks.values()) else "unhealthy"
    http_status = 200 if status == "healthy" else 503

    return JSONResponse(
        content={
            "status": status,
            "checks": checks,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        status_code=http_status,
    )
