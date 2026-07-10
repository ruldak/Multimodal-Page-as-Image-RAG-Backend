import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { ChatSession, ChatSessionDetail, Message, Source } from "@/types";

interface StreamState {
  isStreaming: boolean;
  text: string;
  sources: Source[];
  metadata: { total_token_count?: number; latency_ms?: number; message_id?: string } | null;
}

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<StreamState>({ isStreaming: false, text: "", sources: [], metadata: null });
  const abortRef = useRef<AbortController | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.chat.list();
      setSessions(res.items);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const createSession = async (documentId?: string | null, title?: string) => {
    const s = await api.chat.create({ document_id: documentId || null, title });
    await fetchSessions();
    return s;
  };

  const updateTitle = async (id: string, title: string) => {
    const updated = await api.chat.updateTitle(id, title);
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: updated.title } : s)));
    if (activeSession?.id === id) {
      setActiveSession((prev) => (prev ? { ...prev, title: updated.title } : prev));
    }
    return updated;
  };

  const loadSession = async (id: string) => {
    setLoading(true);
    try {
      const s = await api.chat.get(id);
      setActiveSession(s);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id: string) => {
    await api.chat.delete(id);
    await fetchSessions();
    if (activeSession?.id === id) setActiveSession(null);
  };

  const sendMessage = async (sessionId: string, message: string) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setStream({ isStreaming: true, text: "", sources: [], metadata: null });

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      sources: [],
      model: null,
      latency_ms: null,
      created_at: new Date().toISOString(),
    };

    setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev);

    try {
      const res = await api.chat.send(sessionId, message);
      if (!res.ok) throw new Error("Failed to send");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const raw of events) {
          if (!raw.trim()) continue;
          const lines = raw.split("\n");
          let eventType = "message";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event:")) eventType = line.substring(6).trim();
            else if (line.startsWith("data:")) dataStr += line.substring(5).trim();
          }
          if (!dataStr) continue;

          if (eventType === "done" || dataStr === "[DONE]") {
            setStream((prev) => ({ ...prev, isStreaming: false }));
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === "citations") {
              setStream((prev) => ({ ...prev, sources: parsed }));
            } else if (eventType === "chunk") {
              setStream((prev) => ({ ...prev, text: prev.text + (parsed.text || "") }));
            } else if (eventType === "metadata") {
              setStream((prev) => ({ ...prev, metadata: parsed, isStreaming: false }));
            } else if (eventType === "error") {
              throw new Error(parsed.detail || "Stream error");
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e) {
      setStream((prev) => ({ ...prev, isStreaming: false }));
      throw e;
    }
  };

  useEffect(() => {
    if (!stream.isStreaming && stream.text && activeSession) {
      const assistantMsg: Message = {
        id: stream.metadata?.message_id || crypto.randomUUID(),
        role: "assistant",
        content: stream.text,
        sources: stream.sources,
        model: "gemini-2.5-flash",
        latency_ms: stream.metadata?.latency_ms || null,
        created_at: new Date().toISOString(),
      };
      setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : prev);
      setStream({ isStreaming: false, text: "", sources: [], metadata: null });
    }
  }, [stream.isStreaming, stream.text]);

  return {
    sessions,
    activeSession,
    loading,
    stream,
    createSession,
    loadSession,
    deleteSession,
    sendMessage,
    updateTitle,
    refresh: fetchSessions,
  };
}