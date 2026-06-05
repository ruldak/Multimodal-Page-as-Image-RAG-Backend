# Multimodal Page-as-Image RAG Backend

An enterprise-ready, high-performance asynchronous REST API for Conversational Multimodal Retrieval-Augmented Generation (RAG) using the **Page-as-Image** paradigm. 

Built with **FastAPI**, **LlamaIndex**, **Voyage AI**, **Gemini 1.5/2.5 Flash**, **LanceDB**, and **Celery**, this system indexes PDF documents by rendering every page as a high-resolution image and embedding it directly. This bypasses the typical text extraction bottlenecks of standard RAG (e.g., losing tables, diagrams, formatting, and mathematical equations) by treating document pages visually.

---

## 💡 What is "Page-as-Image" Multimodal RAG? (Layman-Friendly)

### The Problem with Traditional RAG
When you upload a PDF to a traditional chat system (like a standard PDF chatbot), the computer tries to read it by converting the document to plain text. If your document has:
- **Financial charts and bar graphs**
- **Complex tables and cell alignments**
- **Mathematical equations and scientific symbols**
- **Flowcharts, diagrams, or images**

...a traditional system will either completely ignore them or read them as garbled text, losing crucial context.

### The "Page-as-Image" Solution
Instead of parsing PDFs as plain text, this project takes a visual approach:
1. **Take a Picture**: The system splits your PDF and renders each page into a high-quality image (like a screenshot).
2. **Visual Memory**: It runs these screenshots through Voyage AI's multimodal embedding model to create "visual descriptions" (vectors) of each page.
3. **Smart Search**: When you ask a question (e.g., *"Show me the trend of revenue in Q3"*), it searches these visual descriptions to find the pages that contain the answer.
4. **Visual Synthesis**: It retrieves the actual images of the matching pages and passes them directly to Google's **Gemini** (a multimodal model that has "eyes"). Gemini looks at the page layout, charts, and tables to write a highly accurate answer, complete with page citations!

---

## 🏗️ System Architecture & Data Flow

Below is the end-to-end architecture showing the separation of concerns between the **Asynchronous Ingestion Pipeline** (handled in background workers) and the **RAG Query Pipeline** (handled in FastAPI):

```mermaid
graph TD
    subgraph IngestionPipeline["Asynchronous Ingestion (Celery & Redis)"]
        A[User Uploads PDF] -->|FastAPI saves PDF| B[Create Pending DB Record]
        B -->|Enqueue Job| C[Celery Task Queue via Redis]
        C -->|1. Render PDF| D[Poppler & pdf2image render pages to PNG]
        D -->|2. Generate Embeddings| E[Voyage Multimodal 3.5 API]
        E -->|3. Store Vectors| F[LanceDB Vector Database]
        E -->|4. Store Metadata| G[PostgreSQL Database]
        G -->|Status = indexed| H[Document Ready for RAG]
    end

    subgraph QueryPipeline["Conversational Multimodal RAG"]
        I[User Sends Query / Chat] -->|FastAPI| J[Fetch Chat Session & History]
        J -->|Embed Text Query| K[Voyage Text Embedder]
        K -->|Vector Search| L[LanceDB Similarity Match]
        L -->|Fetch Top-K Page Images| M[Retrieve Page Screenshot Paths]
        M -->|Construct Prompt with Images + Context + History| N[Gemini Multimodal Client]
        N -->|Generate Answer| O[Process Token Usage & Latency]
        O -->|Save Message & Citations| P[PostgreSQL Metadata & History]
        P -->|Return Response| Q[User Chat UI]
    end
```

---

## 🛠️ Tech Stack & Engineering Decisions

| Component | Technology | Rationale & Engineering Details |
|---|---|---|
| **API Framework** | **FastAPI** `0.136.3` | High performance, fully asynchronous (using `async/await`), automatic OpenAPI documentation generation, and native integration with modern Python async database libraries. |
| **Orchestration** | **LlamaIndex** `0.14.22` | Industry-standard LLM and vector store interface wrapper, easing integration of Voyage AI, Gemini, and LanceDB. |
| **Vector Store** | **LanceDB** `0.33.0` | Serverless, disk-based vector database. Offers lightning-fast cosine similarity search on local file structures. Index creation is deferred until initial data ingestion to bypass empty-table schema constraints. |
| **Embeddings** | **Voyage Multimodal 3.5** | Top-performing multimodal embedding model. Projects both text queries and raw images (represented as PIL images) into the same shared `1024-dimensional` vector space. |
| **LLM Model** | **Gemini 1.5 / 2.5 Flash** | Chosen for its massive context window, exceptional multimodal (image + text) performance, low latency, and native support for interleaved image and text inputs via the official `google-genai` SDK. |
| **Metadata Store** | **PostgreSQL** | Relational store for sessions, chat messages, page metadata, and citation tracking. Interfaced using **SQLAlchemy 2.0** (Async API) and mapped with **Alembic** migrations. |
| **Background Tasks** | **Celery** + **Redis** | Decouples heavy rendering (pdf2image) and batch embedding operations from the API event loop. Concurrency is limited to **1** due to LanceDB's single-writer locking constraints. |
| **PDF Rendering** | **pdf2image** + **Poppler** | Compiles PDFs into high-fidelity rasterized PNG images at configurable DPI resolution, optimizing them for visual comprehension by the embedding model. |

