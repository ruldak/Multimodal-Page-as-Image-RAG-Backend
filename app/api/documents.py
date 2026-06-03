import os
import uuid
import shutil
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import get_async_session
from app.services.document_service import DocumentService
from app.core.vector_store import LanceDBManager
from app.config import settings
from app.models.schemas import (
    DocumentUploadResponse,
    DocumentListResponse,
    DocumentOut,
    DocumentStatusResponse,
)
from tasks.document_tasks import process_document_task
from app.exceptions import DocumentNotReadyException, UpstreamAPIException
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
PAGES_DIR = BASE_DIR / "data" / "pages"

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])
logger = logging.getLogger(__name__)

doc_service = DocumentService()

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session)
):
    try:
        # Validate mimetype
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="File must be a PDF")

        # Validate size
        contents = await file.read()
        if len(contents) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="File exceeds maximum upload size")

        # Save file with pathlib
        file_id = str(uuid.uuid4())
        safe_filename = os.path.basename(file.filename)
        file_path = UPLOAD_DIR / f"{file_id}_{safe_filename}"
        
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(contents)

        # Create document record
        try:
            doc = await doc_service.create_document(db, safe_filename, str(file_path))
        except SQLAlchemyError as e:
            logger.error(f"Database error creating document: {e}")
            file_path.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail="Failed to save document metadata")

        # Enqueue Celery task
        try:
            task = process_document_task.delay(str(doc["id"]), str(file_path))
            await doc_service.update_task_id(db, doc["id"], task.id)
        except Exception as e:
            logger.error(f"Celery enqueue failed: {e}")
            # Don't fail the request, task can be re-queued manually

        return DocumentUploadResponse(
            document_id=doc["id"],
            task_id=task.id if 'task' in locals() else None,
            status="pending",
            message="Document queued for processing"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("", response_model=DocumentListResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        return await doc_service.list_documents(db, skip=skip, limit=limit)
    except SQLAlchemyError as e:
        logger.error(f"Database error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")
    except Exception as e:
        logger.error(f"Unexpected error listing documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        doc = await doc_service.get_document(db, document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error getting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve document")
    except Exception as e:
        logger.error(f"Unexpected error getting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        doc = await doc_service.get_document(db, document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        task_info = None
        if doc.get("task_id"):
            try:
                from tasks.celery_app import celery_app
                result = celery_app.AsyncResult(doc["task_id"])
                task_info = {
                    "task_state": result.state,
                    "task_result": result.result if result.ready() else None,
                }
            except Exception as e:
                logger.warning(f"Could not retrieve Celery task status: {e}")
                task_info = {"task_state": "unknown", "task_result": None}

        return DocumentStatusResponse(
            document_id=doc["id"],
            status=doc["status"],
            task=task_info,
            created_at=doc["created_at"],
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error getting status for {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve status")
    except Exception as e:
        logger.error(f"Unexpected error getting status for {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        doc = await doc_service.get_document(db, document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        lancedb = LanceDBManager(uri=settings.LANCEDB_URI)
        doc_service_with_lance = DocumentService(lancedb_manager=lancedb)
        await doc_service_with_lance.delete_document(db, document_id)
        return JSONResponse(content={"message": "No Content"}, status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error deleting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")
    except Exception as e:
        logger.error(f"Unexpected error deleting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
