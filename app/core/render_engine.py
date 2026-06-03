import os
import base64
from pathlib import Path
from typing import List, Dict, Any
from pdf2image import convert_from_path
from PIL import Image
import logging

logger = logging.getLogger(__name__)

def render_pdf_pages(
    pdf_path: str,
    output_dir: str,
    dpi: int = 150,
    fmt: str = "png"
) -> List[Dict[str, Any]]:
    """
    Render PDF pages to images.
    Returns list of dicts with page_number, image_path, file_size_kb, render_dpi.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    os.makedirs(output_dir, exist_ok=True)
    logger.info(f"DEBUG: output_dir = {output_dir}")
    logger.info(f"DEBUG: output_dir exists = {os.path.exists(output_dir)}")

    try:
        images = convert_from_path(pdf_path, dpi=dpi, fmt=fmt)
    except Exception as e:
        raise RuntimeError(f"pdf2image failed (is poppler installed?): {e}")

    pages = []
    for i, image in enumerate(images, start=1):
        image_path = os.path.join(output_dir, f"page_{i}.{fmt}")
        logger.info(f"DEBUG: saving to {image_path}")
        image.save(image_path, fmt.upper())
        logger.info(f"DEBUG: saved, exists = {os.path.exists(image_path)}")
        file_size_kb = os.path.getsize(image_path) // 1024
        pages.append({
            "page_number": i,
            "image_path": os.path.abspath(image_path),
            "file_size_kb": file_size_kb,
            "render_dpi": dpi,
        })

    logger.info(f"Rendered {len(pages)} pages from {pdf_path} to {output_dir}")
    return pages
