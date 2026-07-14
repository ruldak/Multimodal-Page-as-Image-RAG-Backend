import os
import uuid
from typing import Dict, Any
from celery import shared_task
from sqlalchemy.orm import Session

from app.db.session import get_sync_session
from app.services.document_service import DocumentService
from app.core.render_engine import render_pdf_pages
from app.core.embedding import VoyageMultimodalEmbedding
from app.core.vector_store import LanceDBManager
from app.config import settings
import logging
from tasks.celery_app import celery_app
from pathlib import Path
from celery.exceptions import SoftTimeLimitExceeded

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_document_task(self, document_id: str, file_path: str) -> Dict[str, Any]:
    """
    Background task: render PDF -> embed -> index.
    Uses sync SQLAlchemy session for Celery worker context.
    """
    db = get_sync_session()
    try:
        doc_service = DocumentService()
        doc_service.update_status_sync(db, document_id, "rendering")

        output_dir = BASE_DIR / "data" / "pages" / document_id
        pages = render_pdf_pages(
            file_path,
            output_dir=str(output_dir),
            dpi=settings.PAGE_RENDER_DPI,
            fmt=settings.PAGE_RENDER_FMT,
        )

        doc_service.update_status_sync(db, document_id, "embedding")

        embedder = VoyageMultimodalEmbedding(
            api_key=settings.VOYAGE_API_KEY,
            model="voyage-multimodal-3.5"
        )

        embedded_pages = []
        failed_pages = []
        
        try:
            for page in pages:
                try:
                    embedding = embedder.get_image_embedding(page["image_path"])
                    page_id = str(uuid.uuid4())
                    embedded_pages.append({
                        "id": page_id,
                        "document_id": document_id,
                        "page_number": page["page_number"],
                        "node_type": "page_image",
                        "image_path": page["image_path"],
                        "embedding": embedding,
                        "metadata": {
                            "filename": Path(file_path).name,
                            "render_dpi": page["render_dpi"],
                            "file_size_kb": page["file_size_kb"],
                        }
                    })
                except Exception as e:
                    logger.error(f"Failed to embed page {page['page_number']}: {e}")
                    failed_pages.append(page["page_number"])
        except SoftTimeLimitExceeded:
            logger.error(f"Time limit approaching for {document_id}. Saving partial progress...")
            if embedded_pages:
                lancedb = LanceDBManager(uri=settings.LANCEDB_URI)
                lancedb.insert_pages(document_id, embedded_pages)
            
            doc_service.update_status_sync(db, document_id, "timeout_partial_indexed")
            return {"status": "timeout", "indexed_pages": len(embedded_pages)}

        if embedded_pages:
            lancedb = LanceDBManager(uri=settings.LANCEDB_URI)
            lancedb.insert_pages(document_id, embedded_pages)
            doc_service.save_pages_sync(db, document_id, pages)

        if len(failed_pages) == len(pages):
            raise self.retry(exc=Exception("All pages failed to embed"), countdown=60 * (2 ** self.request.retries))
        elif failed_pages:
            logger.warning(f"Document {document_id} partially indexed. Failed pages: {failed_pages}")
            doc_service.update_status_sync(db, document_id, "partial_indexed")
            return {"status": "partial_indexed", "failed_pages": failed_pages}
        else:
            logger.info(f"Document {document_id} fully processed: {len(pages)} pages")
            doc_service.update_status_sync(db, document_id, "indexed")
            return {"status": "indexed", "pages": len(pages)}

    except Exception as exc:
        logger.error(f"Document processing failed for {document_id}: {exc}")
        try:
            doc_service.update_status_sync(db, document_id, "failed")
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
    finally:
        db.close()
