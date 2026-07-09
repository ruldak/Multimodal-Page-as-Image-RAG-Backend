import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../../api/client'
import { toast } from 'sonner'
import { clsx } from 'clsx'

interface Props {
  isOpen: boolean
  onClose: () => void
  onUploaded: () => void
}

export default function UploadModal({ isOpen, onClose, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string>('')
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    
    if (file.size > 52428800) {
      toast.error('File size exceeds 50MB limit')
      return
    }
    
    try {
      setUploading(true)
      setProgress('Uploading file...')
      const result = await api.uploadDocument(file)
      
      setProgress('Queued for processing...')
      toast.success(`${file.name} uploaded successfully!`)
      onUploaded()
      
      setTimeout(onClose, 1500)
    } catch (error: any) {
      toast.error(error.message || 'Upload failed')
      setUploading(false)
    }
  }, [onUploaded, onClose])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  })
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Upload Document</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
              isDragActive
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50',
              uploading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} />
            
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 text-brand-600 mx-auto animate-spin" />
                <p className="text-sm font-medium text-slate-700 mt-4">{progress}</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7 text-brand-600" />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your PDF here'}
                </p>
                <p className="text-xs text-slate-500 mb-4">or click to browse files</p>
                <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="w-4 h-4" />
                  <span>PDF only · Max 50MB</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}