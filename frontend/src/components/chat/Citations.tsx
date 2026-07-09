import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import type { Citation } from '../../types'
import { getImageUrl } from '../../api/client'

interface Props {
  citations: Citation[]
}

export default function Citations({ citations }: Props) {
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
  if (citations.length === 0) return null
  
  return (
    <>
      <div className="mb-2 flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1">
          <BookOpen className="w-3 h-3" />
          <span>{citations.length} source{citations.length > 1 ? 's' : ''}</span>
        </div>
        
        {citations.map((cite, i) => (
          <button
            key={i}
            onClick={() => setPreviewImage(getImageUrl(cite.image_path))}
            className="group flex items-center gap-2 bg-white border border-slate-200 hover:border-brand-500 hover:shadow-md rounded-lg p-1.5 pr-3 transition-all"
          >
            <div className="w-8 h-10 bg-slate-100 rounded overflow-hidden flex items-center justify-center relative">
              <img
                src={getImageUrl(cite.image_path)}
                alt={`Page ${cite.page_number}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-600">
                {cite.page_number}
              </span>
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-slate-900">Page {cite.page_number}</p>
              <p className="text-xs text-slate-500">
                {(cite.score * 100).toFixed(0)}% match
              </p>
            </div>
          </button>
        ))}
      </div>
      
      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-100 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Page preview"
              className="max-h-[90vh] w-auto"
            />
          </div>
        </div>
      )}
    </>
  )
}