import pytest
from fastapi.testclient import TestClient
from io import BytesIO

class TestDocumentUpload:
    def test_upload_pdf(self, test_client):
        pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n147\n%%EOF"

        response = test_client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.pdf", BytesIO(pdf_bytes), "application/pdf")}
        )
        assert response.status_code == 200
        data = response.json()
        assert "document_id" in data
        assert data["status"] == "pending"

    def test_upload_non_pdf(self, test_client):
        response = test_client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.txt", BytesIO(b"not a pdf"), "text/plain")}
        )
        assert response.status_code == 400

class TestDocumentList:
    def test_list_documents(self, test_client):
        response = test_client.get("/api/v1/documents")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
