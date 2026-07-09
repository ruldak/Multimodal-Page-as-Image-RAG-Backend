import { useState } from 'react'
import { FileText, Trash2, MoreVertical, CheckCircle2, Clock, Loader2, AlertCircle, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Document } from '../../types'
import { api } from '../../api/client'
import { toast } from 'sonner'
import { clsx } from 'clsx'

interface Props {
  document: Document
  onRefresh: () => void
}

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: 'Queued', className: 'badge-neutral', icon: Clock },
  rendering: { label: 'Rendering Pages', className: 'badge-warning', icon: Loader2 },
  embedding: { label: 'Generating Embeddings', className: 'badge-info', icon: Zap },
  indexed: { label: 'Ready', className: 'badge-success', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'badge-error', icon: AlertCircle },
}

export default function DocumentCard({ document, onRefresh }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const config = statusConfig[document.status] || statusConfig.pending
  const StatusIcon = config.icon
  
  const handleDelete = async () => {
    if (!confirm(`Delete "${document.filename}"? This action cannot be undone.`)) return
    
    try {
      setDeleting(true)
      await api.deleteDocument(document.id)
      toast.success('Document deleted')
      onRefresh()
    } catch (error) {
      toast.error('Failed to delete document')
    } finally {
      setDeleting(false)
      setMenuOpen(false)
    }
  }
  
  return (
    <div className="card group">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900 truncate" title={document.filename}>
                {document.filename}
              </h3>
              <p className="text-xs text-slate-500">
                {document.page_count} page{document.page_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 hover:bg-slate-100 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4 text-slate-500" />
            </button>
            
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}></div>
                <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className={clsx('badge', config.className)}>
            <StatusIcon className={clsx('w-3 h-3 mr-1', document.status === 'rendering' || document.status === 'embedding' ? 'animate-spin' : '')} />
            {config.label}
          </span>
          
          <span className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
          </span>
        </div>
        
        {/* Progress bar for processing states */}
        {['rendering', 'embedding'].includes(document.status) && (
          <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse w-2/3"></div>
          </div>
        )}
      </div>
    </div>
  )
}