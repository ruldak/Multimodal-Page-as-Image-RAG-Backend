import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select, func, delete
from sqlalchemy.exc import SQLAlchemyError

from app.models.database import ChatSession, ChatMessage, Citation

logger = logging.getLogger(__name__)

class ChatService:
    async def create_session(
        self,
        db: AsyncSession,
        title: Optional[str] = None,
        document_id: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            doc_uuid = uuid.UUID(document_id) if document_id else None
            session = ChatSession(title=title, document_id=doc_uuid)
            db.add(session)
            await db.commit()
            await db.refresh(session)
            logger.info(f"Created chat session {session.id}")
            return {
                "id": session.id,
                "document_id": session.document_id,
                "title": session.title,
                "created_at": session.created_at,
            }
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error creating session: {e}")
            raise

    async def update_session_title(
        self,
        db: AsyncSession,
        session_id: str,
        title: str
    ) -> Optional[Dict[str, Any]]:
        try:
            session_uuid = uuid.UUID(session_id)
            
            session = await db.get(ChatSession, session_uuid)
            
            if not session:
                logger.warning(f"Chat session with id {session_id} not found")
                return None
            
            session.title = title
            
            await db.commit()
            await db.refresh(session)
            
            logger.info(f"Successfully updated the title for chat session {session.id}")
            
            return {
                "id": session.id,
                "document_id": session.document_id,
                "title": session.title,
                "created_at": session.created_at,
            }
            
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error saat update title session: {e}")
            raise
        except ValueError as e:
            logger.error(f"Format session_id UUID tidak valid: {e}")
            raise

    async def get_session(
        self,
        db: AsyncSession,
        session_id: str
    ) -> Optional[ChatSession]:
        try:
            result = await db.execute(
                select(ChatSession).where(ChatSession.id == uuid.UUID(session_id))
            )
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(f"Database error getting session {session_id}: {e}")
            raise

    async def get_session_with_messages(
        self,
        db: AsyncSession,
        session_id: str,
        message_limit: int = 10
    ) -> Optional[Dict[str, Any]]:
        try:
            result = await db.execute(
                select(ChatSession)
                .where(ChatSession.id == uuid.UUID(session_id))
            )
            session = result.scalar_one_or_none()
            if not session:
                return None

            # Load last N messages ordered by created_at ASC
            msg_result = await db.execute(
                select(ChatMessage)
                .where(ChatMessage.session_id == uuid.UUID(session_id))
                .order_by(ChatMessage.created_at.asc())
                .limit(message_limit)
            )
            messages = msg_result.scalars().all()

            return {
                "id": session.id,
                "document_id": session.document_id,
                "title": session.title,
                "messages": [
                    {
                        "id": m.id,
                        "role": m.role,
                        "content": m.content,
                        "sources": m.sources or [],
                        "model": m.model,
                        "latency_ms": m.latency_ms,
                        "created_at": m.created_at,
                    }
                    for m in messages
                ],
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error getting session with messages {session_id}: {e}")
            raise

    async def get_last_n_messages(
        self,
        db: AsyncSession,
        session_id: str,
        limit: int = 10
    ) -> List[Dict[str, str]]:
        try:
            result = await db.execute(
                select(ChatMessage)
                .where(
                    ChatMessage.session_id == uuid.UUID(session_id),
                    ChatMessage.role.in_(["user", "assistant"])
                )
                .order_by(ChatMessage.created_at.asc())
                .limit(limit)
            )
            messages = result.scalars().all()
            return [
                {"role": m.role, "content": m.content}
                for m in messages
            ]
        except SQLAlchemyError as e:
            logger.error(f"Database error getting messages for {session_id}: {e}")
            raise

    async def add_message(
        self,
        db: AsyncSession,
        session_id: str,
        role: str,
        content: str,
        sources: List[Dict[str, Any]] = None,
        model: str = None,
        latency_ms: int = None,
        token_count: int = None
    ) -> Dict[str, Any]:
        try:
            msg = ChatMessage(
                session_id=uuid.UUID(session_id),
                role=role,
                content=content,
                sources=sources or [],
                model=model,
                latency_ms=latency_ms,
                token_count=token_count,
            )
            db.add(msg)
            await db.commit()
            await db.refresh(msg)

            # Save citations if sources provided
            if sources:
                for src in sources:
                    citation = Citation(
                        message_id=msg.id,
                        page_number=src.get("page_number", 0),
                        image_path=src.get("image_path", ""),
                        score=src.get("score"),
                    )
                    db.add(citation)
                await db.commit()

            return {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "sources": msg.sources or [],
                "model": msg.model,
                "latency_ms": msg.latency_ms,
                "token_count": msg.token_count,
                "created_at": msg.created_at,
            }
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error adding message: {e}")
            raise

    async def list_sessions(
        self,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        try:
            result = await db.execute(
                select(ChatSession).order_by(ChatSession.created_at.desc())
            )
            sessions = result.scalars().all()

            items = []
            for s in sessions:
                try:
                    count_result = await db.execute(
                        select(func.count()).select_from(ChatMessage).where(ChatMessage.session_id == s.id)
                    )
                    msg_count = count_result.scalar()
                except Exception:
                    msg_count = 0
                items.append({
                    "id": s.id,
                    "document_id": s.document_id,
                    "title": s.title,
                    "message_count": msg_count,
                    "created_at": s.created_at,
                })
            return items
        except SQLAlchemyError as e:
            logger.error(f"Database error listing sessions: {e}")
            raise

    async def delete_session(
        self,
        db: AsyncSession,
        session_id: str
    ) -> None:
        try:
            await db.execute(
                delete(ChatSession).where(ChatSession.id == uuid.UUID(session_id))
            )
            await db.commit()
            logger.info(f"Deleted chat session {session_id}")
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error deleting session {session_id}: {e}")
            raise
