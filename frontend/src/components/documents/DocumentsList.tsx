import type { Document } from '../../types'
import DocumentCard from './DocumentCard'
import { FileText, Loader2 } from 'lucide-react'

interface Props {
  documents: Document[]
  loading: boolean
  onRefresh: () => void
}

export default function DocumentsList({ documents, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    )
  }
  
  if (documents.length === 0) {
    return (
      <div className="card p-16 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No documents yet</h3>
        <p className="text-slate-500 mt-1">Upload your first PDF to get started with RAG</p>
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} onRefresh={onRefresh} />
      ))}
    </div>
  )
}