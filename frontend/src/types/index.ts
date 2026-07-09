export interface Document {
  id: string
  filename: string
  page_count: number
  status: 'pending' | 'rendering' | 'embedding' | 'indexed' | 'failed'
  created_at: string
  updated_at: string
  pages?: PageImage[]
  file_path?: string
}

export interface PageImage {
  id: string
  page_number: number
  image_path: string
  render_dpi: number
  file_size_kb: number
}

export interface ChatSession {
  id: string
  document_id: string | null
  title: string
  message_count: number
  created_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Citation[]
  model: string | null
  latency_ms: number | null
  created_at: string
}

export interface Citation {
  page_number: number
  image_path: string
  score: number
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  checks: {
    postgresql: string
    lancedb: string
    redis: string
    voyage_api: string
    gemini_api: string
  }
  timestamp: string
}

export interface SSEChunk {
  text: string
}

export interface SSEMetadata {
  total_token_count: number
  prompt_tokens: number
  candidates_tokens: number
  latency_ms: number
  message_id: string
}