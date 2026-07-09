import { MessageSquare, Trash2, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ChatSession } from '../../types'
import { useStore } from '../../store/useStore'
import { clsx } from 'clsx'

interface Props {
  sessions: ChatSession[]
  documents: Document[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export default function ChatSessions({ sessions,  documents, activeId, onSelect, onDelete }: Props) {
  
  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center">
        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No conversations yet</p>
      </div>
    )
  }
  
  return (
    <div className="py-2">
      {sessions.map((session) => {
        const doc = session.document_id ? documents.find(d => d.id === session.document_id) : null
        const isActive = session.id === activeId
        
        return (
          <div
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={clsx(
              'group mx-2 mb-1 p-3 rounded-lg cursor-pointer transition-all',
              isActive
                ? 'bg-slate-900 text-white'
                : 'hover:bg-slate-100 text-slate-700'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{session.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {doc && (
                    <span className={clsx(
                      'inline-flex items-center gap-1 text-xs truncate',
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    )}>
                      <FileText className="w-3 h-3" />
                      {doc.filename}
                    </span>
                  )}
                  {!doc && (
                    <span className={clsx(
                      'text-xs',
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    )}>
                      General Chat
                    </span>
                  )}
                </div>
                <p className={clsx(
                  'text-xs mt-1',
                  isActive ? 'text-slate-400' : 'text-slate-400'
                )}>
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                </p>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Delete this conversation?')) onDelete(session.id)
                }}
                className={clsx(
                  'p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity',
                  isActive ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-400'
                )}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}