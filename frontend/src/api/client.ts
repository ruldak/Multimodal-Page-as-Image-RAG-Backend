import type { Document, ChatSession, Message, HealthStatus, Citation, SSEMetadata, SSEChunk } from '../types'

const API_BASE = '/api/v1'

export const api = {
  // Documents
  async uploadDocument(file: File): Promise<{ document_id: string; task_id: string; status: string }> {
    const formData = new FormData()
    formData.append('file', file)
    
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    })
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(err.detail || 'Failed to upload document')
    }
    
    return res.json()
  },
  
  async listDocuments(skip = 0, limit = 50): Promise<{ items: Document[]; total: number }> {
    const res = await fetch(`${API_BASE}/documents?skip=${skip}&limit=${limit}`)
    if (!res.ok) throw new Error('Failed to fetch documents')
    return res.json()
  },
  
  async getDocument(id: string): Promise<Document> {
    const res = await fetch(`${API_BASE}/documents/${id}`)
    if (!res.ok) throw new Error('Document not found')
    return res.json()
  },
  
  async getDocumentStatus(id: string) {
    const res = await fetch(`${API_BASE}/documents/${id}/status`)
    if (!res.ok) throw new Error('Failed to get status')
    return res.json()
  },
  
  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete document')
  },
  
  // Chat Sessions
  async createSession(documentId: string | null, title?: string): Promise<ChatSession> {
    const res = await fetch(`${API_BASE}/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: documentId, title }),
    })
    if (!res.ok) throw new Error('Failed to create session')
    return res.json()
  },
  
  async listSessions(): Promise<{ items: ChatSession[] }> {
    const res = await fetch(`${API_BASE}/chat/sessions`)
    if (!res.ok) throw new Error('Failed to list sessions')
    return res.json()
  },
  
  async getSession(id: string): Promise<{ id: string; messages: Message[] } & ChatSession> {
    const res = await fetch(`${API_BASE}/chat/sessions/${id}`)
    if (!res.ok) throw new Error('Session not found')
    console.log(res.body)
    return res.json()
  },
  
  async deleteSession(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/sessions/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete session')
  },
  
  // SSE Stream
  async sendMessageStream(
    sessionId: string,
    message: string,
    onCitations: (citations: Citation[]) => void,
    onChunk: (chunk: SSEChunk) => void,
    onMetadata: (metadata: SSEMetadata) => void,
    onError: (error: string) => void,
    onDone: () => void,
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to send message' }))
      throw new Error(err.detail || err.error || 'Request failed')
    }
    
    if (!res.body) throw new Error('No response body')
    
    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''
      
      for (const rawEvent of events) {
        if (!rawEvent.trim()) continue
        
        const lines = rawEvent.split('\n')
        let eventType = 'message'
        let dataStr = ''
        
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim()
          } else if (line.startsWith('data:')) {
            dataStr += line.substring(5).trim()
          }
        }
        
        if (!dataStr) continue
        
        try {
          if (eventType === 'done' || dataStr === '[DONE]') {
            onDone()
            return
          }
          
          const parsed = JSON.parse(dataStr)
          
          switch (eventType) {
            case 'citations':
              onCitations(parsed)
              break
            case 'chunk':
              onChunk(parsed)
              break
            case 'metadata':
              onMetadata(parsed)
              break
            case 'error':
              onError(parsed.detail || 'Unknown error')
              break
          }
        } catch (e) {
          console.error('Parse error:', e, rawEvent)
        }
      }
    }
  },
  
  // Health
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/health`)
    return res.json()
  },
}

// Helper: convert /app/data/... to /data/...
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return ''
  return imagePath.replace('/app/', '/')
}