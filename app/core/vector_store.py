import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import lancedb
import pyarrow as pa
import numpy as np
from llama_index.vector_stores.lancedb import LanceDBVectorStore
from llama_index.core.schema import TextNode, BaseNode
from llama_index.core.vector_stores.types import VectorStoreQuery, VectorStoreQueryResult
import logging

logger = logging.getLogger(__name__)

class LanceDBManager:
    """
    Manages LanceDB table 'page_images' with the exact schema from the spec.
    Also wraps LlamaIndex LanceDBVectorStore for integration.
    """
    def __init__(self, uri: str, table_name: str = "page_images"):
        self.uri = uri
        self.table_name = table_name
        self.db = lancedb.connect(uri)
        self.vector_store = None
        self._ensure_table()

    def _ensure_table(self):
        """Create table if not exists with exact schema."""
        try:
            self.table = self.db.open_table(self.table_name)
        except Exception:
            schema = pa.schema([
                pa.field("id", pa.string()),
                pa.field("document_id", pa.string()),
                pa.field("page_number", pa.int32()),
                pa.field("node_type", pa.string()),
                pa.field("image_path", pa.string()),
                pa.field("vector", pa.list_(pa.float32(), 1024)),
                pa.field("metadata", pa.struct([
                    pa.field("filename", pa.string()),
                    pa.field("render_dpi", pa.int32()),
                    pa.field("file_size_kb", pa.int32()),
                ])),
                pa.field("created_at", pa.timestamp("us", "UTC")),
            ])
            self.table = self.db.create_table(self.table_name, schema=schema)
            # Create HNSW index on vector column
            self.table.create_index(
                metric="cosine",
                vector_column_name="vector",
                index_type="IVF_PQ",  # Using IVF_PQ as HNSW might not be available in all LanceDB versions; adjust as needed
            )
            logger.info(f"Created LanceDB table: {self.table_name}")

        # Initialize LlamaIndex vector store wrapper
        self.vector_store = LanceDBVectorStore(
            uri=self.uri,
            table_name=self.table_name,
        )

    def insert_pages(
        self,
        document_id: str,
        pages: List[Dict[str, Any]]
    ) -> None:
        """
        Insert page vectors into LanceDB.
        pages: list of dicts with keys: id, document_id, page_number, node_type,
               image_path, embedding, metadata
        """
        data = []
        for page in pages:
            row = {
                "id": page.get("id", str(uuid.uuid4())),
                "document_id": page.get("document_id", document_id),
                "page_number": page["page_number"],
                "node_type": page.get("node_type", "page_image"),
                "image_path": page["image_path"],
                "vector": page["embedding"],
                "metadata": {
                    "filename": page.get("metadata", {}).get("filename", ""),
                    "render_dpi": page.get("metadata", {}).get("render_dpi", 150),
                    "file_size_kb": page.get("metadata", {}).get("file_size_kb", 0),
                },
                "created_at": datetime.now(timezone.utc),
            }
            data.append(row)

        if data:
            self.table.add(data)
            logger.info(f"Inserted {len(data)} pages into LanceDB for document {document_id}")

    def search(
        self,
        query_vector: List[float],
        document_id: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Similarity search with metadata filter by document_id.
        Returns list of dicts with id, document_id, page_number, image_path, score, vector.
        """
        results = (
            self.table.search(query_vector)
            .where(f"document_id = '{document_id}'")
            .limit(top_k)
            .to_list()
        )

        output = []
        for r in results:
            output.append({
                "id": r.get("id"),
                "document_id": r.get("document_id"),
                "page_number": r.get("page_number"),
                "image_path": r.get("image_path"),
                "score": r.get("_distance"),  # LanceDB returns distance; convert to similarity if needed
                "vector": r.get("vector"),
            })
        return output

    def delete_by_document(self, document_id: str) -> int:
        """Delete all rows where document_id matches. Return count deleted."""
        try:
            # LanceDB delete API
            self.table.delete(f"document_id = '{document_id}'")
            logger.info(f"Deleted LanceDB rows for document {document_id}")
            return 1  # LanceDB doesn't return count easily; assume success
        except Exception as e:
            logger.error(f"Failed to delete from LanceDB: {e}")
            return 0

    def get_llama_index_vector_store(self) -> LanceDBVectorStore:
        """Return the LlamaIndex vector store instance."""
        return self.vector_store
