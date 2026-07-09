import { NavLink } from 'react-router-dom'
import { FileText, MessageSquare, Activity, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'

interface SidebarProps {
  isOpen: boolean
}

const navItems = [
  { to: '/', icon: FileText, label: 'Documents' },
  { to: '/chat', icon: MessageSquare, label: 'Chat Studio' },
  { to: '/health', icon: Activity, label: 'System Health' },
]

export default function Sidebar({ isOpen }: SidebarProps) {
  return (
    <aside
      className={clsx(
        'bg-slate-900 text-white flex flex-col transition-all duration-300 border-r border-slate-800',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <div>
              <h1 className="font-semibold text-sm">RAG Studio</h1>
              <p className="text-xs text-slate-400">Multimodal AI</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      
      {/* Footer */}
      {isOpen && (
        <div className="p-4 border-t border-slate-800">
          <div className="bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 rounded-lg p-3">
            <p className="text-xs text-slate-300 font-medium">Gemini 2.5 Flash</p>
            <p className="text-xs text-slate-400 mt-1">Voyage AI Embeddings</p>
          </div>
        </div>
      )}
    </aside>
  )
}