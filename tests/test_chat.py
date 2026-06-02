import pytest
from fastapi.testclient import TestClient

class TestChatSession:
    def test_create_session(self, test_client):
        response = test_client.post(
            "/api/v1/chat/sessions",
            json={"title": "Test Session"}
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["title"] == "Test Session"

    def test_list_sessions(self, test_client):
        response = test_client.get("/api/v1/chat/sessions")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    def test_send_message_no_session(self, test_client):
        response = test_client.post(
            "/api/v1/chat/sessions/nonexistent/send",
            json={"message": "Hello"}
        )
        assert response.status_code == 404
