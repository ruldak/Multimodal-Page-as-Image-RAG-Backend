# API Specification - RAG Multimodal Backend

This document contains the complete API specification for the **Multimodal Page-as-Image RAG Backend**. The backend is built with FastAPI and supports visual-based document retrieval (Page-as-Image RAG) integrated with Voyage AI embedding models and Gemini LLM.

---

## 📌 General Information

*   **Base URL (Local/Development)**: `http://localhost:8000`
*   **Data Format**: `application/json` (Except for streaming endpoints which use `text/event-stream`)
*   **CORS**: Allowed for all origins (`allow_origins=["*"]`)
*   **Time Zone**: All date-time fields use ISO 8601 format with UTC (`YYYY-MM-DDTHH:MM:SSZ` or `+00:00`).

---

## 🛡️ Error Handling

The API returns standardized error formats to simplify client-side handling.

### Generic Error Response Format
```json
{
  "detail": "Detailed error message from the server"
}
```

### Specific Error Response Formats

1.  **412 Precondition Failed (Document Not Ready)**
    Occurs when trying to create a chat session or send a message using a document whose processing status is not `indexed`.
    ```json
    {
      "error": "Document not ready",
      "document_status": "pending" 
    }
    ```
    *(The `document_status` value can be: `pending`, `rendering`, `embedding`, or `failed`)*

2.  **502 Bad Gateway (Upstream API Error)**
    Occurs if an external API (Voyage AI or Gemini) encounters a failure or timeout.
    ```json
    {
      "error": "Upstream API failure",
      "detail": "Error description returned by Voyage/Gemini"
    }
    ```

3.  **500 Internal Server Error (Database / Server Error)**
    Occurs if there are issues with PostgreSQL, Redis, or internal server errors.
    ```json
    {
      "error": "Database error", // or "Internal server error"
      "detail": "Technical error detail (only active in development mode)"
    }
    ```

---

## 📂 1. Document Management

This group of endpoints is used to upload, view, monitor status, and delete PDF files that serve as the knowledge base for RAG.

### 1.1 Upload PDF
Uploads a PDF file to be processed asynchronously (split into page images and indexed into LanceDB).

*   **Endpoint**: `/api/v1/documents/upload`
*   **Method**: `POST`
*   **Content-Type**: `multipart/form-data`
*   **Request Body**:
    *   `file` (file, required): The PDF file to upload. The default maximum size limit is **50MB** (`52,428,800` bytes). *The file content type must be `application/pdf`*.
*   **Successful Response (200 OK)**:
    ```json
    {
      "document_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "task_id": "b3e34a02-5e60-49ad-8032-68b6d8a39a7b",
      "status": "pending",
      "message": "Document queued for processing"
    }
    ```
*   **Potential Errors**:
    *   `400 Bad Request`: The uploaded file is not a PDF.
    *   `413 Payload Too Large`: The file size exceeds the 50MB limit.
    *   `500 Internal Server Error`: Failed to save the file on the server or write initial metadata to the database.

---

### 1.2 List Documents
Retrieves a list of documents in the system with pagination.

*   **Endpoint**: `/api/v1/documents`
*   **Method**: `GET`
*   **Query Parameters**:
    *   `skip` (int, optional, default: `0`): The number of items to skip.
    *   `limit` (int, optional, default: `20`): The maximum number of items per page.
*   **Successful Response (200 OK)**:
    ```json
    {
      "items": [
        {
          "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "filename": "q3_financial_report.pdf",
          "page_count": 12,
          "status": "indexed",
          "created_at": "2026-07-04T12:00:00.000Z",
          "updated_at": "2026-07-04T12:05:00.000Z"
        }
      ],
      "total": 1,
      "page": 1,
      "page_size": 20
    }
    ```

---

### 1.3 Get Document Details
Gets complete metadata of a document, including the list of rendered page images.

*   **Endpoint**: `/api/v1/documents/{document_id}`
*   **Method**: `GET`
*   **Path Parameters**:
    *   `document_id` (UUID, required): The ID of the document.
