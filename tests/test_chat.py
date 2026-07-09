import pytest
from unittest.mock import patch, AsyncMock
from types import SimpleNamespace  # <-- Import SimpleNamespace
import json
import uuid

@pytest.mark.asyncio
@patch("app.api.chat.rag_engine")
@patch("app.api.chat.chat_service")
@patch("app.api.chat.doc_service")
async def test_send_message_stream(mock_doc_service, mock_chat_service, mock_rag_engine, client, mock_db_session):
    # Arrange
    session_id = str(uuid.uuid4())
    doc_id = str(uuid.uuid4())
    
    # FIX: Gunakan SimpleNamespace agar bisa diakses dengan dot notation (session.document_id)
    mock_session = SimpleNamespace(id=session_id, document_id=doc_id)
    mock_chat_service.get_session = AsyncMock(return_value=mock_session)
    
    # doc_service tetap mengembalikan dictionary (karena di kode asli diakses dengan doc["status"])
    mock_doc_service.get_document = AsyncMock(return_value={"id": doc_id, "status": "indexed"})
    mock_chat_service.get_last_n_messages = AsyncMock(return_value=[])
    mock_chat_service.add_message = AsyncMock(return_value={"id": uuid.uuid4()})
    
    # Mock Async Generator untuk RAG Engine Stream
    async def fake_stream(*args, **kwargs):
        yield {"type": "citations", "data": [{"page_number": 1, "image_path": "/img.png", "score": 0.9}]}
        yield {"type": "chunk", "data": {"text": "Hello "}}
        yield {"type": "chunk", "data": {"text": "World!"}}
        yield {"type": "metadata", "data": {"total_token_count": 10}}
        
    mock_rag_engine.stream_chat.side_effect = fake_stream
    
    # Act: Stream the response
    async with client.stream(
        "POST",
        f"/api/v1/chat/sessions/{session_id}/send",
        json={"message": "What is this?"}
    ) as response:
        assert response.status_code == 200
        
        events = []
        async for line in response.aiter_lines():
            if line.startswith("event:"):
                event_type = line.split("event: ")[1]
                events.append(event_type)
            elif line.startswith("data:"):
                data_str = line.split("data: ")[1]
                if data_str != "[DONE]":
                    try:
                        events.append(json.loads(data_str))
                    except json.JSONDecodeError:
                        pass
                    
        # Assert: Pastikan semua event penting dilempar
        assert "citations" in events
        assert "chunk" in events
        assert "metadata" in events
        assert "done" in events
        
        # Pastikan pesan user dan assistant disimpan ke DB
        assert mock_chat_service.add_message.call_count == 2