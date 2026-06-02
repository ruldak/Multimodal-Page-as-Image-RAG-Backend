import os
import time
import base64
from typing import List, Dict, Any, Optional
from app.core.embedding import VoyageMultimodalEmbedding
from app.core.llm import GeminiMultimodalClient
from app.core.vector_store import LanceDBManager
from app.config import settings
import logging

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = "Jawab berdasarkan halaman dokumen berikut. Setiap halaman adalah gambar."

class RAGEngine:
    """
    LlamaIndex-based RAG Engine for page-as-image multimodal retrieval.
    """
    def __init__(
        self,
        lancedb_manager: LanceDBManager,
        embedder: VoyageMultimodalEmbedding,
        llm_client: GeminiMultimodalClient
    ):
        self.lancedb = lancedb_manager
        self.embedder = embedder
        self.llm = llm_client

    async def chat(
        self,
        session_id: str,
        message: str,
        document_id: str,
        history: List[Dict[str, str]],
        top_k: int = None
    ) -> Dict[str, Any]:
        """
        End-to-end RAG chat:
        1. Embed query text
        2. Search LanceDB for relevant page images
        3. Call Gemini with images + query + history
        4. Return response text + citations
        """
        if top_k is None:
            top_k = settings.DEFAULT_RETRIEVAL_TOP_K

        # 1. Embed query
        logger.info(f"Embedding query for session {session_id}")
        query_vector = await self.embedder._aget_query_embedding(message)

        # 2. Retrieve page images from LanceDB
        logger.info(f"Searching LanceDB for document {document_id}, top_k={top_k}")
        results = self.lancedb.search(query_vector, document_id=document_id, top_k=top_k)

        if not results:
            logger.warning(f"No pages retrieved for document {document_id}")

        # Verify image paths exist
        image_paths = []
        valid_results = []
        for r in results:
            if os.path.exists(r["image_path"]):
                image_paths.append(r["image_path"])
                valid_results.append(r)
            else:
                logger.warning(f"Missing image file: {r['image_path']}")

        # 3. Generate with Gemini
        start_time = time.monotonic()
        response = await self.llm.generate_from_images(
            query=message,
            image_paths=image_paths,
            history=history,
            system_prompt=DEFAULT_SYSTEM_PROMPT
        )
        latency_ms = int((time.monotonic() - start_time) * 1000)

        # 4. Build citations
        citations = [
            {
                "page_number": r["page_number"],
                "image_path": r["image_path"],
                "score": r.get("score", 0.0),
            }
            for r in valid_results
        ]

        return {
            "text": response["text"],
            "prompt_token_count": response.get("prompt_token_count", 0),
            "candidates_token_count": response.get("candidates_token_count", 0),
            "total_token_count": response.get("total_token_count", 0),
            "latency_ms": latency_ms,
            "citations": citations,
        }