*   **Successful Response (200 OK)**:
    ```json
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "filename": "q3_financial_report.pdf",
      "file_path": "/app/uploads/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d_q3_financial_report.pdf",
      "page_count": 2,
      "status": "indexed",
      "pages": [
        {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "page_number": 1,
          "image_path": "/app/data/pages/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/page_1.png",
          "render_dpi": 150,
          "file_size_kb": 245
        },
        {
          "id": "f8e7d6c5-b4a3-2f1e-0d9c-8b7a6f5e4d3c",
          "page_number": 2,
          "image_path": "/app/data/pages/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/page_2.png",
          "render_dpi": 150,
          "file_size_kb": 312
        }
      ],
      "created_at": "2026-07-04T12:00:00.000Z"
    }
    ```
*   **Potential Errors**:
    *   `404 Not Found`: Document not found.

---

### 1.4 Get Document Processing Status
Checks the background processing status of a document (Celery task). This is useful for the frontend to poll while the document transitions from `pending` to `indexed`.

*   **Endpoint**: `/api/v1/documents/{document_id}/status`
*   **Method**: `GET`
*   **Path Parameters**:
    *   `document_id` (UUID, required): The ID of the document.
*   **Successful Response (200 OK)**:
    ```json
    {
      "document_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "status": "indexed",
      "task": {
        "task_state": "SUCCESS",
        "task_result": {
          "status": "success",
          "pages_processed": 2
        }
      },
      "created_at": "2026-07-04T12:00:00.000Z"
    }
    ```
    > [!NOTE]
    > The main `status` of a document can be:
    > - `pending`: Document is newly uploaded and placed in the Celery queue.
    > - `rendering`: Document pages are being split and rendered as image files (PNG).
    > - `embedding`: Page images are being embedded to generate visual vectors (Voyage AI).
    > - `indexed`: Document is fully indexed in LanceDB and ready for chat sessions.
    > - `failed`: An error occurred during file processing.

---

### 1.5 Delete Document
Deletes the original PDF file, rendered page images, vectors in LanceDB, and related records in PostgreSQL.

*   **Endpoint**: `/api/v1/documents/{document_id}`
*   **Method**: `DELETE`
*   **Path Parameters**:
    *   `document_id` (UUID, required): The ID of the document to delete.
*   **Successful Response (204 No Content)**:
    *(Returns no response body)*
*   **Potential Errors**:
    *   `404 Not Found`: Document not found.

---

## 💬 2. Chat & RAG Session Management

This group of endpoints handles interactive conversations powered by RAG on a selected document.

### 2.1 Create Chat Session
Creates a new conversation session. The session can be bound to a document (`document_id`) for RAG mode, or remain unbound (null) for general chat.

*   **Endpoint**: `/api/v1/chat/sessions`
*   **Method**: `POST`
*   **Request Body**:
    ```json
    {
      "document_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", // UUID (optional, null for general chat)
      "title": "Q3 Financial Analysis" // String (optional, a default title will be generated if omitted)
    }
    ```
*   **Successful Response (201 Created)**:
    ```json
    {
      "id": "e4f8d227-6f8d-42bc-9d0a-115f212bcde8",
      "document_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "title": "Q3 Financial Analysis",
      "created_at": "2026-07-04T12:10:00.000Z"
    }
    ```
*   **Potential Errors**:
    *   `404 Not Found`: The document provided in `document_id` was not found in the database.

---

### 2.2 List Chat Sessions
Retrieves all historical chat sessions.

*   **Endpoint**: `/api/v1/chat/sessions`
*   **Method**: `GET`
*   **Successful Response (200 OK)**:
    ```json
    {
      "items": [
        {
          "id": "e4f8d227-6f8d-42bc-9d0a-115f212bcde8",
          "document_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "title": "Q3 Financial Analysis",
          "message_count": 4,
          "created_at": "2026-07-04T12:10:00.000Z"
        }
      ]
    }
    ```

---

### 2.3 Get Chat Session Details & History
Gets complete details of a chat session along with its historical messages (sorted chronologically).

*   **Endpoint**: `/api/v1/chat/sessions/{session_id}`
*   **Method**: `GET`
*   **Path Parameters**:
    *   `session_id` (UUID, required): The ID of the chat session.
