import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import lancedb
import pyarrow as pa
import numpy as np
from llama_index.vector_stores.lancedb import LanceDBVectorStore
import logging

logger = logging.getLogger(__name__)

class LanceDBManager:
    """
    Manages LanceDB table 'page_images' with the exact schema from the spec.
    Index creation is deferred until first data insertion (empty table cannot have index).
    """
    def __init__(self, uri: str, table_name: str = "page_images"):
        self.uri = uri
        self.table_name = table_name
        self.db = lancedb.connect(uri)
        self.table: Optional[Any] = None
        self.vector_store = None
        self._index_created = False
        self._ensure_table()

    def _ensure_table(self):
        """Open existing table or create new one. Do NOT create index on empty table."""
        try:
            self.table = self.db.open_table(self.table_name)
            self._index_created = True  # Assume index exists if table exists
            logger.info(f"Opened existing LanceDB table: {self.table_name}")
        except Exception:
            logger.info(f"Creating new LanceDB table: {self.table_name}")
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
            self._index_created = False
            logger.info(f"Created LanceDB table: {self.table_name} (index deferred)")

        # Initialize LlamaIndex vector store wrapper
        try:
            self.vector_store = LanceDBVectorStore(
                uri=self.uri,
                table_name=self.table_name,
            )
        except Exception as e:
            logger.warning(f"LlamaIndex LanceDBVectorStore init failed: {e}")
            self.vector_store = None

    def _create_index_if_needed(self):
        """Create vector index only after data exists. Call after first insert."""
        if self._index_created or self.table is None:
            return
        try:
            self.table.create_index(
                metric="cosine",
                vector_column_name="vector",
            )
            self._index_created = True
            logger.info(f"Created vector index on {self.table_name}")
        except Exception as e:
            logger.warning(f"Could not create index: {e}")

    def insert_pages(
        self,
        document_id: str,
        pages: List[Dict[str, Any]]
    ) -> None:
        """
        Insert page vectors into LanceDB.
        Creates index after first insertion if table was previously empty.
        """
        if self.table is None:
            raise RuntimeError("LanceDB table not initialized")

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
            # Create index after first data insertion
            self._create_index_if_needed()

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
        if self.table is None:
            raise RuntimeError("LanceDB table not initialized")

        results = (
            self.table.search(query_vector)
            .where(f"document_id = '{document_id}'")
            .limit(top_k)
            .to_list()
        )

        output = []
        for r in results:
            distance = r.get("_distance", 0.0)
            score = 1.0 - distance

            output.append({
                "id": r.get("id"),
                "document_id": r.get("document_id"),
                "page_number": r.get("page_number"),
                "image_path": r.get("image_path"),
                "score": score,
                "vector": r.get("vector"),
            })
        return output

    def delete_by_document(self, document_id: str) -> int:
        """Delete all rows where document_id matches. Return count deleted."""
        if self.table is None:
            logger.warning("LanceDB table not initialized, skipping delete")
            return 0

        try:
            self.table.delete(f"document_id = '{document_id}'")
            logger.info(f"Deleted LanceDB rows for document {document_id}")
            return 1
        except Exception as e:
            logger.error(f"Failed to delete from LanceDB: {e}")
            return 0

    def get_llama_index_vector_store(self) -> Optional[Any]:
        """Return the LlamaIndex vector store instance."""
        return self.vector_store
