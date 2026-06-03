import os
import base64
import asyncio
from typing import List, Dict, Any, Optional
from llama_index.core.base.embeddings.base import BaseEmbedding
from llama_index.core.bridge.pydantic import Field
import voyageai
import logging
from PIL import Image

logger = logging.getLogger(__name__)

class VoyageMultimodalEmbedding(BaseEmbedding):
    """
    LlamaIndex-compatible multimodal embedder using Voyage AI.
    Wraps voyageai SDK for both text and image embeddings.
    """
    api_key: str = Field(default="")
    model: str = Field(default="voyage-multimodal-3.5")

    def __init__(self, api_key: Optional[str] = None, model: str = "voyage-multimodal-3.5", **kwargs):
        # Handle both explicit api_key and from kwargs
        if api_key is None:
            api_key = kwargs.pop("api_key", "")
        super().__init__(api_key=api_key, model=model, **kwargs)
        self._client = voyageai.Client(api_key=self.api_key)

    @classmethod
    def class_name(cls) -> str:
        return "VoyageMultimodalEmbedding"

    def _get_text_embedding(self, text: str) -> List[float]:
        """Sync text embedding."""
        try:
            result = self._client.multimodal_embed(
                inputs=[[text]],
                model=self.model
            )
            return result.embeddings[0]
        except Exception as e:
            logger.error(f"Voyage text embedding failed: {e}")
            raise

    async def _aget_text_embedding(self, text: str) -> List[float]:
        """Async text embedding."""
        return await asyncio.to_thread(self._get_text_embedding, text)

    def _get_query_embedding(self, query: str) -> List[float]:
        return self._get_text_embedding(query)

    async def _aget_query_embedding(self, query: str) -> List[float]:
        return await self._aget_text_embedding(query)

    def get_image_embedding(self, image_path: str) -> List[float]:
        """Sync image embedding via PIL."""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")

        pil_image = Image.open(image_path)

        try:
            result = self._client.multimodal_embed(
                inputs=[[pil_image]],
                model=self.model
            )
            return result.embeddings[0]
        except Exception as e:
            logger.error(f"Voyage image embedding failed for {image_path}: {e}")
            raise

    async def aget_image_embedding(self, image_path: str) -> List[float]:
        """Async image embedding."""
        return await asyncio.to_thread(self.get_image_embedding, image_path)

    def embed_images(self, image_paths: List[str]) -> List[List[float]]:
        """Batch embed images."""
        results = []
        for path in image_paths:
            results.append(self.get_image_embedding(path))
        return results

    async def aembed_images(self, image_paths: List[str]) -> List[List[float]]:
        """Async batch embed images."""
        tasks = [self.aget_image_embedding(path) for path in image_paths]
        return await asyncio.gather(*tasks)
