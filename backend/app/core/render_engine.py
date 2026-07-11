import os
import gc
import logging
from pathlib import Path
from typing import List, Dict, Any
from pdf2image import convert_from_path, pdfinfo_from_path
from PIL import Image

logger = logging.getLogger(__name__)

def render_pdf_pages(
    pdf_path: str,
    output_dir: str,
    dpi: int = 150,
    fmt: str = "png",
    chunk_size: int = 10
) -> List[Dict[str, Any]]:
    """
    Render PDF pages to images with improved memory management (chunking).
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    
    os.makedirs(output_dir, exist_ok=True)
    logger.info(f"DEBUG: output_dir = {output_dir}")

    try:
        pdf_info = pdfinfo_from_path(pdf_path)
        total_pages = pdf_info["Pages"]
    except Exception as e:
        raise RuntimeError(f"Failed to read PDF info (is poppler installed?): {e}")

    pages = []
    
    for start_page in range(1, total_pages + 1, chunk_size):
        end_page = min(start_page + chunk_size - 1, total_pages)
        logger.info(f"Rendering pages {start_page} to {end_page}...")
        
        try:
            images = convert_from_path(
                pdf_path, 
                dpi=dpi, 
                fmt=fmt, 
                first_page=start_page, 
                last_page=end_page
            )
        except Exception as e:
            raise RuntimeError(f"pdf2image failed: {e}")
            
        for i, image in enumerate(images, start=start_page):
            image_path = os.path.join(output_dir, f"page_{i}.{fmt}")
            image.save(image_path, fmt.upper())
            
            file_size_kb = os.path.getsize(image_path) // 1024
            pages.append({
                "page_number": i,
                "image_path": os.path.abspath(image_path),
                "file_size_kb": file_size_kb,
                "render_dpi": dpi,
            })

        del images
        gc.collect()

    logger.info(f"Rendered {len(pages)} pages from {pdf_path} to {output_dir}")
    return pages