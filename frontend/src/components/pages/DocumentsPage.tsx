import { useState, useEffect, useCallback } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import { useToast } from "@/context/ToastContext";
import { CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, formatRelative, cn } from "@/lib/utils";
import {
  Upload, FileText, Trash2, Eye, X, ChevronLeft, Loader2,
  AlertTriangle, CheckCircle2, Clock, Image as ImageIcon
} from "lucide-react";
import type { Document } from "@/types";

const statusConfig = {
  pending: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  rendering: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-50" },
  embedding: { icon: Loader2, color: "text-purple-500", bg: "bg-purple-50" },
  indexed: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
  failed: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
};

function getImageUrl(path: string) {
  return path.replace("/app/data", CONFIG.STATIC_BASE);
}

export function DocumentsPage() {
  const { docs, loading, detail, detailLoading, upload, remove, getDetail, pollStatus, refresh } = useDocuments();
  const { toast } = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast("File must be a PDF", "error");
      return;
    }
    setUploading(true);
    try {
      await upload(file);
      toast("Document uploaded successfully", "success");
    } catch (e: any) {
      toast(e.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
  };

  useEffect(() => {
    const pending = docs.filter((d) => d.status !== "indexed" && d.status !== "failed");
    if (!pending.length) return;
    const iv = setInterval(() => {
      pending.forEach((d) => pollStatus(d.id));
    }, 3000);
    return () => clearInterval(iv);
  }, [docs, pollStatus]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    await getDetail(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-4 md:p-8">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 md:p-10 text-center transition-all cursor-pointer",
            dragOver ? "border-primary-500 bg-primary-50" : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
          )}
        >
          <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Upload PDF Document</h3>
          <p className="text-xs text-slate-500 mb-4">Drag & drop or click to browse. Max 50MB.</p>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            className="hidden"
            id="pdf-upload"
          />
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <span className="inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-primary-600 text-white hover:bg-primary-700 shadow-sm h-10 px-4 text-sm">
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Select PDF
            </span>
          </label>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-sm font-semibold text-slate-900">All Documents</h2>
          <Button variant="ghost" size="sm" onClick={refresh}>
            Refresh
          </Button>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 md:px-6 py-4 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <Skeleton className="w-32 md:w-48 h-4" />
                  <Skeleton className="w-20 md:w-24 h-3" />
                </div>
              </div>
            ))
          ) : docs.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 text-sm">No documents yet. Upload your first PDF above.</div>
          ) : (
            docs.map((doc) => {
              const StatusIcon = statusConfig[doc.status].icon;
              return (
                <div key={doc.id} className="px-4 md:px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", statusConfig[doc.status].bg)}>
                    <StatusIcon className={cn("w-5 h-5", statusConfig[doc.status].color, doc.status === "rendering" || doc.status === "embedding" ? "animate-spin" : "")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-900 truncate">{doc.filename}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-500">{doc.page_count} pages</span>
                      <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                      <span className="text-xs text-slate-500 hidden sm:inline">{formatRelative(doc.created_at)}</span>
                    </div>
                  </div>
                  <Badge variant={doc.status}>{doc.status}</Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(doc.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(doc.id).then(() => toast("Deleted", "info"))}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1 sm:hidden">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(doc.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(doc.id).then(() => toast("Deleted", "info"))}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {selectedId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-8 animate-fade-in">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="shrink-0">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="min-w-0">
                  <h2 className="text-base md:text-lg font-semibold text-slate-900 truncate">{detail?.filename}</h2>
                  <p className="text-xs text-slate-500">{detail?.page_count} pages • {detail && formatDate(detail.created_at)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="shrink-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 md:p-6">
              {detailLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                  ))}
                </div>
              ) : detail?.pages.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No pages rendered yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {detail?.pages.map((page) => (
                    <div key={page.id} className="group relative bg-slate-50 rounded-lg border border-slate-200 overflow-hidden hover:border-primary-300 transition-colors">
                      <img
                        src={getImageUrl(page.image_path)}
                        alt={`Page ${page.page_number}`}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <div className="flex items-center justify-between text-white">
                          <span className="text-xs font-medium flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Page {page.page_number}
                          </span>
                          <span className="text-[10px] opacity-80">{page.file_size_kb} KB</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}