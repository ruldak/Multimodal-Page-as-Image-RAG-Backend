import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { api } from '../api/client'
import { useStore } from '../store/useStore'
import ChatSessions from '../components/chat/ChatSessions'
import ChatWindow from '../components/chat/ChatWindow'
import { toast } from 'sonner'

export default function ChatPage() {
  const { documents, sessions, setSessions, activeSessionId, setActiveSessionId } = useStore()
  const [showNewChat, setShowNewChat] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  const fetchSessions = async () => {
    try {
      const data = await api.listSessions()
      setSessions(data.items)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchDocuments = async () => {
    try {
      const data = await api.listDocuments(0, 100)
      useStore.setState({ documents: data.items })
    } catch (error) {
      console.error(error)
    }
  }
  
  useEffect(() => {
    fetchSessions()
    fetchDocuments()
  }, [])
  
  const handleCreateChat = async () => {
    try {
      const doc = selectedDocId ? selectedDocId : null
      if (doc) {
        const document = documents.find(d => d.id === doc)
        if (document && document.status !== 'indexed') {
          toast.error('Document is not yet indexeded. Please wait.')
          return
        }
      }
      
      const session = await api.createSession(doc)
      setSessions([session, ...sessions])
      setActiveSessionId(session.id)
      setShowNewChat(false)
      toast.success('Chat session created')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create session')
    }
  }
  
  const indexedDocs = documents.filter(d => d.status === 'indexed')
  const activeSession = sessions.find(s => s.id === activeSessionId)
  
  return (
    <div className="flex h-full min-h-0">
      {/* Sessions List */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setShowNewChat(true)}
            className="btn-primary w-full mb-3"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </button>
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chats..."
              className="input-field pl-10 text-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <ChatSessions
            sessions={sessions}
            documents={documents}
            activeId={activeSessionId}
            onSelect={setActiveSessionId}
            onDelete={(id) => {
              api.deleteSession(id).then(() => {
                setSessions(sessions.filter(s => s.id !== id))
                if (activeSessionId === id) setActiveSessionId(null)
                toast.success('Session deleted')
              })
            }}
          />
        </div>
      </div>
      
      {/* Chat Window */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
        {activeSessionId && activeSession ? (
          <ChatWindow
            session={activeSession}
            onSessionUpdated={(updated) => {
              setSessions(sessions.map(s => s.id === updated.id ? updated : s))
            }}
          />
        ) : (
          <EmptyState onNewChat={() => setShowNewChat(true)} />
        )}
      </div>
      
      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Create New Chat</h2>
              <p className="text-sm text-slate-500 mb-6">Choose a document for RAG mode or continue with general chat</p>
              
              <label className="block mb-4">
                <span className="text-sm font-medium text-slate-700 mb-2 block">Document (Optional)</span>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="input-field"
                >
                  <option value="">General Chat (No RAG)</option>
                  {indexedDocs.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.filename}</option>
                  ))}
                </select>
              </label>
              
              <div className="flex gap-2">
                <button onClick={() => setShowNewChat(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={handleCreateChat} className="btn-primary flex-1">
                  Create Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to RAG Studio</h2>
        <p className="text-slate-500 mb-6">
          Start a new conversation with your documents. Our AI can analyze charts, tables, and text across your PDF pages.
        </p>
        <button onClick={onNewChat} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Start New Chat
        </button>
      </div>
    </div>
  )
}