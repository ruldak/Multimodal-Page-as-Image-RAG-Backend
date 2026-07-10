import { CONFIG } from "./config";
import type {
  Document, DocumentDetail, DocumentStatus, PaginatedResponse,
  ChatSession, ChatSessionDetail, HealthCheck,
} from "@/types";

const API_BASE = CONFIG.API_BASE;

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  documents: {
    list: (skip = 0, limit = 20) =>
      fetchApi<PaginatedResponse<Document>>(`/documents?skip=${skip}&limit=${limit}`),
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return fetchApi<{ document_id: string; task_id: string; status: string; message: string }>(
        "/documents/upload",
        { method: "POST", body: form }
      );
    },
    get: (id: string) => fetchApi<DocumentDetail>(`/documents/${id}`),
    status: (id: string) => fetchApi<DocumentStatus>(`/documents/${id}/status`),
    delete: (id: string) => fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" }),
  },
  chat: {
    list: () => fetchApi<{ items: ChatSession[] }>("/chat/sessions"),
    create: (body: { document_id?: string | null; title?: string }) =>
      fetchApi<ChatSession>("/chat/sessions", { method: "POST", body: JSON.stringify(body) }),
    get: (id: string) => fetchApi<ChatSessionDetail>(`/chat/sessions/${id}`),
    updateTitle: (id: string, title: string) => fetchApi<ChatSession>(`/chat/sessions/${id}?title=${encodeURIComponent(title)}`, { method: "PATCH" }),
    delete: (id: string) => fetch(`${API_BASE}/chat/sessions/${id}`, { method: "DELETE" }),
    send: (sessionId: string, message: string) =>
      fetch(`${API_BASE}/chat/sessions/${sessionId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }),
  },
  health: () => fetchApi<HealthCheck>("/health"),
};