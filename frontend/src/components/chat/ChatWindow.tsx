import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'
import type { ChatSession, Message, Citation } from '../../types'
import { api, getImageUrl } from '../../api/client'
import MessageBubble from './MessageBubble'
import Citations from './Citations'
import { toast } from 'sonner'

interface Props {
  session: ChatSession
  onSessionUpdated: (session: ChatSession) => void
}

interface StreamState {
  isStreaming: boolean
  currentContent: string
  citations: Citation[]
  currentRole: 'assistant' | null
}

export default function ChatWindow({ session, onSessionUpdated }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [stream, setStream] = useState<StreamState>({
    isStreaming: false,
    currentContent: '',
    citations: [],
    currentRole: null,
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  useEffect(() => {
    loadSession()
  }, [session.id])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, stream.currentContent])
  
  const loadSession = async () => {
    try {
      setLoading(true)
      const data = await api.getSession(session.id)
      setMessages(data.messages)
    } catch (error) {
      toast.error('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSend = async () => {
    if (!input.trim() || stream.isStreaming) return
    
    const userMessage = input.trim()
    setInput('')
    
    // Add user message locally
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      sources: [],
      model: null,
      latency_ms: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    
    // Start streaming
    setStream({
      isStreaming: true,
      currentContent: '',
      citations: [],
      currentRole: 'assistant',
    })
    
    try {
      await api.sendMessageStream(
        session.id,
        userMessage,
        (citations) => {
          setStream((prev) => ({ ...prev, citations }))
        },
        (chunk) => {
          setStream((prev) => ({
            ...prev,
            currentContent: prev.currentContent + chunk.text,
          }))
        },
        (metadata) => {
          // Stream complete - add assistant message
          setStream((prev) => {
            const assistantMsg: Message = {
              id: metadata.message_id,
              role: 'assistant',
              content: prev.currentContent,
              sources: prev.citations,
              model: 'gemini-2.5-flash',
              latency_ms: metadata.latency_ms,
              created_at: new Date().toISOString(),
            }
            setMessages((msgs) => [...msgs, assistantMsg])
            onSessionUpdated({
              ...session,
              message_count: session.message_count + 2,
            })
            return {
              isStreaming: false,
              currentContent: '',
              citations: [],
              currentRole: null,
            }
          })
        },
        (error) => {
          toast.error(`Stream error: ${error}`)
          setStream((prev) => ({ ...prev, isStreaming: false }))
        },
        () => {
          // Done event
        }
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message')
      setStream({
        isStreaming: false,
        currentContent: '',
        citations: [],
        currentRole: null,
      })
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{session.title}</h2>
            <p className="text-xs text-slate-500">
              {session.document_id ? 'RAG Mode · Powered by Gemini 2.5 Flash' : 'General Chat'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages - INI YANG PENTING! */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : messages.length === 0 && !stream.isStreaming ? (
          <WelcomePrompt onSend={(msg) => { setInput(msg); setTimeout(handleSend, 100) }} />
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            
            {/* Streaming message */}
            {stream.isStreaming && stream.currentRole === 'assistant' && (
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex-shrink-0 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  {stream.citations.length > 0 && (
                    <Citations citations={stream.citations} />
                  )}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="prose prose-sm max-w-none text-slate-800">
                      {stream.currentContent}
                      <span className="typing-cursor"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your documents..."
              rows={1}
              disabled={stream.isStreaming}
              className="w-full bg-transparent px-3 py-2 resize-none focus:outline-none text-sm placeholder:text-slate-400 disabled:opacity-50"
              style={{ minHeight: '40px', maxHeight: '200px' }}
            />
            <div className="flex items-center justify-between px-2 pt-1">
              <div className="text-xs text-slate-400">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs">Enter</kbd>
                <span className="ml-1">to send</span>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || stream.isStreaming}
                className="w-8 h-8 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg flex items-center justify-center transition-colors"
              >
                {stream.isStreaming ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WelcomePrompt({ onSend }: { onSend: (msg: string) => void }) {
  const suggestions = [
    'Summarize the key insights from this document',
    'What are the main financial metrics shown in the charts?',
    'Extract all tables and their data from the document',
    'Compare the performance across different quarters',
  ]
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">How can I help you today?</h2>
        <p className="text-slate-500">Ask questions about your document's content, charts, or tables.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSend(suggestion)}
            className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-500 hover:shadow-md transition-all group"
          >
            <p className="text-sm font-medium text-slate-900 group-hover:text-brand-700">
              {suggestion}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}