*   **Successful Response (200 OK)**:
    ```json
    {
      "id": "e4f8d227-6f8d-42bc-9d0a-115f212bcde8",
      "document_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "title": "Q3 Financial Analysis",
      "messages": [
        {
          "id": "7864f1d4-890a-4b68-b7ab-1823ab4980de",
          "role": "user",
          "content": "What is our total revenue in Q3 according to the chart?",
          "sources": [],
          "model": null,
          "latency_ms": null,
          "created_at": "2026-07-04T12:11:00.000Z"
        },
        {
          "id": "99ee45b2-3c2d-4bfb-88c9-026cc3a1197a",
          "role": "assistant",
          "content": "Based on the chart on page 2, the total revenue in Q3 is $1.2 Million, showing a 15% increase compared to Q2.",
          "sources": [
            {
              "page_number": 2,
              "image_path": "/app/data/pages/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/page_2.png",
              "score": 0.8845
            }
          ],
          "model": "gemini-2.5-flash",
          "latency_ms": 1450,
          "created_at": "2026-07-04T12:11:02.000Z"
        }
      ]
    }
    ```
*   **Potential Errors**:
    *   `404 Not Found`: Chat session not found.

---

### 2.4 Send Message & Stream Answer (SSE Stream)
The primary endpoint for AI interaction. Accepts user questions, searches for relevant PDF pages in LanceDB, retrieves the matching page images, and forwards them to Gemini LLM. The response content is streamed back in real-time using Server-Sent Events (SSE).

*   **Endpoint**: `/api/v1/chat/sessions/{session_id}/send`
*   **Method**: `POST`
*   **Content-Type**: `application/json`
*   **Request Body**:
    ```json
    {
      "message": "What is the net profit of the company?"
    }
    ```
*   **Successful Response (200 OK)**:
    *   Returns `Content-Type: text/event-stream`.
    *   The response consists of a series of text blocks (events) sent gradually.

#### 📡 SSE Event Stream Flow
The following events are dispatched sequentially:

1.  **`event: citations`** (Dispatched first, immediately after the vector search completes)
    Contains the list of PDF pages identified as relevant and used as query context for the LLM.
    *   **Data format**: JSON Array
    *   **Payload**:
        ```
        event: citations
        data: [{"page_number": 2, "image_path": "/app/data/pages/9b1deb4d.../page_2.png", "score": 0.8924}]
        ```

2.  **`event: chunk`** (Dispatched repeatedly)
    Contains partial text response chunks from the LLM in real-time (allowing typewriter effects).
    *   **Data format**: JSON Object
    *   **Payload**:
        ```
        event: chunk
        data: {"text": "The net "}

        event: chunk
        data: {"text": "profit is "}
        ```

3.  **`event: metadata`** (Dispatched once, after the LLM completes generation)
    Contains performance statistics, token count usage details, and the assistant's message ID saved in the DB.
    *   **Data format**: JSON Object
    *   **Payload**:
        ```
        event: metadata
        data: {"total_token_count": 820, "prompt_tokens": 700, "candidates_tokens": 120, "latency_ms": 1820, "message_id": "99ee45b2-3c2d-4bfb-88c9-026cc3a1197a"}
        ```

4.  **`event: done`** (Stream completion marker)
    Signals that the streaming connection has completed and can be closed safely.
    *   **Data format**: Plain string
    *   **Payload**:
        ```
        event: done
        data: [DONE]
        ```

5.  **`event: error`** (Dispatched only if a failure occurs during streaming)
    *   **Data format**: JSON Object
    *   **Payload**:
        ```
        event: error
        data: {"detail": "Upstream service error"}
        ```

*   **Potential Errors (Before Stream Starts)**:
    *   `404 Not Found`: Session not found OR the attached document record has been deleted.
    *   `412 Precondition Failed`: The attached document has not reached the `indexed` state yet.

---

### 2.5 Delete Chat Session
Deletes the chat session and all its message records from the database.

*   **Endpoint**: `/api/v1/chat/sessions/{session_id}`
*   **Method**: `DELETE`
*   **Path Parameters**:
    *   `session_id` (UUID, required): The ID of the chat session.
*   **Successful Response (204 No Content)**:
    *(Returns no response body)*
*   **Potential Errors**:
    *   `404 Not Found`: Chat session not found.

---

## 🏥 3. Health Check

Used by the frontend or DevOps monitoring to verify the active health status of backend infrastructure components (PostgreSQL, Redis, LanceDB, Voyage API, and Gemini API).

