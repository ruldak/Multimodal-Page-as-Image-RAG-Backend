import os
import logging
from typing import List, Dict, Any
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.core.llms import ChatMessage, TextBlock, ImageBlock

logger = logging.getLogger(__name__)
DEFAULT_SYSTEM_PROMPT = "Answer based on the following document pages. Each page is an image."

class GeminiMultimodalClient:
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model
        self._llm = GoogleGenAI(model=model, api_key=api_key)

    def _build_messages(self, query: str, image_paths: List[str], history: List[Dict[str, str]], system_prompt: str):
        blocks = [TextBlock(text=system_prompt)]
        for img_path in image_paths:
            if not os.path.exists(img_path): continue
            page_num = 0
            try:
                basename = os.path.basename(img_path)
                if "page_" in basename:
                    page_num = int(basename.split("page_")[1].split(".")[0])
            except Exception: pass
            blocks.append(ImageBlock(path=img_path, image_mimetype="image/png"))
            blocks.append(TextBlock(text=f"[Page {page_num}]"))
        blocks.append(TextBlock(text=query))

        messages = []
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            messages.append(ChatMessage(role=role, content=content))
        messages.append(ChatMessage(role="user", blocks=blocks))
        return messages

    async def stream_from_images(self, query: str, image_paths: List[str], history: List[Dict[str, str]], system_prompt: str = DEFAULT_SYSTEM_PROMPT):
        messages = self._build_messages(query, image_paths, history, system_prompt)
        try:
            response_gen = await self._llm.astream_chat(messages)
            
            async for chunk in response_gen:
                yield chunk
        except Exception as e:
            logger.error(f"Gemini stream generation failed: {e}")
            raise