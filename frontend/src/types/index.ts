export interface Document {
  id: string;
  filename: string;
  page_count: number;
  status: "pending" | "rendering" | "embedding" | "indexed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface DocumentPage {
  id: string;
  page_number: number;
  image_path: string;
  render_dpi: number;
  file_size_kb: number;
}

export interface DocumentDetail extends Document {
  file_path: string;
  pages: DocumentPage[];
}

export interface DocumentStatus {
  document_id: string;
  status: string;
  task: {
    task_state: string;
    task_result?: { status: string; pages_processed: number };
  };
  created_at: string;
}

export interface ChatSession {
  id: string;
  document_id: string | null;
  title: string;
  message_count?: number;
  created_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: Message[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  model: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface Source {
  page_number: number;
  image_path: string;
  score: number;
}

export interface HealthCheck {
  status: "healthy" | "unhealthy";
  checks: Record<string, "ok" | "error">;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}