# RAG Multimodal Backend (Page-as-Image)

Backend API untuk Conversational Multimodal RAG dengan pendekatan Page-as-Image.

## Arsitektur

- **FastAPI** - API Framework
- **LlamaIndex** - RAG Orchestration
- **Voyage-multimodal-3.5** - Image + Text Embedding
- **Gemini 1.5 Flash** - Multimodal LLM Generation
- **LanceDB** - Vector Store (local file)
- **PostgreSQL** - Metadata & Session Store
- **Celery + Redis** - Background Task Queue
- **pdf2image + Poppler** - PDF Rendering

## Quick Start

### 1. Setup Environment

```bash
cp .env.example .env
# Edit .env dengan API keys Anda
```

### 2. Run dengan Docker Compose

```bash
docker-compose up --build
```

### 3. Run Migrations

```bash
docker-compose exec api alembic upgrade head
```

### 4. API Endpoints

- `POST /api/v1/documents/upload` - Upload PDF
- `GET /api/v1/documents` - List documents
- `GET /api/v1/documents/{id}` - Get document detail
- `GET /api/v1/documents/{id}/status` - Check processing status
- `DELETE /api/v1/documents/{id}` - Delete document
- `POST /api/v1/chat/sessions` - Create chat session
- `GET /api/v1/chat/sessions` - List sessions
- `GET /api/v1/chat/sessions/{id}` - Get session with messages
- `POST /api/v1/chat/sessions/{id}/send` - Send message (RAG)
- `DELETE /api/v1/chat/sessions/{id}` - Delete session
- `GET /api/v1/health` - Health check

## Development

### Run API only
```bash
uvicorn app.main:app --reload
```

### Run Celery Worker
```bash
celery -A tasks.celery_app worker --loglevel=info --concurrency=1
```

### Run Tests
```bash
pytest tests/ -v
```

## Tech Stack Details

| Layer | Technology |
|-------|-----------|
| API | FastAPI 0.111.0 |
| RAG Framework | LlamaIndex 0.10.45 |
| Vector Store | LanceDB 0.8.0 + llama-index-vector-stores-lancedb |
| Embedding | voyage-multimodal-3.5 via llama-index-embeddings-voyageai |
| LLM | Gemini 1.5 Flash via llama-index-llms-gemini + google-generativeai |
| PDF Render | pdf2image 1.17.0 + Poppler |
| Database | PostgreSQL 15 + SQLAlchemy 2.0.30 + asyncpg |
| Migrations | Alembic |
| Tasks | Celery 5.4.0 + Redis 7 |
| Settings | pydantic-settings 2.2.0 |

## Notes

- Worker concurrency diset ke **1** karena LanceDB single-writer constraint.
- Semua API eksternal menggunakan SDK resmi (voyageai, google-generativeai) melalui wrapper LlamaIndex.
- Page images disimpan sebagai file PNG di `/app/data/pages/{document_id}/`.
