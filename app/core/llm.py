import os
import base64
from typing import List, Dict, Any, Optional
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.core.llms import ChatMessage, TextBlock, ImageBlock
from google.genai import types
import logging

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = "Jawab berdasarkan halaman dokumen berikut. Setiap halaman adalah gambar."


class GeminiMultimodalClient:
    """
    Multimodal client using llama-index-llms-google-genai (latest).
    Handles interleaved image+text prompts for page-as-image RAG.
    """
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.5-flash",
    ):
        self.api_key = api_key
        self.model = model
        self._llm = GoogleGenAI(
            model=model,
            api_key=api_key,
        )

    async def generate_from_images(
        self,
        query: str,
        image_paths: List[str],
        history: List[Dict[str, str]],
        system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    ) -> Dict[str, Any]:
        """
        Build a multimodal prompt with system text, interleaved images+page labels,
        history, and current query. Call Gemini via GoogleGenAI.
        """
        # Build blocks for current turn: system + images + query
        blocks = [TextBlock(text=system_prompt)]

        for img_path in image_paths:
            if not os.path.exists(img_path):
                logger.warning(f"Image path missing: {img_path}")
                continue

            # Extract page number from filename
            page_num = 0
            try:
                basename = os.path.basename(img_path)
                if "page_" in basename:
                    page_num = int(basename.split("page_")[1].split(".")[0])
            except Exception:
                pass

            blocks.append(ImageBlock(path=img_path, image_mimetype="image/png"))
            blocks.append(TextBlock(text=f"[Halaman {page_num}]"))

        blocks.append(TextBlock(text=query))

        # Build ChatMessage list from history
        messages = []
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append(ChatMessage(role="user", content=content))
            elif role == "assistant":
                messages.append(ChatMessage(role="assistant", content=content))

        # Add current turn with images
        messages.append(ChatMessage(role="user", blocks=blocks))

        try:
            response = await self._llm.achat(messages)

            # Extract token counts from raw response if available
            prompt_tokens = 0
            candidates_tokens = 0
            total_tokens = 0
            try:
                raw = response.raw
                if hasattr(raw, "usage_metadata"):
                    usage = raw.usage_metadata
                    prompt_tokens = getattr(usage, "prompt_token_count", 0)
                    candidates_tokens = getattr(usage, "candidates_token_count", 0)
                    total_tokens = getattr(usage, "total_token_count", 0)
            except Exception:
                pass

            return {
                "text": response.message.content,
                "prompt_token_count": prompt_tokens,
                "candidates_token_count": candidates_tokens,
                "total_token_count": total_tokens,
            }

        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            raise
