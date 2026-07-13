import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useDocuments } from "@/hooks/useDocuments";
import { useToast } from "@/context/ToastContext";
import { CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRelative, cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MessageSquare, Plus, Trash2, Send, Bot, User, Loader2,
  FileText, ChevronRight, Sparkles, PanelLeftClose, Pencil, PanelLeft, Check, X
} from "lucide-react";

function getImageUrl(path: string) {
  return path.replace("/app/data", CONFIG.STATIC_BASE);
}

export function ChatPage() {
  const {
    sessions, activeSession, loading, stream,
    createSession, loadSession, deleteSession, sendMessage, updateTitle,
  } = useChat();
  const { docs } = useDocuments();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [showSessionList, setShowSessionList] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, stream.text]);

  const handleCreate = async () => {
    try {
      const s = await createSession(selectedDoc, sessionTitle || undefined);
      setShowNewChat(false);
      setSelectedDoc(null);
      setSessionTitle("");
      await loadSession(s.id);
      toast("Chat session created", "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSession) return;
    const msg = input.trim();
    setInput("");
    try {
      await sendMessage(activeSession.id, msg);
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const saveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await updateTitle(id, editTitle.trim());
      setEditingId(null);
      toast("Title updated", "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  return (
    // KUNCI 1: Mobile menggunakan 6rem (Navbar + padding kecil), Desktop 8rem. 
    // overflow-x-hidden & max-w-full MENCEGAH layar HP bisa di-zoom out / geser kanan-kiri.
    <div className="flex flex-col lg:flex-row h-[100vh-6rem] lg:h-[calc(100vh-8rem)] gap-4 lg:gap-6 animate-fade-in overflow-x-hidden max-w-full">
      
      {/* Session List */}
      <Card className={cn(
        "flex flex-col overflow-hidden transition-all duration-300 ease-in-out shrink-0",
        showSessionList ? "lg:w-72 w-full max-h-[40vh] lg:max-h-none lg:h-auto" : "lg:w-0 w-full h-0 lg:h-auto overflow-hidden opacity-0 lg:opacity-100"
      )}>
        <div className="p-3 lg:p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <Button className="w-full" size="sm" onClick={() => setShowNewChat(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
          <button
            className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            onClick={() => setShowSessionList(false)}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {sessions.length === 0 && !loading && (
            <div className="text-center py-8 text-slate-400 text-xs">No chat sessions yet</div>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                "group relative w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3",
                activeSession?.id === s.id ? "bg-primary-50 text-primary-900 border border-primary-100" : "hover:bg-slate-50 text-slate-700"
              )}
            >
              <button
                onClick={() => { loadSession(s.id); setShowSessionList(false); }}
                className="flex items-start gap-3 flex-1 min-w-0 text-left"
              >
                <MessageSquare className={cn("w-4 h-4 mt-0.5 shrink-0", activeSession?.id === s.id ? "text-primary-600" : "text-slate-400")} />
                <div className="flex-1 min-w-0">
                  {editingId === s.id ? (
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.stopPropagation(); saveEdit(s.id); }
                        if (e.key === "Escape") { e.stopPropagation(); cancelEdit(); }
                      }}
                      className="w-full h-6 px-1.5 text-xs rounded border border-primary-300 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p className="font-medium truncate text-xs">{s.title}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatRelative(s.created_at)}</p>
                </div>
              </button>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingId === s.id ? (
                  <>
                    <button onClick={() => saveEdit(s.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(s)} className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteSession(s.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        {!activeSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
            <Sparkles className="w-12 h-12 mb-4 text-slate-300" />
            <p className="text-sm font-medium text-center">Select a chat session or create a new one</p>
          </div>
        ) : (
          <>
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowSessionList((p) => !p)}
                  className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                  title={showSessionList ? "Hide sessions" : "Show sessions"}
                >
                  {showSessionList ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                </button>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{activeSession.title}</h3>
                  {activeSession.document_id && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                      <FileText className="w-3 h-3" />
                      <span>RAG Mode Active</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50/30">
              {activeSession.messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-2 sm:gap-3 md:gap-4", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[80%] md:max-w-[70%]", msg.role === "user" && "flex-row-reverse")}>
                    <div className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      msg.role === "assistant" ? "bg-primary-100 text-primary-700" : "bg-slate-200 text-slate-600"
                    )}>
                      {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <User className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    </div>
                    <div className={cn("space-y-2 min-w-0 flex-1", msg.role === "user" && "flex flex-col items-end")}>
                      <div className={cn(
                        "px-3 md:px-4 py-2.5 md:py-3 rounded-2xl text-sm leading-relaxed shadow-sm break-words",
                        msg.role === "assistant"
                          ? "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                          : "bg-primary-600 text-white rounded-tr-none"
                      )}>
                        {msg.role === "assistant" ? (
                          // KUNCI 2: Wrapper overflow-x-auto mencegah tabel/code block AI menggeser layar HP (Zoom out issue solved)
                          <div className="w-full max-w-full overflow-x-auto">
                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:p-3 prose-pre:rounded-lg prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-pink-600 prose-code:before:content-none prose-code:after:content-none prose-table:block prose-table:overflow-x-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : (
                          <span>{msg.content}</span>
                        )}
                      </div>
                      {msg.sources.length > 0 && (
                        // KUNCI 3: flex-nowrap membuat gambar sumber berjejer ke samping (horizontal scroll) alih-alih menumpuk ke bawah
                        <div className="flex flex-nowrap gap-2 w-full max-w-full overflow-x-auto pb-2">
                          {msg.sources.map((src, idx) => (
                            <div key={idx} className="group relative shrink-0">
                              <div className="w-12 h-16 sm:w-14 sm:h-20 md:w-16 md:h-20 rounded-lg border border-slate-200 overflow-hidden bg-white hover:border-primary-300 transition-colors cursor-pointer">
                                <img
                                  src={getImageUrl(src.image_path)}
                                  alt={`Page ${src.page_number}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] py-0.5 text-center">
                                  p.{src.page_number}
                                </div>
                              </div>
                              <Badge variant="ok" className="absolute -top-2 -right-2 scale-75">
                                {(src.score * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.latency_ms && (
                        <p className="text-[10px] text-slate-400">{msg.latency_ms}ms • {msg.model}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {stream.isStreaming && (
                <div className="flex gap-2 sm:gap-3 md:gap-4 justify-start">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <div className="space-y-2 max-w-[85%] sm:max-w-[80%] md:max-w-[70%] min-w-0 flex-1">
                    <div className="px-3 md:px-4 py-2.5 md:py-3 rounded-2xl rounded-tl-none bg-white border border-slate-200 text-slate-800 text-sm shadow-sm break-words">
                      <div className="w-full max-w-full overflow-x-auto">
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:p-3 prose-pre:rounded-lg prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-pink-600 prose-code:before:content-none prose-code:after:content-none prose-table:block prose-table:overflow-x-auto">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {stream.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <span className="inline-block w-1.5 h-4 md:w-2 md:h-4 bg-primary-500 ml-1 animate-pulse align-middle" />
                    </div>
                    {stream.sources.length > 0 && (
                      <div className="flex flex-nowrap gap-2 w-full max-w-full overflow-x-auto pb-2">
                        {stream.sources.map((src, idx) => (
                          <div key={idx} className="w-12 h-16 sm:w-14 sm:h-20 md:w-16 md:h-20 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                            <img src={getImageUrl(src.image_path)} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 md:p-4 border-t border-slate-200 bg-white shrink-0">
              <div className="flex gap-2 md:gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Ask anything about the document..."
                  className="flex-1 min-w-0 h-10 md:h-11 px-3 md:px-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
                <Button onClick={handleSend} disabled={!input.trim() || stream.isStreaming} isLoading={stream.isStreaming}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <Card className="w-[calc(100vw-2rem)] max-w-md p-4 md:p-6 max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">New Chat Session</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Session Title</label>
                <input
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Q3 Financial Analysis"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Attach Document (optional)</label>
                <div className="space-y-2 max-h-[40vh] overflow-auto border border-slate-200 rounded-lg p-2">
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      selectedDoc === null ? "bg-primary-50 text-primary-700 font-medium" : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    General Chat (no document)
                  </button>
                  {docs.filter((d) => d.status === "indexed").map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                        selectedDoc === doc.id ? "bg-primary-50 text-primary-700 font-medium" : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{doc.filename}</span>
                      <ChevronRight className="w-3 h-3 ml-auto opacity-50 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowNewChat(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleCreate}>Create Session</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}