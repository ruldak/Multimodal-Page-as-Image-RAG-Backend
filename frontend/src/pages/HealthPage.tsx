import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, RefreshCw, Activity } from 'lucide-react'
import { api } from '../api/client'
import type { HealthStatus } from '../types'
import { toast } from 'sonner'
import { clsx } from 'clsx'

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  
  const fetchHealth = async () => {
    try {
      setLoading(true)
      const data = await api.getHealth()
      setHealth(data)
    } catch (error) {
      toast.error('Failed to fetch health status')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 10000)
    return () => clearInterval(interval)
  }, [])
  
  const checks = health
    ? [
        { name: 'PostgreSQL', status: health.checks.postgresql, desc: 'Primary database' },
        { name: 'Redis', status: health.checks.redis, desc: 'Cache & message broker' },
        { name: 'LanceDB', status: health.checks.lancedb, desc: 'Vector database' },
        { name: 'Voyage AI API', status: health.checks.voyage_api, desc: 'Embedding model' },
        { name: 'Gemini API', status: health.checks.gemini_api, desc: 'LLM provider' },
      ]
    : []
  
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Health</h1>
          <p className="text-slate-500 mt-2">Monitor infrastructure components and API status</p>
        </div>
        <button onClick={fetchHealth} className="btn-secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>
      
      {/* Overall Status */}
      {health && (
        <div className={clsx(
          'card p-6 mb-6',
          health.status === 'healthy' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        )}>
          <div className="flex items-center gap-4">
            <div className={clsx(
              'w-14 h-14 rounded-full flex items-center justify-center',
              health.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'
            )}>
              {health.status === 'healthy' ? (
                <CheckCircle2 className="w-8 h-8 text-white" />
              ) : (
                <XCircle className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {health.status === 'healthy' ? 'All Systems Operational' : 'Service Degradation Detected'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Last checked: {new Date(health.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Individual Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {checks.map((check) => (
          <div key={check.name} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  check.status === 'ok' ? 'bg-emerald-100' : 'bg-red-100'
                )}>
                  <Activity className={clsx(
                    'w-5 h-5',
                    check.status === 'ok' ? 'text-emerald-600' : 'text-red-600'
                  )} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{check.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{check.desc}</p>
                </div>
              </div>
              {check.status === 'ok' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className={clsx(
                'badge',
                check.status === 'ok' ? 'badge-success' : 'badge-error'
              )}>
                {check.status === 'ok' ? 'Operational' : 'Degraded'}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {loading && !health && (
        <div className="text-center py-20 text-slate-500">Loading health status...</div>
      )}
    </div>
  )
}