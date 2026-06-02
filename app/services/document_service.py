import os
import shutil
import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, delete
from sqlalchemy.exc import SQLAlchemyError

from app.models.database import Document, DocumentPage
from app.core.vector_store import LanceDBManager

logger = logging.getLogger(__name__)

class DocumentService:
    def __init__(self, lancedb_manager: Optional[LanceDBManager] = None):
        self.lancedb = lancedb_manager

    # --- Async methods (FastAPI) ---
    async def create_document(
        self,
        db: AsyncSession,
        filename: str,
        file_path: str
    ) -> Dict[str, Any]:
        try:
            doc = Document(filename=filename, file_path=file_path, status="pending")
            db.add(doc)
            await db.commit()
            await db.refresh(doc)
            logger.info(f"Created document {doc.id} - {filename}")
            return {
                "id": doc.id,
                "filename": doc.filename,
                "file_path": doc.file_path,
                "status": doc.status,
                "created_at": doc.created_at,
            }
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error creating document: {e}")
            raise

    async def get_document(
        self,
        db: AsyncSession,
        document_id: str
    ) -> Optional[Dict[str, Any]]:
        try:
            result = await db.execute(
                select(Document)
                .options(joinedload(Document.pages))
                .where(Document.id == uuid.UUID(document_id))
            )
            doc = result.scalar_one_or_none()
            if not doc:
                return None
            return {
                "id": doc.id,
                "filename": doc.filename,
                "file_path": doc.file_path,
                "page_count": doc.page_count,
                "status": doc.status,
                "pages": [
                    {
                        "id": p.id,
                        "page_number": p.page_number,
                        "image_path": p.image_path,
                        "render_dpi": p.render_dpi,
                        "file_size_kb": p.file_size_kb,
                    }
                    for p in doc.pages
                ],
                "created_at": doc.created_at,
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error getting document {document_id}: {e}")
            raise

    async def list_documents(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20
    ) -> Dict[str, Any]:
        try:
            total_result = await db.execute(select(func.count()).select_from(Document))
            total = total_result.scalar()

            result = await db.execute(
                select(Document)
                .order_by(Document.created_at.desc())
                .offset(skip)
                .limit(limit)
            )
            docs = result.scalars().all()

            items = [
                {
                    "id": d.id,
                    "filename": d.filename,
                    "page_count": d.page_count,
                    "status": d.status,
                    "created_at": d.created_at,
                    "updated_at": d.updated_at,
                }
                for d in docs
            ]

            return {
                "items": items,
                "total": total,
                "page": (skip // limit) + 1,
                "page_size": limit,
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error listing documents: {e}")
            raise

    async def delete_document(
        self,
        db: AsyncSession,
        document_id: str
    ) -> None:
        try:
            doc_uuid = uuid.UUID(document_id)

            # Get document info before deletion for file cleanup
            result = await db.execute(
                select(Document).where(Document.id == doc_uuid)
            )
            doc = result.scalar_one_or_none()
            if not doc:
                return

            file_path = doc.file_path
            pages_dir = f"/app/data/pages/{document_id}"

            # Delete from LanceDB
            if self.lancedb:
                try:
                    self.lancedb.delete_by_document(document_id)
                except Exception as e:
                    logger.warning(f"LanceDB delete failed for {document_id}: {e}")

            # Delete from DB (cascades to pages, nullifies sessions)
            await db.execute(delete(Document).where(Document.id == doc_uuid))
            await db.commit()

            # Delete physical files
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
            if os.path.exists(pages_dir):
                shutil.rmtree(pages_dir)

            logger.info(f"Deleted document {document_id} and associated files")
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error deleting document {document_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error deleting document {document_id}: {e}")
            raise

    async def update_task_id(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
        task_id: str
    ) -> None:
        try:
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            doc = result.scalar_one_or_none()
            if doc:
                doc.task_id = task_id
                await db.commit()
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error updating task_id: {e}")
            raise

    # --- Sync methods (Celery Worker) ---
    def update_status_sync(
        self,
        db: Session,
        document_id: str,
        status: str
    ) -> None:
        try:
            doc_uuid = uuid.UUID(document_id)
            result = db.execute(select(Document).where(Document.id == doc_uuid))
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = status
                db.commit()
                logger.info(f"Updated document {document_id} status to {status}")
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error updating status: {e}")
            raise

    def save_pages_sync(
        self,
        db: Session,
        document_id: str,
        pages: List[Dict[str, Any]]
    ) -> None:
        try:
            doc_uuid = uuid.UUID(document_id)
            for page in pages:
                dp = DocumentPage(
                    document_id=doc_uuid,
                    page_number=page["page_number"],
                    image_path=page["image_path"],
                    render_dpi=page.get("render_dpi", 150),
                    file_size_kb=page.get("file_size_kb"),
                )
                db.add(dp)

            # Update document page_count
            result = db.execute(select(Document).where(Document.id == doc_uuid))
            doc = result.scalar_one_or_none()
            if doc:
                doc.page_count = len(pages)

            db.commit()
            logger.info(f"Saved {len(pages)} pages to PostgreSQL for document {document_id}")
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error saving pages: {e}")
            raise
