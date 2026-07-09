import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
@patch("app.api.health.GeminiMultimodalClient")
@patch("app.api.health.VoyageMultimodalEmbedding")
@patch("app.api.health.redis")
@patch("app.api.health.LanceDBManager")
@patch("app.api.health.AsyncSessionLocal")
async def test_health_check_healthy(mock_session_local, mock_lance, mock_redis, mock_voyage, mock_gemini, client):
    # Arrange: Mock semua koneksi eksternal
    mock_db = MagicMock()
    # Mock context manager `async with AsyncSessionLocal() as db:`
    mock_db.__aenter__.return_value.execute.return_value = True
    mock_session_local.return_value = mock_db
    
    mock_lance.return_value = MagicMock()
    mock_redis.from_url.return_value.ping.return_value = True
    mock_voyage.return_value._get_text_embedding.return_value = [0.1]
    mock_gemini.return_value = MagicMock()
    
    # Act
    response = await client.get("/api/v1/health")
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["checks"]["postgresql"] == "ok"
    assert data["checks"]["redis"] == "ok"