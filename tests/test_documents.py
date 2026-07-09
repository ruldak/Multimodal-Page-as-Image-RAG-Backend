import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import uuid
from datetime import datetime, timezone

@pytest.mark.asyncio
@patch("app.api.documents.process_document_task")
@patch("app.api.documents.doc_service")
async def test_upload_document_success(mock_doc_service, mock_celery_task, client, mock_db_session, tmp_path):
    # Arrange: Setup Mock Return Values
    fake_doc_id = uuid.uuid4()
    
    # FIX: Gunakan AsyncMock untuk method async
    mock_doc_service.create_document = AsyncMock(return_value={"id": fake_doc_id, "status": "pending"})
    mock_doc_service.update_task_id = AsyncMock()
    
    mock_task = MagicMock()
    mock_task.id = "fake-celery-task-id"
    mock_celery_task.delay.return_value = mock_task
    
    # Patch UPLOAD_DIR agar file dummy tidak tersimpan di folder project asli
    with patch("app.api.documents.UPLOAD_DIR", tmp_path):
        # Act
        dummy_pdf = b"%PDF-1.4 dummy content"
        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.pdf", dummy_pdf, "application/pdf")}
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["document_id"] == str(fake_doc_id)
        assert data["task_id"] == "fake-celery-task-id"
        assert data["status"] == "pending"
        
        # Pastikan service & celery dipanggil
        mock_doc_service.create_document.assert_called_once()
        mock_celery_task.delay.assert_called_once()

@pytest.mark.asyncio
@patch("app.api.documents.doc_service")
async def test_upload_document_invalid_mimetype(mock_doc_service, client, tmp_path):
    with patch("app.api.documents.UPLOAD_DIR", tmp_path):
        # Act: Upload file txt
        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.txt", b"plain text", "text/plain")}
        )
        # Assert
        assert response.status_code == 400
        assert "File must be a PDF" in response.json()["detail"]

@pytest.mark.asyncio
@patch("app.api.documents.doc_service")
async def test_list_documents(mock_doc_service, client, mock_db_session):
    # Arrange
    fake_items = [
        {
            "id": uuid.uuid4(),
            "filename": "doc1.pdf",
            "page_count": 5,
            "status": "indexed",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    # FIX: Gunakan AsyncMock
    mock_doc_service.list_documents = AsyncMock(return_value={
        "items": fake_items, "total": 1, "page": 1, "page_size": 20
    })
    
    # Act
    response = await client.get("/api/v1/documents")
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1