---

## 🚀 Key Technical Highlights

- **Asynchronous Design**: The entire API layer is non-blocking. Database operations are handled using SQLAlchemy's async interface (`asyncpg` adapter), and long-running PDF parsing is delegated to Celery.
- **LanceDB Concurrency Handling**: Configured with a Celery concurrency limits mechanism (`concurrency=1` on writing tasks) to prevent DB locking issues.
- **Deferred Indexing**: Prevents vector store errors by waiting to call LanceDB's `create_index` until data exists in the table.
- **Stateful Conversational Memory**: Manages chat sessions in PostgreSQL, keeping track of preceding messages and injecting context dynamically into Gemini's multi-turn conversational interface.
- **Robust Exception Handling**: Global HTTP handlers manage upstream API failures (Gemini/Voyage), database errors, and document-readiness states, returning clean JSON payloads.

---

## 📂 Project Structure

```
├── app/
│   ├── api/               # API Router endpoints (documents, chat, health)
│   ├── core/              # Core logic wrappers (embedding, llm, rag_engine, vector_store, render_engine)
│   ├── db/                # PostgreSQL session config and base models
│   ├── models/            # SQLAlchemy database models & Pydantic schemas
│   ├── services/          # Business logic separation layer (document & chat services)
│   ├── main.py            # FastAPI Application Entrypoint
│   └── config.py          # Configuration management via Pydantic settings
├── tasks/
│   ├── celery_app.py      # Celery task manager entrypoint
│   └── document_tasks.py  # Background workers for document rendering & indexing
├── alembic/               # Database migrations scripts
├── tests/                 # Integration and unit tests
├── Dockerfile             # Production-grade multi-stage Docker build
└── docker-compose.yml     # Local orchestration for API, Redis, Celery, Postgres
```

---

## 🏁 Quick Start & Setup

### Prerequisites
- Docker & Docker Compose installed.
- Voyage AI API Key ([Voyage AI](https://www.voyageai.com/)).
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/)).

### 1. Setup Environment Variables
Clone the `.env.example` template into `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your API keys:
```env
VOYAGE_API_KEY=your_voyage_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Launch Services with Docker
Run the entire service stack (FastAPI web server, Celery worker, Redis queue, PostgreSQL database, and LanceDB volume mount):
```bash
docker-compose up --build
```

### 3. Run Database Migrations
Initialize the schema and tables in the PostgreSQL container:
```bash
docker-compose exec api alembic upgrade head
```

---

## 📡 API Endpoints Reference

### Document Management
- `POST /api/v1/documents/upload` - Upload PDF and trigger asynchronous rendering/indexing task.
- `GET /api/v1/documents` - Fetch paginated list of uploaded documents and processing states.
- `GET /api/v1/documents/{id}` - Get metadata, page references, and resolution.
- `GET /api/v1/documents/{id}/status` - Check if status is `pending`, `rendering`, `embedding`, `indexed`, or `failed`.
- `DELETE /api/v1/documents/{id}` - Remove file and purge vectors from LanceDB.

### Chat & Retrieval (RAG)
- `POST /api/v1/chat/sessions` - Open a chat session bound to a specific document ID.
- `GET /api/v1/chat/sessions` - Retrieve historical session list.
- `GET /api/v1/chat/sessions/{id}` - Fetch chat history (user/assistant) and citation links.
- `POST /api/v1/chat/sessions/{id}/send` - Submit a message. Runs query text embedding -> LanceDB retrieve page screenshot -> Gemini multimodal synthesis. Returns response content + tokens count + exact page source citations.
- `DELETE /api/v1/chat/sessions/{id}` - Delete session history.

---

## 🧪 Testing

To validate application stability and mock external API dependencies:
```bash
# Executed within the running docker container or local environment
pytest tests/ -v
```
