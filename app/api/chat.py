import time
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import get_async_session
from app.services.chat_service import ChatService
from app.services.document_service import DocumentService
from app.core.embedding import VoyageMultimodalEmbedding
from app.core.llm import GeminiMultimodalClient
from app.core.vector_store import LanceDBManager
from app.core.rag_engine import RAGEngine
from app.config import settings
from app.models.schemas import (
    ChatSessionCreate,
    ChatSessionOut,
    ChatSessionListResponse,
    ChatSessionDetail,
    ChatSendRequest,
    ChatSendResponse,
    ChatMessageOut,
    CitationOut,
)
from app.exceptions import DocumentNotReadyException, UpstreamAPIException

router = APIRouter(prefix="/api/v1/chat/sessions", tags=["chat"])
logger = logging.getLogger(__name__)

chat_service = ChatService()
doc_service = DocumentService()

# Initialize core components
embedder = VoyageMultimodalEmbedding(api_key=settings.VOYAGE_API_KEY)
gemini_client = GeminiMultimodalClient(api_key=settings.GEMINI_API_KEY)
lancedb = LanceDBManager(uri=settings.LANCEDB_URI)
rag_engine = RAGEngine(lancedb_manager=lancedb, embedder=embedder, llm_client=gemini_client)

@router.post("", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    req: ChatSessionCreate,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        document_exist = await doc_service.get_document(db=db, document_id=str(req.document_id) if req.document_id else None)

        if document_exist == None:
            raise HTTPException(status_code=404, detail="Document Not Found")

        session = await chat_service.create_session(
            db, 
            title=req.title, 
            document_id=str(req.document_id) if req.document_id else None
        )
        return session
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error creating session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create chat session")
    except Exception as e:
        logger.error(f"Unexpected error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=ChatSessionListResponse)
async def list_sessions(
    db: AsyncSession = Depends(get_async_session)
):
    try:
        items = await chat_service.list_sessions(db)
        return ChatSessionListResponse(items=items)
    except SQLAlchemyError as e:
        logger.error(f"Database error listing sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")
    except Exception as e:
        logger.error(f"Unexpected error listing sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}", response_model=ChatSessionDetail)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        session = await chat_service.get_session_with_messages(
            db, session_id, message_limit=settings.CHAT_HISTORY_LIMIT
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error getting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve session")
    except Exception as e:
        logger.error(f"Unexpected error getting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{session_id}/send", response_model=ChatSendResponse)
async def send_message(
    session_id: str,
    req: ChatSendRequest,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        # Validate session
        session = await chat_service.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Validate document readiness
        if session.document_id:
            try:
                doc = await doc_service.get_document(db, str(session.document_id))
            except SQLAlchemyError as e:
                logger.error(f"Database error getting document for session {session_id}: {e}")
                raise HTTPException(status_code=500, detail="Failed to verify document status")

            if not doc:
                raise HTTPException(status_code=404, detail="Attached document not found")
            if doc["status"] != "indexed":
                raise DocumentNotReadyException(status=doc["status"])

        # Get history
        try:
            history = await chat_service.get_last_n_messages(
                db, session_id, limit=settings.CHAT_HISTORY_LIMIT
            )
        except SQLAlchemyError as e:
            logger.error(f"Database error getting history for session {session_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to retrieve chat history")

        # Run RAG
        try:
            result = await rag_engine.chat(
                session_id=session_id,
                message=req.message,
                document_id=str(session.document_id) if session.document_id else None,
                history=history,
            )
        except Exception as e:
            logger.error(f"RAG engine error for session {session_id}: {e}")
            raise UpstreamAPIException(message=str(e))

        # Save messages
        try:
            await chat_service.add_message(db, session_id, "user", req.message)
            assistant_msg = await chat_service.add_message(
                db, session_id, "assistant", result["text"],
                sources=result["citations"],
                model="gemini-1.5-flash",
                latency_ms=result["latency_ms"],
                token_count=result["total_token_count"],
            )
        except SQLAlchemyError as e:
            logger.error(f"Database error saving messages for session {session_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to save chat messages")

        return ChatSendResponse(
            message=ChatMessageOut(**assistant_msg),
            session_id=session.id,
            citations=[CitationOut(**c) for c in result["citations"]],
        )
    except HTTPException:
        raise
    except DocumentNotReadyException:
        raise
    except UpstreamAPIException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error in send_message: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.error(f"Unexpected error in send_message for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    try:
        session = await chat_service.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        await chat_service.delete_session(db, session_id)
        return {"detail": "Session deleted"}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error deleting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")
    except Exception as e:
        logger.error(f"Unexpected error deleting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