*   **Endpoint**: `/api/v1/health`
*   **Method**: `GET`
*   **Successful Response (200 OK - Healthy)**:
    ```json
    {
      "status": "healthy",
      "checks": {
        "postgresql": "ok",
        "lancedb": "ok",
        "redis": "ok",
        "voyage_api": "ok",
        "gemini_api": "ok"
      },
      "timestamp": "2026-07-04T12:00:00.000Z"
    }
    ```
*   **Unhealthy Response (503 Service Unavailable)**:
    Returned if any backend service health check fails.
    ```json
    {
      "status": "unhealthy",
      "checks": {
        "postgresql": "ok",
        "lancedb": "ok",
        "redis": "error",
        "voyage_api": "ok",
        "gemini_api": "ok"
      },
      "timestamp": "2026-07-04T12:00:00.000Z"
    }
    ```

---

## 🛠️ 4. Frontend Integration Guide

### 4.1 Consuming the SSE Stream with JavaScript
Since FastAPI yields custom events (`citations`, `chunk`, etc.) and requires a `POST` request, standard browser `new EventSource()` calls cannot be used directly (as they only support `GET`). The frontend must use the `fetch` API alongside a `ReadableStream` reader.

Here is an example client implementation to consume the stream:

```javascript
async function sendChatMessage(sessionId, userMessage) {
  const baseUrl = "http://localhost:8000";
  
  try {
    const response = await fetch(`${baseUrl}/api/v1/chat/sessions/${sessionId}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: userMessage })
    });

    if (!response.ok) {
      const errPayload = await response.json();
      throw new Error(errPayload.detail || "Failed to send message");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode bytes chunk to string and append to buffer
      buffer += decoder.decode(value, { stream: true });
      
      // Split buffer by double newlines (SSE event delimiter)
      const events = buffer.split("\n\n");
      
      // Save the last partial event back to the buffer
      buffer = events.pop();

      for (const rawEvent of events) {
        if (!rawEvent.trim()) continue;
        
        // Parse event type and data
        const lines = rawEvent.split("\n");
        let eventType = "message";
        let dataStr = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith("data:")) {
            dataStr += line.substring(5).trim();
          }
        }

        if (!dataStr) continue;

        try {
          if (eventType === "done" || dataStr === "[DONE]") {
            console.log("Streaming finished successfully!");
            break;
          }

          const parsedData = JSON.parse(dataStr);

          // Handle incoming event types
          switch (eventType) {
            case "citations":
              // Show referenced page thumbnails (usually at the top of the chat area)
              console.log("Citations received:", parsedData);
              // Format: Array of { page_number, image_path, score }
              break;
              
            case "chunk":
              // Append text chunk directly to assistant's chat bubble
              console.log("New text chunk:", parsedData.text);
              break;
              
            case "metadata":
              // Save statistics or transaction details if required
              console.log("Metadata:", parsedData);
              break;
              
            case "error":
              console.error("Stream Error:", parsedData.detail);
              break;
          }
        } catch (parseError) {
          console.error("Failed to parse SSE JSON payload:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Error during streaming chat:", error);
  }
}
```

### 4.2 Handling Page Image Access (Static Asset Handling)
In the API responses (e.g. `DocumentOut` schemas and the `citations` events), the `image_path` field returns absolute paths in the backend file system:
`"image_path": "/app/data/pages/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/page_1.png"`

To enable the frontend to load these assets inside `<img src="...">` tags, ensure that appropriate asset resolution is configured in the deployment environment:

1.  **FastAPI Static Mounting (Development)**
    For local development, request the backend engineer to mount the `/app/data/` folder as a static files directory in FastAPI:
    ```python
    from fastapi.staticfiles import StaticFiles
    app.mount("/data", StaticFiles(directory="/app/data"), name="data")
    ```
    Then, replace the leading prefix on the client side:
    Replace: `/app/data/pages/doc_id/page_1.png`
    With: `http://localhost:8000/data/pages/doc_id/page_1.png`

2.  **Nginx Reverse Proxy Configuration (Production)**
    In production environments, mount the `/app/data/pages/` folder into a shared volume and let Nginx serve the static assets directly:
    ```nginx
    location /data/pages/ {
        alias /app/data/pages/;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }
    ```
    This way, the client can fetch images directly using the main API host.
