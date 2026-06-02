import os
import base64
from typing import List, Dict, Any, Optional
from llama_index.llms.gemini import Gemini
from llama_index.core.base.llms.types import ChatMessage, MessageRole
from llama_index.core.schema import ImageNode
import google.generativeai as genai
import logging

logger = logging.getLogger(__name__)

class GeminiMultimodalClient:
    """
    Multimodal client wrapping llama-index-llms-gemini.
    Handles interleaved image+text prompts for page-as-image RAG.
    """
    def __init__(self, api_key: str, model: str = "models/gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model
        genai.configure(api_key=api_key)
        self._llm = Gemini(api_key=api_key, model_name=model)

    async def generate_from_images(
        self,
        query: str,
        image_paths: List[str],
        history: List[Dict[str, str]],
        system_prompt: str = "Jawab berdasarkan halaman dokumen berikut. Setiap halaman adalah gambar."
    ) -> Dict[str, Any]:
        """
        Build a multimodal prompt with system text, interleaved images+page labels,
        history, and current query. Call Gemini via google-generativeai SDK.
        """
        # Build contents for Gemini API
        contents = []

        # System prompt as first user message part
        parts = [{"text": system_prompt}]

        # Interleave images with page labels
        for idx, img_path in enumerate(image_paths):
            if not os.path.exists(img_path):
                logger.warning(f"Image path missing: {img_path}")
                continue
            with open(img_path, "rb") as f:
                img_bytes = f.read()
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            page_num = idx + 1  # fallback; caller should pass page_numbers if needed
            # Extract page number from filename if possible
            try:
                basename = os.path.basename(img_path)
                if "page_" in basename:
                    page_num = int(basename.split("page_")[1].split(".")[0])
            except Exception:
                pass

            parts.append({
                "inline_data": {
                    "mime_type": "image/png",
                    "data": b64
                }
            })
            parts.append({"text": f"[Halaman {page_num}]"})

        # Add history
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            # Map to Gemini roles: user/model
            gemini_role = "user" if role in ("user", "system") else "model"
            contents.append({
                "role": gemini_role,
                "parts": [{"text": content}]
            })

        # Add current query
        parts.append({"text": query})

        # The system+images+query go as one user turn
        contents.append({
            "role": "user",
            "parts": parts
        })

        try:
            model = genai.GenerativeModel(self.model)
            response = await model.generate_content_async(contents)

            # Extract token counts if available
            prompt_tokens = 0
            candidates_tokens = 0
            total_tokens = 0
            try:
                usage = response.usage_metadata
                prompt_tokens = usage.prompt_token_count
                candidates_tokens = usage.candidates_token_count
                total_tokens = usage.total_token_count
            except Exception:
                pass

            return {
                "text": response.text,
                "prompt_token_count": prompt_tokens,
                "candidates_token_count": candidates_tokens,
                "total_token_count": total_tokens,
            }
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            raise
