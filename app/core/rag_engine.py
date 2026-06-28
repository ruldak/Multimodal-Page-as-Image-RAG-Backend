import os
import logging
from typing import List, Dict, Any
from app.core.embedding import VoyageMultimodalEmbedding
from app.core.llm import GeminiMultimodalClient
from app.core.vector_store import LanceDBManager
from app.config import settings

logger = logging.getLogger(__name__)
DEFAULT_SYSTEM_PROMPT = "Answer based on the following document pages. Each page is an image."

class RAGEngine:
    def __init__(self, embedder: VoyageMultimodalEmbedding, llm_client: GeminiMultimodalClient):
        self.embedder = embedder
        self.llm = llm_client

    async def stream_chat(self, session_id: str, message: str, document_id: str, history: List[Dict[str, str]], top_k: int = None):
        if top_k is None: top_k = settings.DEFAULT_RETRIEVAL_TOP_K

        # 1. Embed & Retrieve
        query_vector = await self.embedder._aget_query_embedding(message)
        lancedb = LanceDBManager(uri=settings.LANCEDB_URI)
        results = lancedb.search(query_vector, document_id=document_id, top_k=top_k)

        image_paths, valid_results = [], []
        for r in (results or []):
            if os.path.exists(r["image_path"]):
                image_paths.append(r["image_path"])
                valid_results.append(r)

        # 2. Yield CITATIONS di awal
        citations = [{"page_number": r["page_number"], "image_path": r["image_path"], "score": r.get("score", 0.0)} for r in valid_results]
        yield {"type": "citations", "data": citations}

        # 3. Stream LLM
        prompt_tokens, candidates_tokens, total_tokens = 0, 0, 0
        
        async for chunk in self.llm.stream_from_images(
            query=message, image_paths=image_paths, history=history, system_prompt=DEFAULT_SYSTEM_PROMPT
        ):
            # Ambil teks delta (kata per kata)
            text = getattr(chunk, "delta", "") or ""
            if text:
                yield {"type": "chunk", "data": {"text": text}}

            # Coba ambil token usage dari chunk terakhir
            try:
                raw = getattr(chunk, "raw", None)
                if raw and hasattr(raw, "usage_metadata") and raw.usage_metadata:
                    usage = raw.usage_metadata
                    prompt_tokens = getattr(usage, "prompt_token_count", prompt_tokens) or prompt_tokens
                    candidates_tokens = getattr(usage, "candidates_token_count", candidates_tokens) or candidates_tokens
                    total_tokens = getattr(usage, "total_token_count", total_tokens) or total_tokens
            except Exception: pass

        # 4. Yield Metadata di akhir
        yield {"type": "metadata", "data": {
            "prompt_token_count": prompt_tokens,
            "candidates_token_count": candidates_tokens,
            "total_token_count": total_tokens
        }}