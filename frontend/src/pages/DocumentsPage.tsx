import { useEffect, useState } from 'react'
import { Upload, Search, Filter, RefreshCw } from 'lucide-react'
import { api } from '../api/client'
import { useStore } from '../store/useStore'
import DocumentsList from '../components/documents/DocumentsList'
import UploadModal from '../components/documents/UploadModal'
import { toast } from 'sonner'

export default function DocumentsPage() {
  const { documents, setDocuments } = useStore()
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const data = await api.listDocuments(0, 100)
      setDocuments(data.items)
    } catch (error) {
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchDocuments()
    const interval = setInterval(fetchDocuments, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])
  
  const filtered = documents.filter(d =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Knowledge Base</h1>
        <p className="text-slate-500 mt-2">
          Upload and manage PDF documents for multimodal RAG processing
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Documents" value={documents.length} accent="slate" />
        <StatCard 
          label="Indexed & Ready" 
          value={documents.filter(d => d.status === 'indexed').length} 
          accent="emerald"
        />
        <StatCard 
          label="Processing" 
          value={documents.filter(d => ['pending', 'rendering', 'embedding'].includes(d.status)).length} 
          accent="amber"
        />
        <StatCard 
          label="Total Pages" 
          value={documents.reduce((sum, d) => sum + d.page_count, 0)} 
          accent="indigo"
        />
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={fetchDocuments} className="btn-secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button onClick={() => setIsUploadOpen(true)} className="btn-primary">
            <Upload className="w-4 h-4 mr-2" />
            Upload PDF
          </button>
        </div>
      </div>
      
      {/* Documents List */}
      <DocumentsList documents={filtered} loading={loading} onRefresh={fetchDocuments} />
      
      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={fetchDocuments}
      />
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  const accentMap: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-700',
    indigo: 'from-indigo-500 to-indigo-700',
  }
  
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentMap[accent]} opacity-20`}></div>
      </div>
    </div>
  )
}