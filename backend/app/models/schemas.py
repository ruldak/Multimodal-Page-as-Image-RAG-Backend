from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

# --- Document Schemas ---

class DocumentUploadResponse(BaseModel):
    document_id: UUID
    task_id: Optional[str] = None
    status: str
    message: str

class DocumentPageOut(BaseModel):
    id: UUID
    page_number: int
    image_path: str
    render_dpi: int
    file_size_kb: Optional[int] = None

    class Config:
        from_attributes = True

class DocumentOut(BaseModel):
    id: UUID
    filename: str
    file_path: str
    page_count: Optional[int] = None
    status: str
    pages: List[DocumentPageOut] = []
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentListItem(BaseModel):
    id: UUID
    filename: str
    page_count: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    items: List[DocumentListItem]
    total: int
    page: int
    page_size: int

class DocumentStatusResponse(BaseModel):
    document_id: UUID
    status: str
    task: Optional[Dict[str, Any]] = None
    created_at: datetime

# --- Chat Schemas ---

class ChatSessionCreate(BaseModel):
    document_id: Optional[UUID] = None
    title: Optional[str] = None

class ChatSessionOut(BaseModel):
    id: UUID
    document_id: Optional[UUID] = None
    title: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionListItem(BaseModel):
    id: UUID
    document_id: Optional[UUID] = None
    title: Optional[str] = None
    message_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionListResponse(BaseModel):
    items: List[ChatSessionListItem]

class ChatMessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    sources: List[Dict[str, Any]] = []
    model: Optional[str] = None
    latency_ms: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionDetail(BaseModel):
    id: UUID
    document_id: Optional[UUID] = None
    title: Optional[str] = None
    messages: List[ChatMessageOut] = []

    class Config:
        from_attributes = True

class ChatSendRequest(BaseModel):
    message: str

class CitationOut(BaseModel):
    page_number: int
    image_path: str
    score: float

class ChatSendResponse(BaseModel):
    message: ChatMessageOut
    session_id: UUID
    citations: List[CitationOut]

# --- Health Schemas ---

class HealthCheckResponse(BaseModel):
    status: str
    checks: Dict[str, str]
    timestamp: datetime
