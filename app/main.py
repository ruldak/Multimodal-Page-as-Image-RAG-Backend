import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api import documents, chat, health
from app.config import settings

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

class DocumentNotReadyException(Exception):
    def __init__(self, status: str):
        self.status = status
        super().__init__(f"Document not ready, status: {status}")

class UpstreamAPIException(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

def create_app() -> FastAPI:
    app = FastAPI(
        title="RAG Multimodal Backend",
        description="Conversational Multimodal RAG with Page-as-Image approach",
        version="2.0-AI",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handlers
    @app.exception_handler(DocumentNotReadyException)
    async def document_not_ready_handler(request: Request, exc: DocumentNotReadyException):
        return JSONResponse(
            status_code=412,
            content={"error": "Document not ready", "document_status": exc.status},
        )

    @app.exception_handler(UpstreamAPIException)
    async def upstream_api_handler(request: Request, exc: UpstreamAPIException):
        return JSONResponse(
            status_code=502,
            content={"error": "Upstream API failure", "detail": exc.message},
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_handler(request: Request, exc: SQLAlchemyError):
        logger.error(f"Database error: {exc}")
        return JSONResponse(
            status_code=500,
            content={"error": "Database error", "detail": str(exc)},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "detail": str(exc)},
        )

    app.include_router(documents.router)
    app.include_router(chat.router)
    app.include_router(health.router)

    @app.on_event("startup")
    async def startup_event():
        logger.info("RAG Multimodal Backend starting up...")

    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("RAG Multimodal Backend shutting down...")

    return app

app = create_app()
