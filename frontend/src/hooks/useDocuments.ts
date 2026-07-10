import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Document, DocumentDetail, DocumentStatus } from "@/types";

export function useDocuments() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.documents.list();
      setDocs(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const upload = async (file: File) => {
    const res = await api.documents.upload(file);
    await fetchDocs();
    return res;
  };

  const remove = async (id: string) => {
    await api.documents.delete(id);
    await fetchDocs();
    if (detail?.id === id) setDetail(null);
  };

  const getDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await api.documents.get(id);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  };

  const pollStatus = useCallback(async (id: string) => {
    const s = await api.documents.status(id);
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, status: s.status as Document["status"] } : d)));
    if (detail?.id === id) {
      setDetail((prev) => (prev ? { ...prev, status: s.status as Document["status"] } : prev));
    }
    return s;
  }, [detail?.id]);

  return { docs, loading, detail, detailLoading, upload, remove, getDetail, pollStatus, refresh: fetchDocs };
}